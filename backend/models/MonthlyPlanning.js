const mongoose = require('mongoose');

// One document per (department, monthKey) — the list of models planned to be
// checked that month, each with its own editable planningCount (set via a
// dropdown on the Planning page — how many times that model should be
// checked this month). Re-uploading the sheet for the same month replaces
// the model list (existing planningCount values for models still in the new
// list are preserved by the route logic, not by the schema).
const planningModelSchema = new mongoose.Schema({
  model: { type: String, required: true },
  planningCount: { type: Number, default: 1 }
}, { _id: false });

const monthlyPlanningSchema = new mongoose.Schema({
  department: { type: String, required: true, trim: true },
  monthKey: { type: String, required: true }, // "YYYY-MM"
  models: { type: [planningModelSchema], default: [] },
  fileName: { type: String, default: null }
}, { timestamps: true });

monthlyPlanningSchema.index({ department: 1, monthKey: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyPlanning', monthlyPlanningSchema);