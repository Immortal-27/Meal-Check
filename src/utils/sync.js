/**
 * Sync queue management for offline-first meal tracking.
 * Stores pending scan records in localStorage and syncs when online.
 */

const SYNC_QUEUE_KEY = 'mealTracker_syncQueue';
const SYNC_URL = 'https://api.example.com/meal-tracker/sync';

export function getSyncQueue() {
  try {
    const queue = localStorage.getItem(SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

export function addToSyncQueue(record) {
  const queue = getSyncQueue();
  queue.push({
    ...record,
    timestamp: Date.now(),
    id: crypto.randomUUID()
  });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  return queue.length;
}

export function clearSyncQueue() {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]));
}

export function getSyncQueueCount() {
  return getSyncQueue().length;
}

export async function syncNow() {
  const queue = getSyncQueue();
  if (queue.length === 0) return { success: true, synced: 0, pending: 0 };

  try {
    const response = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: queue })
    });

    if (response.ok) {
      clearSyncQueue();
      return { success: true, synced: queue.length, pending: 0 };
    }
    return { success: false, synced: 0, pending: queue.length };
  } catch (error) {
    // Offline or server error — keep queue intact
    return { success: false, synced: 0, pending: queue.length, error: error.message };
  }
}

/**
 * Sets up automatic sync retry when the browser comes back online.
 */
export function setupOnlineSync(onSyncAttempt) {
  const handler = async () => {
    if (navigator.onLine && getSyncQueueCount() > 0) {
      const result = await syncNow();
      if (onSyncAttempt) onSyncAttempt(result);
    }
  };

  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
