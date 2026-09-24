const XLSX = require('xlsx');

/* Builds the attempts export workbook, using only the checklist columns this
   BOM actually has enabled (Reading / Status / Remark — any combination):
   Row 1: title — department / brand / model / BOM label, merged, centered
   Row 2: "Attempt Date" + each attempt's date, merged across its enabled columns
   Row 3: the BOM's real headers + <Reading1?> <Status1?> <Remark1?> per attempt
   Data rows: each item's original cells + whichever fields are enabled */
function buildAttemptsWorkbookBuffer(entry, attempts){
  const headers = entry.headers;
  const baseCols = headers.length;
  const fields = entry.checklistFields || { reading: false, status: true, remark: false };
  const colsPerAttempt = (fields.reading ? 1 : 0) + (fields.status ? 1 : 0) + (fields.remark ? 1 : 0) || 1;
  const totalCols = baseCols + attempts.length * colsPerAttempt;

  const titleRow = new Array(totalCols).fill('');
  titleRow[0] = `${entry.department || 'Production'} \u2014 ${entry.brand} / ${entry.model} \u2014 ${entry.label}`;

  const dateRow = new Array(totalCols).fill('');
  dateRow[0] = 'Attempt Date';
  attempts.forEach((a, i) => { dateRow[baseCols + i * colsPerAttempt] = a.date; });

  const headerRow = headers.slice();
  attempts.forEach((_, i) => {
    if(fields.reading) headerRow.push(`Reading${i + 1}`);
    if(fields.status) headerRow.push(`Status${i + 1}`);
    if(fields.remark) headerRow.push(`Remark${i + 1}`);
  });

  const dataRows = entry.rows.map((row, rIdx) => {
    const cells = row.slice();
    attempts.forEach(a => {
      if(fields.reading) cells.push((a.readings && a.readings[rIdx]) ? a.readings[rIdx] : '');
      if(fields.status){
        const s = a.statuses[rIdx];
        cells.push(s === 'ok' ? 'OK' : (s === 'notok' ? 'NOT OK' : ''));
      }
      if(fields.remark) cells.push((a.remarks && a.remarks[rIdx]) ? a.remarks[rIdx] : '');
    });
    return cells;
  });

  const aoa = [titleRow, dateRow, headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    ...attempts.map((_, i) => ({
      s: { r: 1, c: baseCols + i * colsPerAttempt },
      e: { r: 1, c: baseCols + i * colsPerAttempt + (colsPerAttempt - 1) }
    }))
  ];
  ws['!merges'] = merges;

  const titleCellRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if(ws[titleCellRef]){
    ws[titleCellRef].s = { alignment: { horizontal: 'center', vertical: 'center' }, font: { bold: true } };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BOM Check');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
}

module.exports = { buildAttemptsWorkbookBuffer };