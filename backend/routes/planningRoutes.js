const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const MonthlyPlanning = require('../models/MonthlyPlanning');
const BomEntry = require('../models/BomEntry');
const { parsePlanningBuffer } = require('../utils/parsePlanning');

const router = express.Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function currentMonthKey(){
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`;
}

// GET /api/planning/months?department=X -> distinct months with planning data, current month always included
router.get('/months', async (req, res) => {
  const { department } = req.query;
  if(!department) return res.status(400).json({ message: 'department is required' });
  const docs = await MonthlyPlanning.find({ department }).select('monthKey').sort({ monthKey: -1 });
  const months = new Set(docs.map(d => d.monthKey));
  months.add(currentMonthKey());
  res.json([...months].sort().reverse());
});

// POST /api/planning  (multipart: file, department, monthKey) -> sets/replaces that month's model list.
// If a model already existed in the previous version of this month's plan,
// its planningCount is kept; new models default to however many times they
// appeared in the uploaded sheet (at least 1).
router.post('/', upload.single('file'), async (req, res) => {
  try{
    const { department, monthKey } = req.body;
    if(!department || !monthKey || !req.file){
      return res.status(400).json({ message: 'department, monthKey and file are required' });
    }
    const flatModels = parsePlanningBuffer(req.file.buffer);
    if(!flatModels.length){
      return res.status(400).json({ message: 'Could not read any model names from this file' });
    }

    const occurrences = {};
    flatModels.forEach(m => { occurrences[m] = (occurrences[m] || 0) + 1; });

    const existing = await MonthlyPlanning.findOne({ department, monthKey });
    const existingCounts = {};
    if(existing) existing.models.forEach(m => { existingCounts[m.model] = m.planningCount; });

    const models = Object.keys(occurrences).map(model => ({
      model,
      planningCount: existingCounts[model] ?? occurrences[model]
    }));

    const doc = await MonthlyPlanning.findOneAndUpdate(
      { department, monthKey },
      { department, monthKey, models, fileName: req.file.originalname },
      { upsert: true, new: true }
    );
    res.status(201).json(doc);
  }catch(err){
    res.status(500).json({ message: 'Could not save planning sheet', error: err.message });
  }
});

// PUT /api/planning/model  { department, monthKey, model, planningCount } -> edit one model's planning count
router.put('/model', async (req, res) => {
  const { department, monthKey, model, planningCount } = req.body;
  if(!department || !monthKey || !model || planningCount == null){
    return res.status(400).json({ message: 'department, monthKey, model and planningCount are required' });
  }
  const doc = await MonthlyPlanning.findOne({ department, monthKey });
  if(!doc) return res.status(404).json({ message: 'Planning sheet not found for this month' });
  const entry = doc.models.find(m => m.model === model);
  if(!entry) return res.status(404).json({ message: 'Model not found in this month\'s plan' });
  entry.planningCount = Number(planningCount);
  await doc.save();
  res.json(doc);
});

// DELETE /api/planning?department=X&monthKey=Y -> removes the whole month's plan
router.delete('/', async (req, res) => {
  const { department, monthKey } = req.query;
  if(!department || !monthKey) return res.status(400).json({ message: 'department and monthKey are required' });
  await MonthlyPlanning.deleteOne({ department, monthKey });
  res.json({ message: 'Planning deleted' });
});

// GET /api/planning/summary?department=X&monthKey=Y
// -> { fileName, rows: [{ model, planning, complete, pending, bomId }] }
router.get('/summary', async (req, res) => {
  const { department, monthKey } = req.query;
  if(!department || !monthKey) return res.status(400).json({ message: 'department and monthKey are required' });

  const plan = await MonthlyPlanning.findOne({ department, monthKey });
  if(!plan || !plan.models.length){
    return res.json({ fileName: null, rows: [] });
  }

  const uniqueModels = plan.models.map(m => m.model);
  const planningCounts = {};
  plan.models.forEach(m => { planningCounts[m.model] = m.planningCount; });

  const entries = await BomEntry.find({ department, model: { $in: uniqueModels } });

  const completeCounts = {};
  const candidate = {}; // model -> { bomId, pending, createdAt }
  entries.forEach(entry => {
    const doneThisMonth = (entry.attempts || []).filter(a => a.monthKey === monthKey).length;
    completeCounts[entry.model] = (completeCounts[entry.model] || 0) + doneThisMonth;

    const required = entry.requiredAttempts || 0;
    const pending = Math.max(0, required - doneThisMonth);
    const existingCand = candidate[entry.model];
    if(!existingCand || pending > existingCand.pending ||
       (pending === existingCand.pending && entry.createdAt > existingCand.createdAt)){
      candidate[entry.model] = { bomId: entry._id, pending, createdAt: entry.createdAt };
    }
  });

  const rows = uniqueModels.map(model => {
    const planning = planningCounts[model];
    const complete = completeCounts[model] || 0;
    const pending = Math.max(0, planning - complete);
    return { model, planning, complete, pending, bomId: candidate[model]?.bomId || null };
  });

  res.json({ fileName: plan.fileName, rows });
});

module.exports = router;