import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { parseCSV, buildParticipantsMap } from '../utils/csv';
import { addToSyncQueue, getSyncQueueCount, syncNow, setupOnlineSync } from '../utils/sync';

const MealContext = createContext(null);

const PARTICIPANTS_STORAGE_KEY = 'mealTracker_participants';
const DATA_VERSION_KEY = 'mealTracker_dataVersion';
const TRACKING_DATE_KEY = 'mealTracker_trackingDate';
const HISTORY_KEY = 'mealTracker_history'; // { "2026-04-08": { participants, scans } }
const DATA_VERSION = '3';
const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snacks'];

/** Returns today's date as YYYY-MM-DD in local time */
function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Resets all meal flags to false, preserving participant identity */
function resetAllMeals(participantsMap) {
  const reset = {};
  for (const [uuid, p] of Object.entries(participantsMap)) {
    reset[uuid] = {
      ...p,
      meals: { breakfast: false, lunch: false, dinner: false, snacks: false }
    };
  }
  return reset;
}

/** Archives a day's data into history before resetting */
function archiveDayData(date, participantsMap, scans) {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    history[date] = {
      participants: participantsMap,
      scans: scans || [],
      archivedAt: new Date().toISOString()
    };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    console.log(`[MEALTRACK] Archived data for ${date}`);
  } catch (e) {
    console.error('[MEALTRACK] Failed to archive day data:', e);
  }
}

/** Returns the full history object */
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
  const [trackingDate, setTrackingDate] = useState(getTodayDateString());
  const statusTimeoutRef = useRef(null);

  // Load participants from localStorage or fetch from CSV
  useEffect(() => {
    async function loadParticipants() {
      try {
        const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
        const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
        const today = getTodayDateString();
        const storedDate = localStorage.getItem(TRACKING_DATE_KEY);

        if (stored && storedVersion === DATA_VERSION) {
          let data = JSON.parse(stored);

          // Day changed → archive previous day, then reset meals
          if (storedDate !== today) {
            console.log(`[MEALTRACK] New day detected (${storedDate} → ${today}). Archiving & resetting.`);
            // Archive previous day's data (meals + scan log)
            if (storedDate) {
              const savedScans = JSON.parse(localStorage.getItem('mealTracker_recentScans') || '[]');
              archiveDayData(storedDate, data, savedScans);
            }
            data = resetAllMeals(data);
            localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(data));
            localStorage.setItem(TRACKING_DATE_KEY, today);
            localStorage.removeItem('mealTracker_recentScans');
            setTrackingDate(today);
          }

          setParticipants(data);
        } else {
          // Clear stale data from previous format
          localStorage.removeItem(PARTICIPANTS_STORAGE_KEY);
          const response = await fetch('/participants.csv');
          const csvText = await response.text();
          const rows = parseCSV(csvText);
          const participantsMap = buildParticipantsMap(rows);
          setParticipants(participantsMap);
          localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(participantsMap));
          localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION);
          localStorage.setItem(TRACKING_DATE_KEY, today);
        }
      } catch (error) {
        console.error('Failed to load participants:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadParticipants();
    setSyncQueueCount(getSyncQueueCount());
  }, []);

  // Midnight auto-reset: check every 30s if the day has changed while app is open
  useEffect(() => {
    const interval = setInterval(() => {
      const today = getTodayDateString();
      const storedDate = localStorage.getItem(TRACKING_DATE_KEY);
      if (storedDate && storedDate !== today) {
        console.log(`[MEALTRACK] Midnight rollover detected. Archiving & resetting for ${today}.`);
        setParticipants(prev => {
          // Archive the outgoing day's data
          archiveDayData(storedDate, prev, recentScans);
          const reset = resetAllMeals(prev);
          localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(reset));
          localStorage.setItem(TRACKING_DATE_KEY, today);
          return reset;
        });
        setRecentScans([]);
        localStorage.removeItem('mealTracker_recentScans');
        setTrackingDate(today);
      }
    }, 30_000); // every 30 seconds

    return () => clearInterval(interval);
  }, [recentScans]);

  // Persist participants to localStorage on change
  useEffect(() => {
    if (Object.keys(participants).length > 0) {
      localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(participants));
    }
  }, [participants]);

  // Persist recentScans to localStorage
  useEffect(() => {
    localStorage.setItem('mealTracker_recentScans', JSON.stringify(recentScans));
  }, [recentScans]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const cleanup = setupOnlineSync((result) => {
      setSyncQueueCount(getSyncQueueCount());
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanup();
    };
  }, []);

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

      if (participant.meals[currentMeal]) {
        setScanStatus('already_taken');
        setLastScanInfo({
          name: participant.name,
          uuid: participant.uuid,
          status: 'already_taken',
          meal: currentMeal
        });
        setRecentScans(prev => [{
          id: Date.now(),
          name: participant.name,
          uuid: participant.uuid,
          status: 'already_taken',
          meal: currentMeal,
          time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 50));
        return;
      }

      // Mark meal as taken
      const updatedParticipants = {
        ...participants,
        [uuid]: {
          ...participant,
          meals: {
            ...participant.meals,
            [currentMeal]: true
          }
        }
      };
      setParticipants(updatedParticipants);

      // Add to sync queue
      const syncRecord = {
        participantUuid: uuid,
        meal: currentMeal,
        action: 'meal_taken',
        scannedAt: new Date().toISOString()
      };
      const queueSize = addToSyncQueue(syncRecord);
      setSyncQueueCount(queueSize);

      // Try immediate sync
      if (navigator.onLine) {
        syncNow().then(result => {
          setSyncQueueCount(getSyncQueueCount());
        });
      }

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
    return result;
  }, []);

  const resetData = useCallback(() => {
    // Archive current day's data before resetting
    const today = getTodayDateString();
    if (Object.values(participants).some(p => Object.values(p.meals).some(v => v))) {
      archiveDayData(today, participants, recentScans);
    }
    localStorage.removeItem(PARTICIPANTS_STORAGE_KEY);
    localStorage.removeItem('mealTracker_recentScans');
    setParticipants({});
    setRecentScans([]);
    setSyncQueueCount(0);
    // Reload from CSV
    fetch('/participants.csv')
      .then(r => r.text())
      .then(csvText => {
        const rows = parseCSV(csvText);
        const participantsMap = buildParticipantsMap(rows);
        setParticipants(participantsMap);
        localStorage.setItem(PARTICIPANTS_STORAGE_KEY, JSON.stringify(participantsMap));
        localStorage.setItem(TRACKING_DATE_KEY, today);
      });
  }, [participants, recentScans]);

  const getStats = useCallback(() => {
    const entries = Object.values(participants);
    const total = entries.length;
    const stats = {};
    MEAL_OPTIONS.forEach(meal => {
      stats[meal] = entries.filter(p => p.meals[meal]).length;
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
      resetData,
      getStats,
      MEAL_OPTIONS,
      currentView,
      setCurrentView,
      trackingDate,
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
