import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(request) {
  try {
    const { formTitle, formRule, cols, rows, contractorName, contractorAddress, monthStr, location, woNo, theme } = await request.json();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Form', { pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 } });

    // --- Colors ---
    const YELLOW    = 'FFFFD700';
    const LIGHT_BLUE = 'FFBFE0EE';
    const RED_BG    = 'FFFFE4E1';
    const WHITE     = 'FFFFFFFF';
    const BLUE_HDR  = 'FFE8F4FD';
    const ORANGE    = 'FFF59E0B';
    const isBlue    = theme === 'blue';
    const borderColor = isBlue ? 'FF99CCFF' : 'FF333333';
    const headerBg  = isBlue ? BLUE_HDR : YELLOW;
    const numRowBg  = isBlue ? WHITE    : LIGHT_BLUE;
    const headerFg  = isBlue ? 'FF0066CC' : 'FF000000';

    const border = (color) => ({
      top: { style: 'thin', color: { argb: color } },
      left: { style: 'thin', color: { argb: color } },
      bottom: { style: 'thin', color: { argb: color } },
      right: { style: 'thin', color: { argb: color } }
    });

    const C = cols.length;

    // Helper: apply fill + font + border to a cell
    const style = (cell, { bg, fg = 'FF000000', bold = false, align = 'center', wrap = true } = {}) => {
      if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.font = { name: 'Arial', size: 9, bold, color: { argb: fg } };
      cell.alignment = { horizontal: align, vertical: 'middle', wrapText: wrap };
      cell.border = border(borderColor);
    };

    // --- Row 1: Title ---
    sheet.mergeCells(1, 1, 1, C);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `${formTitle}\n${formRule}`;
    style(titleCell, { bg: WHITE, fg: headerFg, bold: true, align: 'center' });
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: headerFg } };
    sheet.getRow(1).height = 50;

    // --- Row 2: Contractor + Month ---
    const span1 = Math.max(1, Math.floor(C * 0.2));
    const span2 = Math.max(1, Math.floor(C * 0.5));
    const span3 = Math.max(1, Math.floor(C * 0.15));
    const span4 = C - span1 - span2 - span3;

    const mergeRow = (row, segments) => {
      let col = 1;
      for (const { text, bg, fg, bold } of segments) {
        const endCol = col + (segments.indexOf({ text, bg, fg, bold }) < 0 ? 0 : segments[segments.indexOf(s => s === { text, bg, fg, bold })]?.span || 1) - 1;
        // just use next segment
        const nextSpan = segments[segments.findIndex(s => s.text === text)]?.span || 1;
        if (nextSpan > 1) sheet.mergeCells(row, col, row, col + nextSpan - 1);
        const cell = sheet.getCell(row, col);
        cell.value = text;
        style(cell, { bg, fg, bold, align: 'left' });
        col += nextSpan;
        if (col > C) break;
      }
    };

    // Row 2: contractor
    const r2segs = [
      { text: 'Name and Address of Contractor >', span: span1, bg: WHITE, fg: isBlue ? 'FF0066CC' : 'FF000000', bold: true },
      { text: `${contractorName}\n${contractorAddress}`, span: span2, bg: RED_BG, fg: 'FFCC0000', bold: true },
      { text: 'For the month of :>', span: span3, bg: WHITE, fg: isBlue ? 'FF0066CC' : 'FF000000', bold: true },
      { text: monthStr, span: span4, bg: RED_BG, fg: 'FFCC0000', bold: true }
    ];
    let col2 = 1;
    for (const seg of r2segs) {
      if (seg.span > 1) sheet.mergeCells(2, col2, 2, col2 + seg.span - 1);
      const cell = sheet.getCell(2, col2);
      cell.value = seg.text;
      style(cell, { bg: seg.bg, fg: seg.fg, bold: seg.bold, align: 'left' });
      col2 += seg.span;
    }
    sheet.getRow(2).height = 30;

    // Row 3: location
    const r3segs = [
      { text: 'Nature and Location Of Work >', span: span1, bg: WHITE, fg: isBlue ? 'FF0066CC' : 'FF000000', bold: true },
      { text: location, span: span2, bg: RED_BG, fg: 'FFCC0000', bold: true },
      { text: 'Work order No.:>', span: span3, bg: WHITE, fg: isBlue ? 'FF0066CC' : 'FF000000', bold: true },
      { text: woNo, span: span4, bg: RED_BG, fg: 'FFCC0000', bold: true }
    ];
    let col3 = 1;
    for (const seg of r3segs) {
      if (seg.span > 1) sheet.mergeCells(3, col3, 3, col3 + seg.span - 1);
      const cell = sheet.getCell(3, col3);
      cell.value = seg.text;
      style(cell, { bg: seg.bg, fg: seg.fg, bold: seg.bold, align: 'left' });
      col3 += seg.span;
    }
    sheet.getRow(3).height = 24;

    // --- Row 4: Column headers (YELLOW or blue) ---
    for (let c = 0; c < C; c++) {
      const cell = sheet.getCell(4, c + 1);
      cell.value = cols[c];
      style(cell, { bg: headerBg, fg: headerFg, bold: true, align: 'center' });
    }
    sheet.getRow(4).height = 40;

    // --- Row 5: Column numbers (LIGHT_BLUE) ---
    for (let c = 0; c < C; c++) {
      const cell = sheet.getCell(5, c + 1);
      cell.value = c + 1;
      style(cell, { bg: numRowBg, fg: headerFg, bold: true, align: 'center' });
    }
    sheet.getRow(5).height = 18;

    // --- Data rows ---
    rows.forEach((row, rIdx) => {
      const excelRow = 6 + rIdx;
      row.forEach((val, cIdx) => {
        const cell = sheet.getCell(excelRow, cIdx + 1);
        cell.value = val === undefined || val === null ? '' : String(val);
        const isWO = val === 'W/O';
        style(cell, {
          bg: isWO ? ORANGE : WHITE,
          fg: isWO ? 'FFFFFFFF' : 'FF000000',
          bold: isWO,
          align: 'center'
        });
      });
      sheet.getRow(excelRow).height = 18;
    });

    // --- Blank rows ---
    for (let b = 0; b < 3; b++) {
      const excelRow = 6 + rows.length + b;
      for (let c = 0; c < C; c++) {
        const cell = sheet.getCell(excelRow, c + 1);
        cell.value = '';
        style(cell, { bg: WHITE });
      }
      sheet.getRow(excelRow).height = 18;
    }

    // --- Signature row ---
    const sigRow = 6 + rows.length + 3 + 2;
    const sigCell = sheet.getCell(sigRow, C - 2);
    sheet.mergeCells(sigRow, Math.max(1, C - 3), sigRow, C);
    sigCell.value = 'Sign and Stamp for the HOD';
    sigCell.font = { name: 'Arial', size: 9, bold: true };
    sigCell.alignment = { horizontal: 'center', vertical: 'bottom' };
    sigCell.border = { top: { style: 'medium', color: { argb: 'FF000000' } } };

    // --- Column widths ---
    sheet.columns = cols.map((col, i) => ({
      width: col.length > 20 ? 18 : Math.max(10, col.length + 2),
      key: `col${i}`
    }));

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${formTitle.replace(/\s+/g, '_')}.xlsx"`,
      }
    });
  } catch (err) {
    console.error('Excel export error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
