import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { addToSyncQueue, getSyncQueueCount, syncNow, setupOnlineSync } from '../utils/sync';
import { fetchParticipants, recordScan } from '../utils/api';

const MealContext = createContext(null);

const PARTICIPANTS_STORAGE_KEY = 'mealTracker_participants';
const HISTORY_KEY = 'mealTracker_history';
const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snacks'];

/** Returns the full history object from localStorage */
function getHistoryData() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
  } catch {
    return {};
  }
}

export function MealProvider({ children }) {
  const [participants, setParticipants] = useState({});
  const [currentMeal, setCurrentMeal] = useState('lunch');
  const [scanStatus, setScanStatus] = useState('idle'); // idle | success | already_taken | not_found | scanning
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [recentScans, setRecentScans] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mealTracker_recentScans') || '[]');
    } catch { return []; }
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);
  const [lastScanInfo, setLastScanInfo] = useState(null);
  const [currentView, setCurrentView] = useState('scanner'); // 'scanner' | 'dashboard'
  const [trackingDate, setTrackingDate] = useState(new Date().toISOString().split('T')[0]);
  const statusTimeoutRef = useRef(null);

  // Load participants from MongoDB (Source of Truth)
  const refreshData = useCallback(async () => {
    try {
      if (navigator.onLine) {
        const data = await fetchParticipants();
        // Convert array to map for faster lookups in frontend
        const participantsMap = {};
        data.forEach(p => {
          participantsMap[p.uuid] = p;
        });
        setParticipants(participantsMap);
        localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(participantsMap));
      } else {
        // Fallback to localStorage if offline
        const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
        if (stored) setParticipants(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load participants:', error);
      // Fallback to localStorage on error
      const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
      if (stored) setParticipants(JSON.parse(stored));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    setSyncQueueCount(getSyncQueueCount());
  }, [refreshData]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshData(); // Re-fetch data when back online
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const cleanup = setupOnlineSync((result) => {
      setSyncQueueCount(getSyncQueueCount());
      refreshData(); // Refresh list after sync
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanup();
    };
  }, [refreshData]);

  // Auto-reset scan status after animation
  useEffect(() => {
    if (scanStatus !== 'idle' && scanStatus !== 'scanning') {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => {
        setScanStatus('idle');
        setLastScanInfo(null);
      }, 3500);
    }
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, [scanStatus]);

  // Persist recentScans to localStorage
  useEffect(() => {
    localStorage.setItem('mealTracker_recentScans', JSON.stringify(recentScans));
  }, [recentScans]);

  const handleScan = useCallback(async (rawString) => {
    if (!rawString || scanStatus === 'scanning') return;

    setScanStatus('scanning');

    try {
      const input = rawString.trim();
      let uuid = null;
      let participant = null;

      // 1) Try direct UUID lookup
      if (participants[input]) {
        uuid = input;
        participant = participants[input];
      } else {
        // 2) Fall back to case-insensitive name search
        const searchTerm = input.toLowerCase();
        const match = Object.entries(participants).find(
          ([, p]) => p.name.toLowerCase() === searchTerm
        );
        if (match) {
          uuid = match[0];
          participant = match[1];
        }
      }

      if (!participant) {
        setScanStatus('not_found');
        setLastScanInfo({ raw: rawString, status: 'not_found', meal: currentMeal });
        setRecentScans(prev => [{
          id: Date.now(),
          raw: rawString,
          status: 'not_found',
          meal: currentMeal,
          time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 50));
        return;
      }

      // Check local state first to prevent duplicate requests
      if (participant.meals[currentMeal]) {
        setScanStatus('already_taken');
        setLastScanInfo({
          name: participant.name,
          uuid: participant.uuid,
          status: 'already_taken',
          meal: currentMeal
        });
        return;
      }

      // 3) Push to Backend or Queue
      if (navigator.onLine) {
        const result = await recordScan(uuid, currentMeal);
        if (result.status === 'already_taken') {
          setScanStatus('already_taken');
          setLastScanInfo({
            name: participant.name,
            uuid: participant.uuid,
            status: 'already_taken',
            meal: currentMeal
          });
          // Update local state to match backend
          setParticipants(prev => ({
            ...prev,
            [uuid]: { ...prev[uuid], meals: { ...prev[uuid].meals, [currentMeal]: true } }
          }));
          return;
        }
      } else {
        // Offline: Add to sync queue
        const syncRecord = {
          participantUuid: uuid,
          meal: currentMeal,
          scannedAt: new Date().toISOString()
        };
        const queueSize = addToSyncQueue(syncRecord);
        setSyncQueueCount(queueSize);
      }

      // 4) Success Logic
      setParticipants(prev => ({
        ...prev,
        [uuid]: {
          ...prev[uuid],
          meals: { ...prev[uuid].meals, [currentMeal]: true }
        }
      }));

      setScanStatus('success');
      setLastScanInfo({
        name: participant.name,
        uuid: participant.uuid,
        status: 'success',
        meal: currentMeal
      });
      setRecentScans(prev => [{
        id: Date.now(),
        name: participant.name,
        uuid: participant.uuid,
        status: 'success',
        meal: currentMeal,
        time: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 50));

    } catch (error) {
      console.error('Scan processing error:', error);
      setScanStatus('not_found');
    }
  }, [participants, currentMeal, scanStatus]);

  const handleSyncNow = useCallback(async () => {
    const result = await syncNow();
    setSyncQueueCount(getSyncQueueCount());
    if (result.success) refreshData();
    return result;
  }, [refreshData]);

  const getStats = useCallback(() => {
    const entries = Object.values(participants);
    const total = entries.length;
    const stats = {};
    MEAL_OPTIONS.forEach(meal => {
      stats[meal] = entries.filter(p => p.meals?.[meal]).length;
    });
    return { total, ...stats };
  }, [participants]);

  return (
    <MealContext.Provider value={{
      participants,
      currentMeal,
      setCurrentMeal,
      scanStatus,
      handleScan,
      syncQueueCount,
      handleSyncNow,
      recentScans,
      isOnline,
      isLoading,
      lastScanInfo,
      getStats,
      MEAL_OPTIONS,
      currentView,
      setCurrentView,
      trackingDate,
      refreshData,
      getHistory: getHistoryData
    }}>
      {children}
    </MealContext.Provider>
  );
}

export function useMeal() {
  const context = useContext(MealContext);
  if (!context) throw new Error('useMeal must be used within a MealProvider');
  return context;
}
