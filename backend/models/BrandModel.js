const mongoose = require('mongoose');

// One document per brand; models is the list of model names under that brand.
const brandModelSchema = new mongoose.Schema({
  brand: { type: String, required: true, unique: true, trim: true },
  models: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('BrandModel', brandModelSchema);
