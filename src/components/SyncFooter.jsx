import { useState } from 'react';
import { RefreshCw, Wifi, WifiOff, CloudUpload, Check } from 'lucide-react';
import { useMeal } from '../context/MealContext';

export default function SyncFooter() {
  const { syncQueueCount, handleSyncNow, isOnline } = useMeal();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncResult(null);

    const result = await handleSyncNow();
    setSyncResult(result);
    setIsSyncing(false);

    setTimeout(() => setSyncResult(null), 3000);
  };

  return (
    <footer className="sync-footer">
      <div className="footer-content">
        <div className="connection-status">
          <span className={`icon-circle small ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          </span>
          <span className="status-text">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <button
          className={`sync-btn ${syncQueueCount > 0 ? 'has-pending' : ''} ${isSyncing ? 'syncing' : ''}`}
          onClick={handleSync}
          disabled={isSyncing || syncQueueCount === 0}
          id="sync-now-btn"
        >
          <span className="icon-circle small">
            {isSyncing ? (
              <RefreshCw size={14} className="spin-icon" />
            ) : syncResult?.success ? (
              <Check size={14} />
            ) : (
              <CloudUpload size={14} />
            )}
          </span>
          <span className="sync-label">
            {isSyncing
              ? 'Syncing...'
              : syncResult?.success
                ? `Synced ${syncResult.synced}!`
                : `Sync Now`
            }
          </span>
          {syncQueueCount > 0 && (
            <span className="sync-badge">{syncQueueCount}</span>
          )}
        </button>

        <div className="queue-info">
          <span className="queue-count">
            {syncQueueCount} pending
          </span>
        </div>
      </div>
    </footer>
  );
}
