const express = require('express');
const multer = require('multer');
const BomEntry = require('../models/BomEntry');
const MonthlyPlanning = require('../models/MonthlyPlanning');
const requireAuth = require('../middleware/auth');
const { parseBomBuffer } = require('../utils/parseBom');
const { buildAttemptsWorkbookBuffer } = require('../utils/generateExcel');
const { sendEmail } = require('../utils/sendEmail');
const { nowKolkata, currentMonthKey } = require('../utils/time');

const router = express.Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function attemptsThisMonth(entry){
  const mk = currentMonthKey();
  return (entry.attempts || []).filter(a => a.monthKey === mk);
}

const PRODUCTION = 'Production';

// GET /api/boms/one/:id  -> single BOM entry with this-month attempt counts computed
router.get('/one/:id', async (req, res) => {
  const entry = await BomEntry.findById(req.params.id);
  if(!entry) return res.status(404).json({ message: 'BOM not found' });

  const monthKey = currentMonthKey();

  // No requiredAttempts set for this month yet? Pull the planning count for
  // this exact model from this month's Planning sheet, if one was uploaded.
  // No modal, no manual question — it's driven entirely by the Planning page.
  if(entry.requiredAttemptsMonth !== monthKey){
    const plan = await MonthlyPlanning.findOne({ department: entry.department, monthKey });
    const planEntry = plan?.models.find(m => m.model === entry.model);
    entry.requiredAttempts = planEntry ? planEntry.planningCount : null;
    entry.requiredAttemptsMonth = monthKey;
    await entry.save();
  }

  const monthDone = attemptsThisMonth(entry).length;
  const monthRequired = entry.requiredAttempts || 0;
  const monthPending = Math.max(0, monthRequired - monthDone);
  res.json({ ...entry.toObject(), monthDone, monthRequired, monthPending });
});

// GET /api/boms?department=&brand=&model=  -> list BOM entries for that department/brand/model
// (Docs saved before "department" existed have no field at all — treated as Production.)
router.get('/', async (req, res) => {
  const { department, brand, model } = req.query;
  if(!department || !brand || !model) return res.status(400).json({ message: 'department, brand and model are required' });

  const query = department === PRODUCTION
    ? { brand, model, $or: [{ department: PRODUCTION }, { department: { $exists: false } }] }
    : { department, brand, model };

  const entries = await BomEntry.find(query).sort({ createdAt: 1 });
  res.json(entries);
});

// GET /api/boms/in-progress?department=X  -> only that department's entries with >=1 attempt this month
router.get('/in-progress', async (req, res) => {
  const { department } = req.query;
  if(!department) return res.status(400).json({ message: 'department is required' });

  const mk = currentMonthKey();
  const deptQuery = department === PRODUCTION
    ? { $or: [{ department: PRODUCTION }, { department: { $exists: false } }] }
    : { department };

  const entries = await BomEntry.find({ ...deptQuery, 'attempts.monthKey': mk });
  const items = entries.map(entry => {
    const done = attemptsThisMonth(entry).length;
    const required = entry.requiredAttempts || 0;
    return {
      id: entry._id, department: entry.department || PRODUCTION,
      brand: entry.brand, model: entry.model, label: entry.label,
      done, required, pending: Math.max(0, required - done)
    };
  });
  res.json(items);
});

// POST /api/boms  (multipart: file, department, brand, model) -> parse + create, permanently saved
router.post('/', upload.single('file'), async (req, res) => {
  try{
    const { department, brand, model } = req.body;
    if(!department || !brand || !model || !req.file){
      return res.status(400).json({ message: 'department, brand, model and file are required' });
    }

    const parsed = parseBomBuffer(req.file.buffer);
    const headers = (parsed && parsed.headers.length) ? parsed.headers : ['File'];
    const rows = (parsed && parsed.rows.length) ? parsed.rows
      : [['Rows could not be auto-read from this file — open it manually to verify contents.']];

    const existingCount = await BomEntry.countDocuments({ department, brand, model });
    const label = existingCount === 0 ? 'Original BOM'
      : (existingCount === 1 ? 'Revised BOM' : `Revised BOM ${existingCount}`);

    const entry = await BomEntry.create({
      department, brand, model, label,
      fileName: req.file.originalname,
      headers, rows,
      requiredAttempts: null,
      notifyEmail: null,
      checklistFieldsConfigured: false,
      attempts: [],
      createdBy: req.user.id
    });

    res.status(201).json(entry);
  }catch(err){
    res.status(500).json({ message: 'Could not save BOM', error: err.message });
  }
});

// PUT /api/boms/:id  { fileName } -> rename
router.put('/:id', async (req, res) => {
  const entry = await BomEntry.findByIdAndUpdate(
    req.params.id, { fileName: req.body.fileName }, { new: true }
  );
  if(!entry) return res.status(404).json({ message: 'BOM not found' });
  res.json(entry);
});

// DELETE /api/boms/:id
router.delete('/:id', async (req, res) => {
  await BomEntry.findByIdAndDelete(req.params.id);
  res.json({ message: 'BOM deleted' });
});

// PUT /api/boms/:id/setup  { requiredAttempts, notifyEmail }  -> first-time attempts config
// PUT /api/boms/:id/setup  { notifyEmail } -> optional completion-notify email for this BOM
router.put('/:id/setup', async (req, res) => {
  const { notifyEmail } = req.body;
  const entry = await BomEntry.findByIdAndUpdate(
    req.params.id,
    { notifyEmail: notifyEmail || null },
    { new: true }
  );
  if(!entry) return res.status(404).json({ message: 'BOM not found' });
  res.json(entry);
});

// PUT /api/boms/:id/fields  { reading, status, remark }  -> which checklist columns this BOM uses
router.put('/:id/fields', async (req, res) => {
  const { reading, status, remark } = req.body;
  if(!reading && !status && !remark){
    return res.status(400).json({ message: 'Select at least one checklist field' });
  }
  const entry = await BomEntry.findByIdAndUpdate(
    req.params.id,
    { checklistFields: { reading: !!reading, status: !!status, remark: !!remark }, checklistFieldsConfigured: true },
    { new: true }
  );
  if(!entry) return res.status(404).json({ message: 'BOM not found' });
  res.json(entry);
});

// POST /api/boms/:id/attempt  { statuses: ['ok'|'notok', ...] }
// Records one attempt for the current month; sends a completion email once
// this month's required attempts are all done.
router.post('/:id/attempt', async (req, res) => {
  const entry = await BomEntry.findById(req.params.id);
  if(!entry) return res.status(404).json({ message: 'BOM not found' });

  const { statuses, remarks, readings } = req.body;
  const attemptDate = nowKolkata();
  const monthKey = currentMonthKey();
  entry.attempts.push({ date: attemptDate, monthKey, statuses, remarks: remarks || [], readings: readings || [] });
  await entry.save();

  const done = attemptsThisMonth(entry).length;
  const required = entry.requiredAttempts || 0;
  const remaining = Math.max(0, required - done);

  if(remaining === 0 && entry.notifyEmail){
    const context = `${entry.brand} / ${entry.model}`;
    try{
      await sendEmail({
        to: entry.notifyEmail,
        subject: `Checklist complete — ${entry.label} (${context})`,
        text: `The checklist for "${entry.label}" (${context}) has been completed for this month — all ${required} attempts done.`,
        html: `<p>The checklist for <b>${entry.label}</b> (${context}) has been completed for this month — all ${required} attempts done.</p>`
      });
    }catch(err){
      console.error('Completion email failed:', err.message);
    }
  }

  res.json({ entry, done, required, remaining });
});

// GET /api/boms/:id/export  -> downloads .xlsx of this month's attempts
router.get('/:id/export', async (req, res) => {
  const entry = await BomEntry.findById(req.params.id);
  if(!entry) return res.status(404).json({ message: 'BOM not found' });

  const attempts = attemptsThisMonth(entry);
  if(!attempts.length) return res.status(400).json({ message: 'No attempts recorded yet for this BOM this month' });

  const buffer = buildAttemptsWorkbookBuffer(entry, attempts);
  const safeName = (entry.fileName || 'BOM').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_\- ]/gi, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}_attempts.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = router;