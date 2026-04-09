import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  meals: {
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false },
    snacks: { type: Boolean, default: false }
  },
  lastScanAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('Participant', participantSchema);
