import * as XLSX from 'xlsx';

/**
 * Exports JSON data to an Excel file (.xlsx)
 * @param {Array} data - Array of objects representing rows
 * @param {String} filename - Name of the file to save (without extension)
 * @param {String} sheetName - Name of the worksheet
 */
export function exportToExcel(data, filename = 'Export', sheetName = 'Sheet1') {
  if (!data || !data.length) {
    console.warn('No data to export');
    return;
  }

  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Convert JSON to worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-size columns based on header length as a simple heuristic
  const colWidths = Object.keys(data[0]).map(key => ({
    wch: Math.max(key.length, 15) // minimum width 15
  }));
  ws['!cols'] = colWidths;

  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Write to file
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
