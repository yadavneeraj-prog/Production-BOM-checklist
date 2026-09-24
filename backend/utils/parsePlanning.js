const XLSX = require('xlsx');

/* Parses a monthly planning sheet into a flat list of model names (one entry
   per planned check — a model listed 3 times means "plan to check it 3 times
   this month"). Works whether the sheet has a "Model" header column or is
   just a bare list of model names with no header at all. */
function parsePlanningBuffer(buffer){
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    .filter(r => r.some(c => String(c).trim() !== ''));
  if(!rows.length) return [];

  const headerHasModelCol = rows[0].some(c => /model/i.test(String(c)));
  let modelColIdx = 0;
  let dataRows = rows;

  if(headerHasModelCol){
    modelColIdx = rows[0].findIndex(c => /model/i.test(String(c)));
    dataRows = rows.slice(1);
  }

  return dataRows
    .map(r => String(r[modelColIdx] ?? '').trim())
    .filter(v => v !== '');
}

module.exports = { parsePlanningBuffer };
