/**
 * Centralized API utility for communicating with the MongoDB backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function fetchParticipants() {
  console.log(`[API] Fetching participants from ${API_BASE_URL}/participants`);
  const response = await fetch(`${API_BASE_URL}/participants`);
  if (!response.ok) throw new Error(`Failed to fetch participants: ${response.statusText}`);
  return response.json();
}

export async function recordScan(participantUuid, meal, scannedAt) {
  console.log(`[API] Recording scan:`, { participantUuid, meal });
  const response = await fetch(`${API_BASE_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantUuid, meal, scannedAt })
  });
  const data = await response.json();
  console.log(`[API] Record scan result:`, data);
  return data;
}

export async function syncBatch(records) {
  console.log(`[API] Syncing ${records.length} records...`);
  const response = await fetch(`${API_BASE_URL}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });
  if (!response.ok) throw new Error(`Sync failed: ${response.statusText}`);
  const data = await response.json();
  console.log(`[API] Sync result:`, data);
  return data;
}
