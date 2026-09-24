const express = require('express');
const BrandModel = require('../models/BrandModel');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/master  -> [{ brand, models: [...] }, ...] — shared across all departments
router.get('/', async (req, res) => {
  const list = await BrandModel.find().sort({ brand: 1 });
  res.json(list);
});

// POST /api/master/brands  { brand }
router.post('/brands', async (req, res) => {
  const brand = (req.body.brand || '').trim();
  if(!brand) return res.status(400).json({ message: 'Brand name required' });
  const existing = await BrandModel.findOne({ brand });
  if(existing) return res.status(409).json({ message: 'This brand already exists' });
  const doc = await BrandModel.create({ brand, models: [] });
  res.status(201).json(doc);
});

// PUT /api/master/brands/:brand  { newBrand }
router.put('/brands/:brand', async (req, res) => {
  const newBrand = (req.body.newBrand || '').trim();
  if(!newBrand) return res.status(400).json({ message: 'New brand name required' });
  const existing = await BrandModel.findOne({ brand: newBrand });
  if(existing) return res.status(409).json({ message: 'A brand with this name already exists' });
  const doc = await BrandModel.findOneAndUpdate({ brand: req.params.brand }, { brand: newBrand }, { new: true });
  if(!doc) return res.status(404).json({ message: 'Brand not found' });
  res.json(doc);
});

// DELETE /api/master/brands/:brand
router.delete('/brands/:brand', async (req, res) => {
  await BrandModel.deleteOne({ brand: req.params.brand });
  res.json({ message: 'Brand deleted' });
});

// POST /api/master/brands/:brand/models  { model }
router.post('/brands/:brand/models', async (req, res) => {
  const model = (req.body.model || '').trim();
  if(!model) return res.status(400).json({ message: 'Model name required' });
  const doc = await BrandModel.findOne({ brand: req.params.brand });
  if(!doc) return res.status(404).json({ message: 'Brand not found' });
  if(doc.models.includes(model)) return res.status(409).json({ message: 'This model already exists for this brand' });
  doc.models.push(model);
  await doc.save();
  res.status(201).json(doc);
});

// PUT /api/master/brands/:brand/models/:model  { newModel }
router.put('/brands/:brand/models/:model', async (req, res) => {
  const newModel = (req.body.newModel || '').trim();
  if(!newModel) return res.status(400).json({ message: 'New model name required' });
  const doc = await BrandModel.findOne({ brand: req.params.brand });
  if(!doc) return res.status(404).json({ message: 'Brand not found' });
  if(doc.models.includes(newModel)) return res.status(409).json({ message: 'A model with this name already exists' });
  const idx = doc.models.indexOf(req.params.model);
  if(idx === -1) return res.status(404).json({ message: 'Model not found' });
  doc.models[idx] = newModel;
  await doc.save();
  res.json(doc);
});

// DELETE /api/master/brands/:brand/models/:model
router.delete('/brands/:brand/models/:model', async (req, res) => {
  const doc = await BrandModel.findOne({ brand: req.params.brand });
  if(!doc) return res.status(404).json({ message: 'Brand not found' });
  doc.models = doc.models.filter(m => m !== req.params.model);
  await doc.save();
  res.json(doc);
});

module.exports = router;