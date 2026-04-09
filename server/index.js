import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Participant from './models/Participant.js';
import Scan from './models/Scan.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://meal-check.swarnabhadev.in'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/ping', (req, res) => res.send('pong'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mealtracker';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    seedParticipants();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Seeding Logic
async function seedParticipants() {
  try {
    const count = await Participant.countDocuments();
    if (count > 0) {
      console.log('Database already seeded.');
      return;
    }

    const csvPath = path.join(__dirname, '../public/participants.csv');
    if (!fs.existsSync(csvPath)) {
      console.log('participants.csv not found, skipping seed.');
      return;
    }

    const csvData = fs.readFileSync(csvPath, 'utf8');
    const lines = csvData.trim().split('\n');
    const participants = lines.slice(1).map(line => {
      const [uuid, name] = line.split(',').map(s => s.trim());
      return { uuid, name };
    }).filter(p => p.uuid && p.name);

    await Participant.insertMany(participants);
    console.log(`Seeded ${participants.length} participants.`);
  } catch (error) {
    console.error('Error seeding participants:', error);
  }
}

// Routes

// Get all participants with their meal status for today
app.get('/api/participants', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get all scans for today
    const scans = await Scan.find({
      scannedAt: { $gte: today, $lt: tomorrow },
      status: 'success'
    });

    const participants = await Participant.find({});
    
    // Map status into participants
    const participantsWithStatus = participants.map(p => {
      const pObj = p.toObject();
      const pScans = scans.filter(s => s.participantUuid === p.uuid);
      const meals = {
        breakfast: pScans.some(s => s.meal === 'breakfast'),
        lunch: pScans.some(s => s.meal === 'lunch'),
        dinner: pScans.some(s => s.meal === 'dinner'),
        snacks: pScans.some(s => s.meal === 'snacks')
      };
      return { ...pObj, meals };
    });

    res.json(participantsWithStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record a scan
app.post('/api/scan', async (req, res) => {
  const { participantUuid, meal, scannedAt } = req.body;

  try {
    const participant = await Participant.findOne({ uuid: participantUuid });
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Check if already taken today
    const date = scannedAt ? new Date(scannedAt) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingScan = await Scan.findOne({
      participantUuid,
      meal,
      scannedAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'success'
    });

    if (existingScan) {
      return res.status(400).json({ status: 'already_taken', name: participant.name });
    }

    const newScan = new Scan({
      participantUuid,
      meal,
      scannedAt: date,
      status: 'success'
    });

    await newScan.save();
    res.json({ status: 'success', name: participant.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch sync
app.post('/api/sync', async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records)) return res.status(400).json({ error: 'Invalid records' });

  const results = { synced: 0, skipped: 0, errors: 0 };

  for (const record of records) {
    try {
      const { participantUuid, meal, scannedAt } = record;
      
      const date = new Date(scannedAt);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingScan = await Scan.findOne({
        participantUuid,
        meal,
        scannedAt: { $gte: startOfDay, $lte: endOfDay },
        status: 'success'
      });

      if (existingScan) {
        results.skipped++;
        continue;
      }

      const newScan = new Scan({
        participantUuid,
        meal,
        scannedAt: date,
        status: 'success'
      });
      await newScan.save();
      results.synced++;
    } catch (e) {
      results.errors++;
    }
  }

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
