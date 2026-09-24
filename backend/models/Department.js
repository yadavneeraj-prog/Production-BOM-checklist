const mongoose = require('mongoose');

// The top-level selector above Brand/Model. "Production" is special: it is
// the only department that uses the Brand/Model AC flow, and it can never be
// renamed or deleted since the app's core flow depends on that exact name.
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
