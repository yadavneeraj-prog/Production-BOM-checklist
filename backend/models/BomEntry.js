const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  date: { type: String, required: true },       // display string, Asia/Kolkata
  monthKey: { type: String, required: true },    // "YYYY-MM" in Asia/Kolkata, used for the monthly reset
  statuses: { type: [String], default: [] }      // 'ok' | 'notok' | null, aligned with entry.rows order
}, { _id: false });

const bomEntrySchema = new mongoose.Schema({
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  label: { type: String, default: 'Original BOM' },   // "Original BOM" | "Revised BOM" | "Revised BOM N"
  fileName: { type: String, required: true },
  headers: { type: [String], default: [] },
  rows: { type: mongoose.Schema.Types.Mixed, default: [] }, // array of arrays of strings
  requiredAttempts: { type: Number, default: null },   // null until first checklist open (asked then)
  notifyEmail: { type: String, default: null },
  attempts: { type: [attemptSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

bomEntrySchema.index({ brand: 1, model: 1 });

module.exports = mongoose.model('BomEntry', bomEntrySchema);
