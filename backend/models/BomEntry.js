const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  date: { type: String, required: true },       // display string, Asia/Kolkata
  monthKey: { type: String, required: true },    // "YYYY-MM" in Asia/Kolkata, used for the monthly reset
  readings: { type: [String], default: [] },     // manually entered reading/value per row, aligned with entry.rows order
  statuses: { type: [String], default: [] },     // 'ok' | 'notok' | null, aligned with entry.rows order
  remarks: { type: [String], default: [] }       // free-text remark per row, aligned with entry.rows order
}, { _id: false });

const bomEntrySchema = new mongoose.Schema({
  department: { type: String, required: true, trim: true, default: 'Production' },
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  label: { type: String, default: 'Original BOM' },   // "Original BOM" | "Revised BOM" | "Revised BOM N"
  fileName: { type: String, required: true },
  headers: { type: [String], default: [] },
  rows: { type: mongoose.Schema.Types.Mixed, default: [] }, // array of arrays of strings
  // Which checklist columns this specific BOM uses — chosen once when the
  // BOM is saved, editable later. Any combination is valid; a BOM with only
  // reading:true shows just the Reading column, etc.
  checklistFields: {
    reading: { type: Boolean, default: false },
    status: { type: Boolean, default: true },
    remark: { type: Boolean, default: false }
  },
  checklistFieldsConfigured: { type: Boolean, default: false }, // false until the user explicitly picks fields
  requiredAttempts: { type: Number, default: null },   // pulled from this month's Planning sheet, refreshed monthly
  requiredAttemptsMonth: { type: String, default: null }, // "YYYY-MM" this requiredAttempts value was pulled for
  notifyEmail: { type: String, default: null },
  attempts: { type: [attemptSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

bomEntrySchema.index({ department: 1, brand: 1, model: 1 });

module.exports = mongoose.model('BomEntry', bomEntrySchema);