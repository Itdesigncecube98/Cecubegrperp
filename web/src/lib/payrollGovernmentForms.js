import { jsPDF } from 'jspdf';

const PAGE = { width: 420, height: 297, margin: 9 };
const INK = [25, 25, 25];
const YELLOW = [255, 209, 42];
const BLUE = [191, 222, 238];
const PINK = [250, 226, 226];

function resolveOrganisation(value) {
  const text = String(value || '').trim();
  const normalized = text.toLowerCase();
  const isGreen = normalized.includes('green energy') || normalized.includes('cgepl');
  const isEngineering = normalized.includes('engineering') || normalized.includes('ceipl');
  if (isGreen && isEngineering) throw new Error(`Organisation is ambiguous for ${text}. Choose only one legal entity on the employee profile.`);
  if (isGreen) {
    return 'CeCube Green Energy Pvt. Ltd.';
  }
  if (isEngineering) {
    return 'CeCube Engineering India Pvt. Ltd.';
  }
  throw new Error(`Organisation is missing or unsupported for ${text || 'one or more employees'}. Set the employee organisation to CeCube Engineering India Pvt Ltd or CeCube Green Energy Pvt Ltd before generating forms.`);
}

function fmtDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function cycleDays(record) {
  const start = new Date(record.startDate);
  const end = new Date(record.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const days = [];
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) days.push(new Date(day));
  return days;
}

function attendanceCode(status) {
  const value = String(status || '').trim().toLowerCase();
  if (['present', 'p', 'in', 'half day', 'hd'].includes(value)) return value === 'half day' || value === 'hd' ? 'HD' : 'P';
  if (['absent', 'a', 'lwp'].includes(value)) return value === 'lwp' ? 'LWP' : 'A';
  if (value.includes('weekly') || value === 'w-off' || value === 'wo') return 'WO';
  if (value.includes('holiday') || value === 'h') return 'H';
  if (value.includes('leave') || ['cl', 'el', 'sl', 'pl', 'c-off'].includes(value)) return value.toUpperCase();
  return value ? value.slice(0, 3).toUpperCase() : '';
}

function ageOn(dateOfBirth, onDate) {
  if (!dateOfBirth || !onDate) return '';
  const birth = new Date(dateOfBirth);
  const at = new Date(onDate);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return '';
  let age = at.getFullYear() - birth.getFullYear();
  if (at.getMonth() < birth.getMonth() || (at.getMonth() === birth.getMonth() && at.getDate() < birth.getDate())) age--;
  return age >= 0 ? String(age) : '';
}

function addHeading(doc, form, org, cycle, location, woNo, sampleDataNote = '') {
  const x = PAGE.margin;
  const w = PAGE.width - PAGE.margin * 2;
  doc.setDrawColor(...INK);
  doc.setTextColor(0, 0, 0);
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text(form.title, PAGE.width / 2, 14, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(180, 40, 35);
  doc.text(form.rule, PAGE.width / 2, 19, { align: 'center' });

  const top = 23;
  const headerHeight = 22;
  doc.setLineWidth(0.25);
  doc.setDrawColor(...INK);
  doc.rect(x, top, w, headerHeight);
  
  const split1X = x + w * 0.40;
  const split2X = x + w * 0.85;
  
  doc.line(split1X, top, split1X, top + headerHeight);
  doc.line(split2X, top, split2X, top + headerHeight);
  
  doc.line(x, top + headerHeight / 2, split1X, top + headerHeight / 2);
  doc.line(split2X, top + headerHeight / 2, x + w, top + headerHeight / 2);

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  
  doc.text('Name and address of Contractor >', x + 2, top + 7);
  doc.text('Nature and Location Of Work >', x + 2, top + 18);
  
  doc.text('Name & Address of establishment in/under\nwhich contract is carried on', split1X + 2, top + 9, { maxWidth: split2X - split1X - 4 });
  
  doc.text('For the month of :>', split2X + 2, top + 7);
  doc.text('WO.No.', split2X + 2, top + 18);

  doc.setFont('times', 'normal');
  doc.setTextColor(180, 40, 35);
  doc.text(org, x + 55, top + 7);
  
  doc.text(location || '', x + 50, top + 18, { maxWidth: split1X - x - 52 });
  
  const monthStr = cycle?.startDate ? new Date(cycle.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }).replace(' ', "'") : '';
  doc.text(monthStr, split2X + 28, top + 7);
  
  doc.text(woNo || '', split2X + 16, top + 18);

  if (sampleDataNote) {
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(6.5);
    doc.text(sampleDataNote, x, top + headerHeight + 4, { maxWidth: w });
  }
  return top + headerHeight + (sampleDataNote ? 8 : 4);
}

function drawTablePage(doc, { form, org, cycle, location, woNo, headers, widths, rows, rowHeight = 10, blankRows = 3, note = '' }) {
  let y = addHeading(doc, form, org, cycle, location, woNo, note);
  const x = PAGE.margin;
  const usableW = PAGE.width - PAGE.margin * 2;
  const totalRequested = widths.reduce((sum, width) => sum + width, 0);
  const scaledWidths = widths.map(width => width * usableW / totalRequested);
  const headerHeight = headers.length > 14 ? 13 : 17;

  const drawHeader = () => {
    let cellX = x;
    doc.setFillColor(...YELLOW);
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.22);
    for (let index = 0; index < headers.length; index++) {
      const width = scaledWidths[index];
      doc.rect(cellX, y, width, headerHeight, 'FD');
      doc.setFont('times', 'bold');
      doc.setFontSize(headers.length > 14 ? 5 : 6.3);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(String(headers[index]), width - 1.2);
      doc.text(lines.slice(0, 3), cellX + width / 2, y + 3.2, { align: 'center', lineHeightFactor: 0.95 });
      cellX += width;
    }
    y += headerHeight;
    doc.setFillColor(...BLUE);
    let numX = x;
    for (let index = 0; index < headers.length; index++) {
      const width = scaledWidths[index];
      doc.rect(numX, y, width, 5, 'FD');
      doc.setFont('times', 'bold');
      doc.setFontSize(5.5);
      doc.text(String(index + 1), numX + width / 2, y + 3.5, { align: 'center' });
      numX += width;
    }
    y += 5;
  };

  drawHeader();
  const allRows = rows.length ? rows : Array.from({ length: blankRows }, () => headers.map(() => ''));
  for (let rowIndex = 0; rowIndex < allRows.length; rowIndex++) {
    if (y + rowHeight > PAGE.height - 12) {
      doc.addPage('a3', 'landscape');
      y = addHeading(doc, form, org, cycle, location, woNo, note);
      drawHeader();
    }
    const row = allRows[rowIndex];
    let cellX = x;
    for (let index = 0; index < headers.length; index++) {
      const width = scaledWidths[index];
      doc.setDrawColor(...INK);
      doc.setLineWidth(0.18);
      doc.rect(cellX, y, width, rowHeight);
      doc.setFont('times', 'normal');
      doc.setFontSize(headers.length > 14 ? 5 : 6.3);
      const value = row?.[index] === null || row?.[index] === undefined ? '' : String(row[index]);
      const lines = doc.splitTextToSize(value, width - 1.4);
      doc.text(lines.slice(0, Math.max(1, Math.floor(rowHeight / 2.4))), cellX + 0.8, y + 3.3, { lineHeightFactor: 0.96 });
      cellX += width;
    }
    y += rowHeight;
  }
}

function makeMusterRows(records, days) {
  const headers = ['Sl. No.', 'Name of workman', "Father's / Husband's name", 'Sex', 'Age', 'Date employed', 'Nature of work', 'Location', ...days.map(day => String(day.getDate())), 'Total days', 'Remarks'];
  const rows = records.map((record, index) => {
    const byDate = new Map((record.attendance || []).map(item => [String(item.date).slice(0, 10), attendanceCode(item.status)]));
    const daily = days.map(day => byDate.get(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`) || '');
    return [index + 1, record.name, record.fatherName, record.gender, ageOn(record.dateOfBirth, record.endDate), fmtDate(record.joinedDate), record.designation, record.location, ...daily, record.presentDays ?? record.workingDays, ''];
  });
  const widths = [8, 25, 23, 8, 7, 13, 19, 18, ...days.map(() => 5.2), 11, 15];
  return { headers, rows, widths };
}

function formSet(doc, records, organisation) {
  const cycle = { name: records[0]?.payCycleName, startDate: records[0]?.startDate, endDate: records[0]?.endDate };
  const location = records[0]?.location || 'SITC of 11KV External Electrical Work at Sector -41, Kurukshetra';
  const woNo = records[0]?.woNumber || '4300199494';
  const days = cycleDays(records[0] || {});
  const people = records;
  let firstForm = true;
  const entries = (rows, headers, widths, options = {}) => {
    if (!firstForm) doc.addPage('a3', 'landscape');
    firstForm = false;
    return drawTablePage(doc, { org: organisation, cycle, location, woNo, headers, widths, rows, ...options });
  };

  const muster = makeMusterRows(people, days);
  entries(muster.rows, muster.headers, muster.widths, { form: { title: 'FORM XVI - MUSTER ROLL', rule: '[See Rule 78(1)(a)(i)]' }, rowHeight: 9 });

  const wageHeaders = ['Sl.No.', 'Name of Workman', 'UAN NO.', 'DATE OF ENTRY INTO SERVICE', 'Designation/ Nature of Work Man', 'CATEGORY', 'No. of Days Work-ed', 'Total Days for wages payment', 'Daily Rate of Wages/Piece Rate', 'Basic Wages', 'HRA', 'Other Allowance', 'Overtime', 'Other Cash Payment (Nature of payment to be indicated)', 'Total', 'PF @ 12%', 'ESI @ 0.75%', 'Other', 'Deduction if any (indicate nature)', 'Net Amount Paid', 'Signature/\nThumb impression of workman'];
  const wageRows = people.map((r, i) => {
    const basic = Number(r.basicPay || 0);
    const hra = Number(r.hra || 0);
    const otherAllow = (Number(r.grossPay || 0) - basic - hra).toFixed(2);
    const pf = Number(r.pf || r.employeePf || 0);
    const esi = Number(r.esi || r.employeeEsi || 0);
    const otherDed = (Number(r.totalDeductions || 0) - pf - esi).toFixed(2);
    const totalDays = r.workingDays || 0;
    const dailyRate = totalDays ? (Number(r.grossPay) / Number(totalDays)).toFixed(2) : '0';
    return [
      i + 1, r.name, r.uan || r.uanNumber || '', fmtDate(r.joinedDate), r.designation, r.category || 'Skilled',
      r.presentDays ?? totalDays, totalDays, dailyRate, basic.toFixed(2), hra > 0 ? hra.toFixed(2) : '0', 
      otherAllow > 0 ? otherAllow : '0', '0', '0', Number(r.grossPay || 0).toFixed(2), 
      pf > 0 ? pf.toFixed(2) : '0', esi > 0 ? esi.toFixed(2) : '0', 
      otherDed > 0 ? otherDed : '0', '', Number(r.netPay || 0).toFixed(2), ''
    ];
  });
  entries(wageRows, wageHeaders, [6, 17, 15, 12, 17, 11, 8, 8, 11, 10, 10, 10, 10, 13, 11, 10, 10, 10, 12, 11, 14], { form: { title: 'FORM- XVII', rule: '[See Rule 78 (1) (A) (i)]\nREGISTER OF WAGES' }, rowHeight: 12 });

  const workmenHeaders = ['Sl.No.', 'Name and Surname of workman', 'Age and Sex', "Father's / Husband's Name", 'Nature of Employment /Designation', 'Permanent Home Address of Workmen (Village and Tehsil, Taluk, and District)', 'Local Address', 'Date of Commencement of Employment', 'Signature or Thumb Impression of Workman', 'Date of Termination of Employment', 'Reasons for Termination', 'Remarks'];
  const workmenRows = people.map((r, i) => [
    i + 1, r.name, `${ageOn(r.dateOfBirth, r.endDate)} / ${r.gender ? r.gender.charAt(0).toUpperCase() : ''}`, 
    r.fatherName, r.designation, r.address, r.address, fmtDate(r.joinedDate), '', '', '', ''
  ]);
  entries(workmenRows, workmenHeaders, [7, 22, 12, 21, 24, 30, 25, 17, 19, 17, 17, 15], { form: { title: 'FORM- XIII', rule: '[See Rule 75]\nREGISTER OF WORKMEN EMPLOYED BY CONTRACTOR' }, rowHeight: 13 });

  const deductionHeaders = ['Sl. No.', 'Name of workman', "Father's / Husband's name", 'Designation / nature of employment', 'Particulars of damage or loss', 'Date of damage or loss', 'Whether workman showed cause', 'Person who heard explanation', 'Amount imposed', 'No. of instalments', 'Date of recovery', 'Remarks'];
  entries([], deductionHeaders, [8, 20, 20, 21, 27, 17, 24, 22, 14, 14, 17, 18], { form: { title: 'FORM XX', rule: '[See Rule 78(1)(a)(ii)]\nREGISTER OF DEDUCTIONS FOR DAMAGE OR LOSS' }, rowHeight: 13, blankRows: 4, note: 'Entries are left blank because damage/loss deductions are not maintained in the payroll record.' });

  const overtimeHeaders = ['Sl.No.', 'Name', 'Department', 'Date on which Overtime has been worked', 'Extent of Overtime on each Occasion', 'Total Overtime worked or production in case of piece workers', 'Normal Hours', 'Normal Rate or Pay', 'Overtime Rate or Pay', 'Normal Earning', 'Overtime Earning', 'Cash Equivalent of Advantage Accruing through the concessional sale of food against and other articles', 'Total Earning', 'Remarks'];
  entries([], overtimeHeaders, [7, 20, 18, 17, 17, 23, 14, 14, 14, 14, 14, 25, 14, 15], { form: { title: 'FORM-10', rule: '[Prescribed Under Factory Rules 78]\nOVERTIME MUSTER ROLL FOR EXEMPTED WORKER' }, rowHeight: 13, blankRows: 4, note: 'Overtime entries are left blank because the payroll record does not contain approved overtime hours.' });

  const fineHeaders = ['Sl.No.', 'Name', "father's / Husband's Name", 'Sex', 'Department', 'Nature and Date of Offence for which fine Imposed', 'Whether Worker Showed Caused against fine or not', 'Rate of Wages', 'Date of fine imposed', 'Amount of fine imposed (Rs.)', 'Date on which fine Realised', 'Remarks'];
  entries([], fineHeaders, [7, 20, 20, 10, 16, 25, 23, 14, 15, 14, 15, 15], { form: { title: 'FORM- I', rule: '[See Rule 21] (Under Minimum Wages Rules)\nREGISTER OF FINES' }, rowHeight: 13, blankRows: 4, note: 'Fine entries are left blank because fines are not maintained in the payroll record.' });

  const advanceHeaders = ['Sl.No.', 'Name', "Father's Name", 'Department', 'Date and Amount of Advance Made', 'Purpose (s) for which Advance Made', 'No. of Instalment by Which Advance to be repaid', 'Postponement Granted', 'Date on which Total Amount Repaid', 'Remarks'];
  entries([], advanceHeaders, [7, 22, 21, 18, 20, 25, 22, 18, 18, 15], { form: { title: 'FORM-III', rule: 'REGISTER OF ADVANCE MADE TO EMPLOYED PERSON' }, rowHeight: 13, blankRows: 4, note: 'Advance entries are left blank because employee advances are not maintained in the payroll record.' });
}

export function downloadPayrollGovernmentForms(records) {
  if (!Array.isArray(records) || !records.length) throw new Error('No posted salary records were selected.');
  const groups = new Map();
  for (const record of records) {
    const organisation = resolveOrganisation(record.organisation);
    const cycle = `${record.payCycleId || record.payCycleName}:${record.startDate}:${record.endDate}`;
    const key = `${organisation}|${cycle}`;
    const group = groups.get(key) || { organisation, records: [] };
    group.records.push(record);
    groups.set(key, group);
  }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3', compress: true });
  let first = true;
  for (const group of groups.values()) {
    if (!first) doc.addPage('a3', 'landscape');
    first = false;
    formSet(doc, group.records, group.organisation);
  }
  const stem = groups.size === 1 ? [...groups.values()][0].organisation.replace(/[^a-z0-9]+/gi, '-') : 'CeCube-Organisations';
  doc.save(`${stem}-Government-Labour-Forms.pdf`);
}
