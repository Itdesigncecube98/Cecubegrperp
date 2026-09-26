const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Create GST Company
  const gstCompany = await prisma.gstCompany.upsert({
    where: { id: 'demo-company-id' },
    update: {},
    create: {
      id: 'demo-company-id',
      name: 'CeCube Engineering Pvt Ltd',
      financialYearStart: new Date('2024-04-01'),
      financialYearEnd: new Date('2025-03-31'),
    },
  });
  console.log('✓ Created GST Company:', gstCompany.name);

  // 2. Create State GSTINs
  const stateGstins = await Promise.all([
    prisma.stateGstin.upsert({
      where: { gstin: '29AACCC1234C1Z5' },
      update: {},
      create: {
        state: 'Karnataka',
        gstin: '29AACCC1234C1Z5',
        isISD: false,
        companyId: gstCompany.id,
      },
    }),
    prisma.stateGstin.upsert({
      where: { gstin: '33AACCC1234C1Z9' },
      update: {},
      create: {
        state: 'Tamil Nadu',
        gstin: '33AACCC1234C1Z9',
        isISD: false,
        companyId: gstCompany.id,
      },
    }),
  ]);
  console.log('✓ Created State GSTINs:', stateGstins.length);

  // 3. Create GST Categories
  const gstCategories = await Promise.all([
    prisma.gstCategory.create({
      data: {
        categoryName: 'Construction Services - Intrastate',
        gstRate: 18.0,
        gstMasterCode: 'CGST',
        supplyType: 'INTRA_STATE',
        companyId: gstCompany.id,
      },
    }),
    prisma.gstCategory.create({
      data: {
        categoryName: 'Construction Services - Interstate',
        gstRate: 18.0,
        gstMasterCode: 'IGST',
        supplyType: 'INTER_STATE',
        companyId: gstCompany.id,
      },
    }),
    prisma.gstCategory.create({
      data: {
        categoryName: 'Materials - Intrastate',
        gstRate: 18.0,
        gstMasterCode: 'CGST',
        supplyType: 'INTRA_STATE',
        companyId: gstCompany.id,
      },
    }),
  ]);
  console.log('✓ Created GST Categories:', gstCategories.length);

  // 4. Create Accounting Groups (upsert to handle re-runs)
  const groups = await Promise.all([
    // Assets
    prisma.group.upsert({
      where: { name: 'Capital Accounts' },
      update: {},
      create: {
        name: 'Capital Accounts',
        nature: 'ASSET',
        fixedGroup: 'CAPITAL_ACCOUNTS',
        scheduleType: 'SHARE_CAPITAL',
        cashFlowActivity: 'FINANCING',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Current Assets' },
      update: {},
      create: {
        name: 'Current Assets',
        nature: 'ASSET',
        fixedGroup: 'CURRENT_ASSETS',
        scheduleType: 'CASH_AND_CASH_EQUIVALENTS',
        cashFlowActivity: 'OPERATING',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Bank Accounts' },
      update: {},
      create: {
        name: 'Bank Accounts',
        nature: 'ASSET',
        fixedGroup: 'CURRENT_ASSETS',
        scheduleType: 'CASH_AND_CASH_EQUIVALENTS',
        cashFlowActivity: 'NONE',
        parentName: 'Current Assets',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Cash in Hand' },
      update: {},
      create: {
        name: 'Cash in Hand',
        nature: 'ASSET',
        fixedGroup: 'CURRENT_ASSETS',
        scheduleType: 'CASH_AND_CASH_EQUIVALENTS',
        cashFlowActivity: 'NONE',
        parentName: 'Current Assets',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Sundry Debtors' },
      update: {},
      create: {
        name: 'Sundry Debtors',
        nature: 'ASSET',
        fixedGroup: 'CURRENT_ASSETS',
        scheduleType: 'TRADE_RECEIVABLES',
        cashFlowActivity: 'OPERATING',
        parentName: 'Current Assets',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Fixed Assets' },
      update: {},
      create: {
        name: 'Fixed Assets',
        nature: 'ASSET',
        fixedGroup: 'FIXED_ASSETS',
        scheduleType: 'PROPERTY_PLANT_EQUIPMENT',
        cashFlowActivity: 'INVESTING',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Vehicles' },
      update: {},
      create: {
        name: 'Vehicles',
        nature: 'ASSET',
        fixedGroup: 'FIXED_ASSETS',
        scheduleType: 'PROPERTY_PLANT_EQUIPMENT',
        cashFlowActivity: 'INVESTING',
        parentName: 'Fixed Assets',
      },
    }),
    
    // Liabilities
    prisma.group.upsert({
      where: { name: 'Current Liabilities' },
      update: {},
      create: {
        name: 'Current Liabilities',
        nature: 'LIABILITY',
        fixedGroup: 'CURRENT_LIABILITIES',
        scheduleType: 'TRADE_PAYABLES',
        cashFlowActivity: 'OPERATING',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Sundry Creditors' },
      update: {},
      create: {
        name: 'Sundry Creditors',
        nature: 'LIABILITY',
        fixedGroup: 'CURRENT_LIABILITIES',
        scheduleType: 'TRADE_PAYABLES',
        cashFlowActivity: 'OPERATING',
        parentName: 'Current Liabilities',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Loans (Liability)' },
      update: {},
      create: {
        name: 'Loans (Liability)',
        nature: 'LIABILITY',
        fixedGroup: 'LOANS_LIABILITY',
        scheduleType: 'LONG_TERM_BORROWINGS',
        cashFlowActivity: 'FINANCING',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Salary Payable' },
      update: {},
      create: {
        name: 'Salary Payable',
        nature: 'LIABILITY',
        fixedGroup: 'CURRENT_LIABILITIES',
        scheduleType: 'OTHER_CURRENT_LIABILITIES',
        cashFlowActivity: 'OPERATING',
        parentName: 'Current Liabilities',
      },
    }),
    
    // Income
    prisma.group.upsert({
      where: { name: 'Sales Accounts' },
      update: {},
      create: {
        name: 'Sales Accounts',
        nature: 'INCOME',
        fixedGroup: 'SALES_ACCOUNTS',
        scheduleType: 'REVENUE_FROM_OPERATIONS',
        cashFlowActivity: 'OPERATING',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Indirect Income' },
      update: {},
      create: {
        name: 'Indirect Income',
        nature: 'INCOME',
        fixedGroup: 'INCOME_INDIRECT',
        scheduleType: 'OTHER_INCOME',
        cashFlowActivity: 'OPERATING',
      },
    }),
    
    // Expenses
    prisma.group.upsert({
      where: { name: 'Direct Expenses' },
      update: {},
      create: {
        name: 'Direct Expenses',
        nature: 'EXPENSE',
        fixedGroup: 'DIRECT_EXPENSES',
        scheduleType: 'COST_OF_MATERIALS_CONSUMED',
        cashFlowActivity: 'OPERATING',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Indirect Expenses' },
      update: {},
      create: {
        name: 'Indirect Expenses',
        nature: 'EXPENSE',
        fixedGroup: 'INDIRECT_EXPENSES',
        scheduleType: 'OTHER_EXPENSES',
        cashFlowActivity: 'OPERATING',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Salary Expenses' },
      update: {},
      create: {
        name: 'Salary Expenses',
        nature: 'EXPENSE',
        fixedGroup: 'INDIRECT_EXPENSES',
        scheduleType: 'EMPLOYEE_BENEFITS_EXPENSE',
        cashFlowActivity: 'OPERATING',
        parentName: 'Indirect Expenses',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Vehicle Expenses' },
      update: {},
      create: {
        name: 'Vehicle Expenses',
        nature: 'EXPENSE',
        fixedGroup: 'INDIRECT_EXPENSES',
        scheduleType: 'OTHER_EXPENSES',
        cashFlowActivity: 'OPERATING',
        parentName: 'Indirect Expenses',
      },
    }),
    prisma.group.upsert({
      where: { name: 'Imprest Expenses' },
      update: {},
      create: {
        name: 'Imprest Expenses',
        nature: 'EXPENSE',
        fixedGroup: 'INDIRECT_EXPENSES',
        scheduleType: 'OTHER_EXPENSES',
        cashFlowActivity: 'OPERATING',
        parentName: 'Indirect Expenses',
      },
    }),
  ]);
  console.log('✓ Created Accounting Groups:', groups.length);

  // 5. Create Ledgers with Opening Balances
  const ledgers = await Promise.all([
    // Bank Account
    prisma.ledger.upsert({
      where: { name: 'HDFC Bank - Current A/c' },
      update: {},
      create: {
        name: 'HDFC Bank - Current A/c',
        groupName: 'Bank Accounts',
        openingBalanceDr: 500000.00,
        openingBalanceCr: 0,
        isCashOrBank: true,
        companyId: gstCompany.id,
      },
    }),
    // Cash
    prisma.ledger.upsert({
      where: { name: 'Cash in Hand' },
      update: {},
      create: {
        name: 'Cash in Hand',
        groupName: 'Cash in Hand',
        openingBalanceDr: 50000.00,
        openingBalanceCr: 0,
        isCashOrBank: true,
        companyId: gstCompany.id,
      },
    }),
    // Capital
    prisma.ledger.upsert({
      where: { name: 'Capital Account' },
      update: {},
      create: {
        name: 'Capital Account',
        groupName: 'Capital Accounts',
        openingBalanceDr: 0,
        openingBalanceCr: 1000000.00,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    // Vehicles
    prisma.ledger.upsert({
      where: { name: 'Vehicle - Swift Dzire KA01AB1234' },
      update: {},
      create: {
        name: 'Vehicle - Swift Dzire KA01AB1234',
        groupName: 'Vehicles',
        openingBalanceDr: 800000.00,
        openingBalanceCr: 0,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    prisma.ledger.upsert({
      where: { name: 'Vehicle - Bolero TN01CD5678' },
      update: {},
      create: {
        name: 'Vehicle - Bolero TN01CD5678',
        groupName: 'Vehicles',
        openingBalanceDr: 1200000.00,
        openingBalanceCr: 0,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    // Loan
    prisma.ledger.upsert({
      where: { name: 'Vehicle Loan - HDFC' },
      update: {},
      create: {
        name: 'Vehicle Loan - HDFC',
        groupName: 'Loans (Liability)',
        openingBalanceDr: 0,
        openingBalanceCr: 500000.00,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    // Debtors
    prisma.ledger.upsert({
      where: { name: 'ABC Construction Ltd' },
      update: {},
      create: {
        name: 'ABC Construction Ltd',
        groupName: 'Sundry Debtors',
        openingBalanceDr: 250000.00,
        openingBalanceCr: 0,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    // Creditors
    prisma.ledger.upsert({
      where: { name: 'XYZ Suppliers Pvt Ltd' },
      update: {},
      create: {
        name: 'XYZ Suppliers Pvt Ltd',
        groupName: 'Sundry Creditors',
        openingBalanceDr: 0,
        openingBalanceCr: 150000.00,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    // Salary Payable
    prisma.ledger.upsert({
      where: { name: 'Salary Payable' },
      update: {},
      create: {
        name: 'Salary Payable',
        groupName: 'Salary Payable',
        openingBalanceDr: 0,
        openingBalanceCr: 0,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    // Sales
    prisma.ledger.upsert({
      where: { name: 'Construction Revenue' },
      update: {},
      create: {
        name: 'Construction Revenue',
        groupName: 'Sales Accounts',
        openingBalanceDr: 0,
        openingBalanceCr: 0,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    // Expenses
    prisma.ledger.upsert({
      where: { name: 'Salary Expense' },
      update: {},
      create: {
        name: 'Salary Expense',
        groupName: 'Salary Expenses',
        openingBalanceDr: 0,
        openingBalanceCr: 0,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    prisma.ledger.upsert({
      where: { name: 'Vehicle Fuel Expense' },
      update: {},
      create: {
        name: 'Vehicle Fuel Expense',
        groupName: 'Vehicle Expenses',
        openingBalanceDr: 0,
        openingBalanceCr: 0,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    prisma.ledger.upsert({
      where: { name: 'Vehicle Maintenance' },
      update: {},
      create: {
        name: 'Vehicle Maintenance',
        groupName: 'Vehicle Expenses',
        openingBalanceDr: 0,
        openingBalanceCr: 0,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    prisma.ledger.upsert({
      where: { name: 'Imprest Advance' },
      update: {},
      create: {
        name: 'Imprest Advance',
        groupName: 'Current Assets',
        openingBalanceDr: 0,
        openingBalanceCr: 0,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    prisma.ledger.upsert({
      where: { name: 'Office Expenses' },
      update: {},
      create: {
        name: 'Office Expenses',
        groupName: 'Imprest Expenses',
        openingBalanceDr: 0,
        openingBalanceCr: 0,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
    prisma.ledger.upsert({
      where: { name: 'Travel Expenses' },
      update: {},
      create: {
        name: 'Travel Expenses',
        groupName: 'Imprest Expenses',
        openingBalanceDr: 0,
        openingBalanceCr: 0,
        isCashOrBank: false,
        companyId: gstCompany.id,
      },
    }),
  ]);
  console.log('✓ Created Ledgers with Opening Balances:', ledgers.length);

  // 6. Create Sample Vouchers (Vehicle Expense, Salary, Imprest)
  const bankLedger = ledgers.find(l => l.name === 'HDFC Bank - Current A/c');
  const fuelLedger = ledgers.find(l => l.name === 'Vehicle Fuel Expense');
  const maintenanceLedger = ledgers.find(l => l.name === 'Vehicle Maintenance');
  const salaryExpenseLedger = ledgers.find(l => l.name === 'Salary Expense');
  const salaryPayableLedger = ledgers.find(l => l.name === 'Salary Payable');
  const imprestAdvanceLedger = ledgers.find(l => l.name === 'Imprest Advance');
  const travelExpenseLedger = ledgers.find(l => l.name === 'Travel Expenses');

  // Vehicle Fuel Expense
  const voucherFuel = await prisma.voucher.upsert({
    where: { voucherNo: 'PMT/2024/001' },
    update: {},
    create: {
      voucherNo: 'PMT/2024/001',
      voucherDate: new Date('2024-12-01'),
      voucherType: 'PAYMENT',
      narration: 'Fuel expense for vehicle KA01AB1234',
      postingStatus: 'Approved',
      companyId: gstCompany.id,
      entries: {
        create: [
          {
            ledgerName: fuelLedger.name,
            debit: 5000.00,
            credit: 0,
          },
          {
            ledgerName: bankLedger.name,
            debit: 0,
            credit: 5000.00,
          },
        ],
      },
    },
  });

  // Vehicle Maintenance
  const voucherMaintenance = await prisma.voucher.upsert({
    where: { voucherNo: 'PMT/2024/002' },
    update: {},
    create: {
      voucherNo: 'PMT/2024/002',
      voucherDate: new Date('2024-12-05'),
      voucherType: 'PAYMENT',
      narration: 'Vehicle servicing - Bolero TN01CD5678',
      postingStatus: 'Approved',
      companyId: gstCompany.id,
      entries: {
        create: [
          {
            ledgerName: maintenanceLedger.name,
            debit: 8000.00,
            credit: 0,
          },
          {
            ledgerName: bankLedger.name,
            debit: 0,
            credit: 8000.00,
          },
        ],
      },
    },
  });

  // Salary Payment (Journal Entry + Payment)
  // Step 1: Accrue Salary
  const voucherSalaryAccrual = await prisma.voucher.upsert({
    where: { voucherNo: 'JV/2024/001' },
    update: {},
    create: {
      voucherNo: 'JV/2024/001',
      voucherDate: new Date('2024-12-31'),
      voucherType: 'JOURNAL',
      narration: 'Salary accrual for December 2024',
      postingStatus: 'Approved',
      companyId: gstCompany.id,
      entries: {
        create: [
          {
            ledgerName: salaryExpenseLedger.name,
            debit: 500000.00,
            credit: 0,
          },
          {
            ledgerName: salaryPayableLedger.name,
            debit: 0,
            credit: 500000.00,
          },
        ],
      },
    },
  });

  // Step 2: Pay Salary
  const voucherSalaryPayment = await prisma.voucher.upsert({
    where: { voucherNo: 'PMT/2024/003' },
    update: {},
    create: {
      voucherNo: 'PMT/2024/003',
      voucherDate: new Date('2025-01-05'),
      voucherType: 'PAYMENT',
      narration: 'Salary payment for December 2024',
      postingStatus: 'Approved',
      companyId: gstCompany.id,
      entries: {
        create: [
          {
            ledgerName: salaryPayableLedger.name,
            debit: 500000.00,
            credit: 0,
          },
          {
            ledgerName: bankLedger.name,
            debit: 0,
            credit: 500000.00,
          },
        ],
      },
    },
  });

  // Imprest Advance Given
  const voucherImprestAdvance = await prisma.voucher.upsert({
    where: { voucherNo: 'PMT/2024/004' },
    update: {},
    create: {
      voucherNo: 'PMT/2024/004',
      voucherDate: new Date('2024-12-10'),
      voucherType: 'PAYMENT',
      narration: 'Imprest advance to employee for site expenses',
      postingStatus: 'Approved',
      companyId: gstCompany.id,
      entries: {
        create: [
          {
            ledgerName: imprestAdvanceLedger.name,
            debit: 20000.00,
            credit: 0,
          },
          {
            ledgerName: bankLedger.name,
            debit: 0,
            credit: 20000.00,
          },
        ],
      },
    },
  });

  // Imprest Settlement
  const voucherImprestSettlement = await prisma.voucher.upsert({
    where: { voucherNo: 'JV/2024/002' },
    update: {},
    create: {
      voucherNo: 'JV/2024/002',
      voucherDate: new Date('2024-12-20'),
      voucherType: 'JOURNAL',
      narration: 'Imprest settlement - Travel expenses',
      postingStatus: 'Approved',
      companyId: gstCompany.id,
      entries: {
        create: [
          {
            ledgerName: travelExpenseLedger.name,
            debit: 18000.00,
            credit: 0,
          },
          {
            ledgerName: bankLedger.name,
            debit: 2000.00,
            credit: 0,
          },
          {
            ledgerName: imprestAdvanceLedger.name,
            debit: 0,
            credit: 20000.00,
          },
        ],
      },
    },
  });

  console.log('✓ Created Sample Vouchers: 6 (Vehicle, Salary, Imprest)');

  // 7. Create Sample GST Voucher
  const gstVoucher = await prisma.gstVoucher.create({
    data: {
      vDate: new Date('2024-12-15'),
      vNo: 'INV/2024/001',
      vStatus: 'RELEASED',
      billNo: 'BILL-001',
      billDate: new Date('2024-12-15'),
      partyName: 'ABC Construction Ltd',
      partyGstin: '29AABCT1234D1Z5',
      partyState: 'Karnataka',
      direction: 'OUTWARD',
      itemType: 'Service',
      assessableValue: 100000.00,
      cgstAmt: 9000.00,
      sgstAmt: 9000.00,
      igstAmt: 0,
      cessAmt: 0,
      totalTax: 18000.00,
      invoiceAmt: 118000.00,
      categoryId: gstCategories[0].id,
      stateGstinId: stateGstins[0].id,
      companyId: gstCompany.id,
    },
  });
  console.log('✓ Created Sample GST Voucher');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - GST Company: ${gstCompany.name}`);
  console.log(`  - State GSTINs: ${stateGstins.length}`);
  console.log(`  - GST Categories: ${gstCategories.length}`);
  console.log(`  - Accounting Groups: ${groups.length}`);
  console.log(`  - Ledgers: ${ledgers.length}`);
  console.log(`  - Vouchers: 6 (including Vehicle, Salary, Imprest)`);
  console.log(`  - GST Vouchers: 1`);
  console.log('\n✅ Your accounting system is ready!');
  console.log('\n🔑 Use COMPANY_ID: demo-company-id in your pages');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
