const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

function cleanNum(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.round(val * 100) / 100;
  const s = String(val).replace(/,/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function normalizeName(n) {
  return String(n || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

async function main() {
  console.log('=== STARTING SALARY REVISION IMPORT (w.e.f. 01 Apr 2026) ===\n');

  // 1. Fetch Salary Heads
  const heads = await prisma.salaryHead.findMany({
    include: { headType: true }
  });

  const headMap = {};
  heads.forEach(h => {
    const desc = h.description.trim().toLowerCase();
    const type = h.headType?.name;
    if (desc === 'gross salary') headMap.gross = h.id;
    else if (desc === 'basic') headMap.basic = h.id;
    else if (desc === 'hra') headMap.hra = h.id;
    else if (desc === 'conveyance allowance') headMap.conveyance = h.id;
    else if (desc === 'medical') headMap.medical = h.id;
    else if (desc === 'other allowance') headMap.otherAllowance = h.id;
    else if (desc === 'employer pf') headMap.employerPf = h.id;
    else if (desc === 'employee pf') headMap.employeePf = h.id;
    else if (desc === 'employer esic**') headMap.employerEsic = h.id;
    else if (desc === 'emp. esic**') headMap.employeeEsic = h.id;
  });

  console.log('Resolved Salary Head IDs:', headMap);

  // 2. Fetch all DB Employees
  const dbEmployees = await prisma.employee.findMany({
    select: { id: true, empId: true, name: true }
  });

  const empByCode = new Map();
  const empByName = new Map();
  dbEmployees.forEach(e => {
    if (e.empId) empByCode.set(e.empId.trim().toUpperCase(), e);
    if (e.name) empByName.set(normalizeName(e.name), e);
  });

  // Manual aliases for specific codes/names
  const manualAliases = {
    'CEIPL018': 'CEIPL127', // MD. NEHAL -> CEIPL127
    'CEIPL060': 'CEIPL088', // RAHUL PANDEY -> CEIPL088
    'CEIPL053': 'CEIPL053', // KAUSHAL YADAV -> Kushal Yadav
    'CEIPL032': 'CEIPL032', // RAJNESH KUMAR RANJAN -> Rajnish Kumar Ranjan
  };

  // 3. Read Excel
  const excelPath = 'c:/Users/vensu/Downloads/SALARY BREAK-UP CHECKING LIST (1).xlsx';
  const wb = xlsx.readFile(excelPath);
  const sheet = wb.Sheets['SALARY BREAK-UP 01-04-24'];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const blocks = [];
  let current = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const text = row.map(c => String(c || '').trim()).join(' ');

    if (text.includes('REVISED SALARY STATUS') || text.includes('SALARY STATUS')) {
      if (current && current.ecn) blocks.push(current);
      current = {
        startRow: i,
        ecn: '',
        name: '',
        designation: '',
        basic: 0,
        hra: 0,
        conveyance: 0,
        medical: 0,
        otherAllowance: 0,
        employerPf: 0,
        employeePf: 0,
        employerEsic: 0,
        employeeEsic: 0
      };
      continue;
    }

    if (!current) continue;

    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').trim();
      if ((val.startsWith('ECN') || val === 'ECN') && !current.ecn) {
        if (val.includes(':')) {
          current.ecn = val.split(':')[1].trim();
        } else {
          for (let k = c + 1; k < row.length; k++) {
            let nv = String(row[k] || '').replace(':', '').trim();
            if (nv) { current.ecn = nv; break; }
          }
        }
      }
      if ((val.startsWith('Name') || val.startsWith('NAME') || val === 'Name' || val === 'NAME') && !current.name) {
        if (val.includes(':')) {
          current.name = val.split(':')[1].trim();
        } else {
          for (let k = c + 1; k < row.length; k++) {
            let nv = String(row[k] || '').replace(':', '').trim();
            if (nv) { current.name = nv; break; }
          }
        }
      }
      if ((val.startsWith('Designation') || val.startsWith('DESIGNATION')) && !current.designation) {
        if (val.includes(':')) {
          current.designation = val.split(':')[1].trim();
        } else {
          for (let k = c + 1; k < row.length; k++) {
            let nv = String(row[k] || '').replace(':', '').trim();
            if (nv) { current.designation = nv; break; }
          }
        }
      }
    }

    // Head line parsing
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').trim();
      if (!val) continue;
      const u = val.toUpperCase();

      let matchedHead = null;
      if (u.includes('BASIC PAY') || u.includes('BASIC/VDA') || u === 'BASIC') matchedHead = 'BASIC';
      else if (u === 'HRA' || u.includes('HOUSE RENT')) matchedHead = 'HRA';
      else if (u.includes('TRANSPORT') || u.includes('CONVEYANCE')) matchedHead = 'CONVEYANCE';
      else if (u.includes('PETROL') || u.includes('VEHICLE')) matchedHead = 'CONVEYANCE_EXTRA';
      else if (u.includes('MEDICAL ALLOWANCE')) matchedHead = 'MEDICAL';
      else if (u === 'MEDICAL' && !u.includes('ALLOWANCE')) matchedHead = 'MEDICAL_REIMB';
      else if (u.includes('OTHER ALLOWANCE')) matchedHead = 'OTHER';
      else if (u.includes('SPL. ALLOWANCE') || u.includes('SPECIAL ALLOWANCE')) matchedHead = 'SPECIAL';
      else if (u.includes('MAGAZINE') || u.includes('TELEPHONE') || u.includes('ATTIRES')) matchedHead = 'OTHER_REIMB';
      else if (u.includes('PROVIDENT FUND') || u.includes('EPF')) matchedHead = 'PF';
      else if (u.includes('ESIC')) matchedHead = 'ESIC';

      if (matchedHead) {
        const nums = [];
        for (let k = c + 1; k < row.length; k++) {
          if (row[k] !== null && row[k] !== undefined && String(row[k]).trim() !== '') {
            nums.push(cleanNum(row[k]));
          }
        }

        let revised = 0;
        if (nums.length >= 2) revised = nums[1];
        else if (nums.length === 1) revised = nums[0];

        if (matchedHead === 'BASIC') current.basic = revised;
        else if (matchedHead === 'HRA') current.hra = revised;
        else if (matchedHead === 'CONVEYANCE' || matchedHead === 'CONVEYANCE_EXTRA') current.conveyance += revised;
        else if (matchedHead === 'MEDICAL' || matchedHead === 'MEDICAL_REIMB') current.medical += revised;
        else if (matchedHead === 'OTHER' || matchedHead === 'SPECIAL' || matchedHead === 'OTHER_REIMB') current.otherAllowance += revised;
        else if (matchedHead === 'PF') {
          current.employerPf = revised;
          current.employeePf = revised;
        } else if (matchedHead === 'ESIC') {
          current.employerEsic = revised;
          current.employeeEsic = revised;
        }

        break;
      }
    }
  }

  if (current && current.ecn) blocks.push(current);

  console.log(`Parsed ${blocks.length} employee revision blocks from Excel.\n`);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const b of blocks) {
    let targetCode = b.ecn.trim().toUpperCase();
    if (manualAliases[targetCode]) targetCode = manualAliases[targetCode];

    let dbEmp = empByCode.get(targetCode);
    if (!dbEmp) {
      dbEmp = empByName.get(normalizeName(b.name));
    }

    if (!dbEmp) {
      console.log(`[SKIP] No DB match found for ${b.ecn} (${b.name})`);
      skippedCount++;
      continue;
    }

    const grossSalary = Math.round((b.basic + b.hra + b.conveyance + b.medical + b.otherAllowance) * 100) / 100;
    const monthlyCtc = Math.round((grossSalary + b.employerPf + b.employerEsic) * 100) / 100;
    const annualCtc = Math.round(monthlyCtc * 12 * 100) / 100;

    const componentsToCreate = [
      { salaryHeadId: headMap.gross, amount: grossSalary, rule: '(None)' },
      { salaryHeadId: headMap.basic, amount: b.basic, rule: '(None)' },
      { salaryHeadId: headMap.hra, amount: b.hra, rule: '(None)' },
      { salaryHeadId: headMap.conveyance, amount: b.conveyance, rule: '(None)' },
      { salaryHeadId: headMap.medical, amount: b.medical, rule: '(None)' },
      { salaryHeadId: headMap.otherAllowance, amount: b.otherAllowance, rule: '(None)' }
    ];

    if (b.employerPf > 0) {
      componentsToCreate.push({ salaryHeadId: headMap.employerPf, amount: b.employerPf, rule: '(None)' });
      componentsToCreate.push({ salaryHeadId: headMap.employeePf, amount: b.employeePf, rule: '(None)' });
    }
    if (b.employerEsic > 0) {
      componentsToCreate.push({ salaryHeadId: headMap.employerEsic, amount: b.employerEsic, rule: '(None)' });
      componentsToCreate.push({ salaryHeadId: headMap.employeeEsic, amount: b.employeeEsic, rule: '(None)' });
    }

    // Check if revision with effectiveFrom 2026-04-01 already exists
    const existingRev = await prisma.salaryRevision.findFirst({
      where: {
        employeeId: dbEmp.id,
        effectiveFrom: '2026-04-01'
      }
    });

    if (existingRev) {
      await prisma.$transaction([
        prisma.salaryComponent.deleteMany({ where: { revisionId: existingRev.id } }),
        prisma.salaryRevision.update({
          where: { id: existingRev.id },
          data: {
            remark: 'Salary Revision w.e.f. 01 Apr 2026 (Updated)',
            components: { create: componentsToCreate }
          }
        }),
        prisma.employee.update({
          where: { id: dbEmp.id },
          data: {
            basicSalary: String(b.basic),
            hra: String(b.hra),
            conveyance: String(b.conveyance),
            medical: String(b.medical),
            pfEmployee: String(b.employeePf),
            pfEmployer: String(b.employerPf),
            monthlyCtc: String(monthlyCtc),
            annualCtc: String(annualCtc)
          }
        })
      ]);
      console.log(`[UPDATED] ${dbEmp.empId} (${dbEmp.name}): Basic=${b.basic}, Gross=${grossSalary}, CTC=${monthlyCtc}`);
      updatedCount++;
    } else {
      await prisma.$transaction([
        prisma.salaryRevision.create({
          data: {
            employeeId: dbEmp.id,
            effectiveFrom: '2026-04-01',
            remark: 'Salary Revision w.e.f. 01 Apr 2026',
            components: { create: componentsToCreate }
          }
        }),
        prisma.employee.update({
          where: { id: dbEmp.id },
          data: {
            basicSalary: String(b.basic),
            hra: String(b.hra),
            conveyance: String(b.conveyance),
            medical: String(b.medical),
            pfEmployee: String(b.employeePf),
            pfEmployer: String(b.employerPf),
            monthlyCtc: String(monthlyCtc),
            annualCtc: String(annualCtc)
          }
        })
      ]);
      console.log(`[INSERTED] ${dbEmp.empId} (${dbEmp.name}): Basic=${b.basic}, Gross=${grossSalary}, CTC=${monthlyCtc}`);
      insertedCount++;
    }
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Updated:  ${updatedCount}`);
  console.log(`Skipped:  ${skippedCount}`);
  console.log(`Total:    ${blocks.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
