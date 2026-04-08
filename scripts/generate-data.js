import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read participants directly from the CSV source of truth
const csvPath = path.join(__dirname, '..', 'public', 'participants.csv');
const csvText = fs.readFileSync(csvPath, 'utf-8');

const lines = csvText.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim());

const participants = {};
const entries = [];

lines.slice(1).forEach(line => {
  const values = line.split(',').map(v => v.trim());
  const row = {};
  headers.forEach((header, i) => {
    row[header] = values[i] || '';
  });

  if (!row.uuid) return;

  participants[row.uuid] = {
    name: row.name || 'Unknown',
    uuid: row.uuid,
    meals: {
      breakfast: false,
      lunch: false,
      dinner: false,
      snacks: false
    }
  };

  entries.push({ uuid: row.uuid, name: row.name });
});

const output = {
  _meta: {
    generated: new Date().toISOString(),
    totalParticipants: entries.length,
    source: 'participants.csv',
    note: 'Scan QR codes containing these UUIDs to test'
  },
  participants
};

const outputPath = path.join(__dirname, '..', 'public', 'hashed_participants.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`\n✅ Generated hashed_participants.json with ${entries.length} participants from participants.csv\n`);
console.log('Participants:');
entries.forEach((entry, i) => {
  console.log(`  ${String(i + 1).padStart(2)}. ${entry.name.padEnd(20)} → ${entry.uuid}`);
});
console.log('');
