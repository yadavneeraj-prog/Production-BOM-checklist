const XLSX = require('xlsx');

/* Builds the attempts export workbook:
   Row 1: "Attempt Date" + each attempt's date, aligned under its Status column
   Row 2: the BOM's real headers + Status1, Status2, Status3 ...
   Data rows: each item's original cells + OK/NOT OK per attempt */
function buildAttemptsWorkbookBuffer(entry, attempts){
  const headers = entry.headers;

  const row1 = new Array(headers.length + attempts.length).fill('');
  row1[0] = 'Attempt Date';
  attempts.forEach((a, i) => { row1[headers.length + i] = a.date; });

  const row2 = headers.concat(attempts.map((_, i) => `Status${i + 1}`));

  const dataRows = entry.rows.map((row, rIdx) => {
    const statusCells = attempts.map(a => {
      const s = a.statuses[rIdx];
      return s === 'ok' ? 'OK' : (s === 'notok' ? 'NOT OK' : '');
    });
    return row.concat(statusCells);
  });

  const aoa = [row1, row2, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BOM Check');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { buildAttemptsWorkbookBuffer };
