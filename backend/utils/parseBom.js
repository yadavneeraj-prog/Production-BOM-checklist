const XLSX = require('xlsx');

/* Finds the real table header row by looking for the known BOM column names
   (Item Code, Product name, Q.P.S, Unit, Specification — any letter case).
   Any label/ID rows above it (BOM ID, FG/SFG Item Code, etc.) are ignored.
   Falls back to the most common row "shape" (filled-cell count) if none of
   the known column names are found, so unfamiliar BOM layouts still parse. */

const HEADER_COLUMN_GROUPS = [
  ['itemcode', 'partcode', 'code'],
  ['productname', 'description', 'itemdescription', 'name'],
  ['qps', 'qty', 'quantity'],
  ['unit', 'uom'],
  ['specification', 'spec']
];

function normalizeCell(c){ return String(c).trim().toLowerCase().replace(/[^a-z0-9]/g, ''); }

function isHeaderRow(row){
  const cells = row.map(normalizeCell).filter(Boolean);
  let matches = 0;
  HEADER_COLUMN_GROUPS.forEach(group => {
    if(cells.some(cell => group.some(k => cell === k || cell.includes(k)))) matches++;
  });
  return matches >= 3;
}

function parseBomBuffer(buffer){
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    .filter(r => r.some(c => String(c).trim() !== ''));
  if(rows.length < 2) return null;

  let headerIdx = rows.findIndex(isHeaderRow);
  if(headerIdx === -1){
    const filledCounts = rows.map(r => r.filter(c => String(c).trim() !== '').length);
    const freq = {};
    filledCounts.forEach(c => { if(c > 1) freq[c] = (freq[c] || 0) + 1; });
    let tableColCount = 0, maxFreq = 0;
    Object.entries(freq).forEach(([c, f]) => {
      const cn = Number(c);
      if(f > maxFreq || (f === maxFreq && cn > tableColCount)){ maxFreq = f; tableColCount = cn; }
    });
    headerIdx = filledCounts.findIndex(c => c === tableColCount);
    if(headerIdx === -1) headerIdx = 0;
  }

  const headers = rows[headerIdx].map((h, i) => String(h).trim() || `Column ${i + 1}`);
  const dataRows = rows.slice(headerIdx + 1)
    .map(r => headers.map((_, i) => (r[i] !== undefined && r[i] !== '') ? String(r[i]) : ''));
  if(dataRows.length === 0) return null;

  return { headers, rows: dataRows };
}

module.exports = { parseBomBuffer };
