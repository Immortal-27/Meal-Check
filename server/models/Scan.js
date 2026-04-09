import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema({
  participantUuid: { type: String, required: true },
  meal: { 
    type: String, 
    required: true, 
    enum: ['breakfast', 'lunch', 'dinner', 'snacks'] 
  },
  scannedAt: { type: Date, default: Date.now },
  deviceInfo: { type: String }, // Optional: to track which device made the scan
  status: { type: String, enum: ['success', 'already_taken', 'not_found'], default: 'success' }
}, { timestamps: true });

// Index for quick queries by date and meal
scanSchema.index({ scannedAt: -1, meal: 1 });
scanSchema.index({ participantUuid: 1 });

export default mongoose.model('Scan', scanSchema);
