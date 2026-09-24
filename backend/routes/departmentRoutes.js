const express = require('express');
const Department = require('../models/Department');

const router = express.Router();
// No requireAuth here — the department list needs to be visible and
// manageable on the signup screen, before the user has a login token.

const PROTECTED = 'Production'; // core flow depends on this exact name — never renamed/deleted

// GET /api/departments -> ["Production", "HEX", "ASSEMBLY", ...]
router.get('/', async (req, res) => {
  const docs = await Department.find().sort({ createdAt: 1 });
  res.json(docs.map(d => d.name));
});

// POST /api/departments  { name }
router.post('/', async (req, res) => {
  const name = (req.body.name || '').trim();
  if(!name) return res.status(400).json({ message: 'Department name required' });
  const existing = await Department.findOne({ name });
  if(existing) return res.status(409).json({ message: 'This department already exists' });
  const doc = await Department.create({ name });
  res.status(201).json(doc);
});

// PUT /api/departments/:name  { newName }
router.put('/:name', async (req, res) => {
  if(req.params.name === PROTECTED){
    return res.status(400).json({ message: `"${PROTECTED}" cannot be renamed` });
  }
  const newName = (req.body.newName || '').trim();
  if(!newName) return res.status(400).json({ message: 'New department name required' });
  if(newName === PROTECTED) return res.status(400).json({ message: `Cannot rename to "${PROTECTED}"` });
  const existing = await Department.findOne({ name: newName });
  if(existing) return res.status(409).json({ message: 'A department with this name already exists' });
  const doc = await Department.findOneAndUpdate({ name: req.params.name }, { name: newName }, { new: true });
  if(!doc) return res.status(404).json({ message: 'Department not found' });
  res.json(doc);
});

// DELETE /api/departments/:name
router.delete('/:name', async (req, res) => {
  if(req.params.name === PROTECTED){
    return res.status(400).json({ message: `"${PROTECTED}" cannot be deleted` });
  }
  await Department.deleteOne({ name: req.params.name });
  res.json({ message: 'Department deleted' });
});

module.exports = router;
