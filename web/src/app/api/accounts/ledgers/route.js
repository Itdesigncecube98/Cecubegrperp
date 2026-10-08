export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { amount, getLedger, postJournal } from '@/lib/accounting';

const groupTypes = { Assets: 'Asset', Liabilities: 'Liability', Expense: 'Expense', Expenses: 'Expense', Income: 'Income', Capital: 'Capital' };

function ledgerSection(name) {
  if (/salary/i.test(name)) return 'Salary';
  if (/opening balance/i.test(name)) return 'Opening Balance';
  if (/imprest/i.test(name)) return 'Imprest';
  if (/vehicle|conveyance|taxi|transport|freight/i.test(name)) return 'Vehicle Expenses';
  return 'Opening Balance';
}

export async function GET(request) {
  try {
    const requestedId = new URL(request.url).searchParams.get('id');
    try {
    if (!requestedId) {
    const approvedSalaries = await prisma.payrollRecord.findMany({
        where: { status: 'APPROVED' },
        include: { employee: true, payCycle: true }
      });
    for (const record of approvedSalaries) {
      await prisma.$transaction(async (tx) => {
        const journal = await tx.accountsJournal.findUnique({ where: { voucherNo: `SALARY-${record.payCycleId}-${record.employeeId}` }, include: { details: true } });
        const salaryLedger = await getLedger(tx, `Salary - ${record.payCycle.name} - ${record.employee.name}`, 'Expense');
        if (journal) {
          const debit = journal.details.find(detail => detail.type === 'Dr');
          if (debit) await tx.accountsJournalDetail.update({ where: { id: debit.id }, data: { ledgerId: salaryLedger.id } });
        }
        await postJournal(tx, {
          voucherNo: `SALARY-${record.payCycleId}-${record.employeeId}`,
          type: 'Payment',
          narration: `Approved salary for ${record.employee.name} for ${record.payCycle.name}`,
          entries: [
            { ledger: record.employee.debitAccount || `Salary - ${record.payCycle.name} - ${record.employee.name}`, ledgerType: 'Expense', type: 'Dr', amount: amount(record.netPay) },
            { ledger: record.employee.creditAccount || 'Cash / Bank', ledgerType: 'Asset', type: 'Cr', amount: amount(record.netPay) }
          ]
        });
      }, { timeout: 30000 });
    }

    const approvedImprests = await prisma.imprestRequest.findMany({
        where: { status: { in: ['APPROVED', 'ISSUED'] } },
        include: { employee: true, expenses: true }
      });
    for (const request of approvedImprests) {
        const approvedAmount = amount(request.approvedAmount || request.amountRequested);
        if (approvedAmount > 0) {
          await prisma.$transaction(async (tx) => {
            await postJournal(tx, {
              voucherNo: `IMPREST-APPROVAL-${request.id}`,
              type: 'JV',
              narration: `Approved imprest advance for ${request.employee.name}`,
              project: request.projectSite,
              entries: [
                { ledger: `Imprest Advance - ${request.employee.name}`, ledgerType: 'Asset', type: 'Dr', amount: approvedAmount },
                { ledger: `Imprest Payable - ${request.employee.name}`, ledgerType: 'Liability', type: 'Cr', amount: approvedAmount }
              ]
            });
          }, { timeout: 30000 });
        }
      const total = amount(request.expenses.reduce((sum, expense) => sum + expense.billAmount, 0));
      if (total > 0) {
        await prisma.$transaction(async (tx) => {
          await postJournal(tx, {
            voucherNo: `IMPREST-EXPENSE-${request.id}`,
            type: 'Purchase',
            narration: `Approved vehicle expense for ${request.employee.name}`,
            project: request.projectSite,
            entries: [
              { ledger: request.expenses[0]?.category || 'Vehicle Expenses', ledgerType: 'Expense', type: 'Dr', amount: total },
              { ledger: `Imprest Payable - ${request.employee.name}`, ledgerType: 'Liability', type: 'Cr', amount: total }
            ]
          });
        }, { timeout: 30000 });
      }
    }

    const approvedTrips = await prisma.tripLog.findMany({
      where: { status: { in: ['APPROVED', 'PAID'] } },
      include: { employee: true, vehicle: true }
    });
    for (const trip of approvedTrips) {
      const tripAmount = amount(trip.amount);
      if (tripAmount > 0) {
        await prisma.$transaction(async (tx) => {
          await postJournal(tx, {
            voucherNo: `VEHICLE-TRIP-${trip.id}`,
            type: 'Purchase',
            narration: `Approved vehicle expense for ${trip.employee.name} on ${trip.date || 'trip'}`,
            entries: [
              { ledger: `Vehicle Expenses - ${trip.employee.name}`, ledgerType: 'Expense', type: 'Dr', amount: tripAmount },
              { ledger: `Vehicle Payable - ${trip.employee.name}`, ledgerType: 'Liability', type: 'Cr', amount: tripAmount }
            ]
          });
        }, { timeout: 30000 });
      }
    }

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ImprestOpeningBalance" (
        id SERIAL PRIMARY KEY,
        "employeeId" TEXT NOT NULL UNIQUE,
        "openingBalance" FLOAT NOT NULL DEFAULT 0,
        "asOfDate" TEXT NOT NULL,
        "remarks" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    const openingBalances = await prisma.$queryRaw`
      SELECT ob."employeeId", ob."openingBalance"::float AS amount, e.name
      FROM "ImprestOpeningBalance" ob
      LEFT JOIN "Employee" e ON e.id = ob."employeeId"
      WHERE ob."openingBalance" <> 0
    `;
    for (const opening of openingBalances) {
      const employeeName = opening.name || opening.employeeId;
      const openingAmount = amount(opening.amount);
      await prisma.$transaction(async (tx) => {
        await getLedger(tx, 'Opening Balance Equity', 'Capital');
        await postJournal(tx, {
          voucherNo: `IMPREST-OPENING-${opening.employeeId}`,
          type: 'JV',
          narration: `Imprest opening balance for ${employeeName}`,
          entries: [
            { ledger: `Imprest Opening Balance - ${employeeName}`, ledgerType: 'Asset', type: 'Dr', amount: openingAmount },
            { ledger: 'Opening Balance Equity', ledgerType: 'Capital', type: 'Cr', amount: openingAmount }
          ]
        });
      }, { timeout: 30000 });
    }
    }

    } catch (syncError) {
      console.warn('Historical accounting sync skipped:', syncError.message);
    }

    const [ledgers, accountGroups] = await Promise.all([prisma.accountsLedgerMaster.findMany({
      where: requestedId ? { id: requestedId } : undefined,
      include: {
        group: { include: { parent: true } },
        journalEntries: true
      }
    }), prisma.accountsAccountGroup.findMany({ select: { id: true, name: true, parentId: true } })]);
    const groupById = new Map(accountGroups.map(group => [group.id, group]));
    const getGroupPath = groupId => {
      const path = [];
      let current = groupById.get(groupId);
      while (current && path.length < 32) { path.unshift(current.name); current = current.parentId ? groupById.get(current.parentId) : null; }
      return path;
    };

    // Calculate dynamic balance based on journal entries
    const formattedLedgers = ledgers.map(ledger => {
      let currentBalance = ledger.openingBalance;
      
      ledger.journalEntries.forEach(entry => {
        if (ledger.balanceType === 'Dr') {
          if (entry.type === 'Dr') currentBalance += entry.amount;
          else currentBalance -= entry.amount;
        } else {
          if (entry.type === 'Cr') currentBalance += entry.amount;
          else currentBalance -= entry.amount;
        }
      });

      return {
        id: ledger.id,
        code: ledger.ledgerCode,
        name: ledger.name,
        groupId: ledger.groupId,
        subGroupId: ledger.group?.parentId ? ledger.group.id : '',
        group: ledger.group?.parent?.name || ledger.group?.name || 'Unknown',
        subGroup: ledger.group?.parent ? ledger.group.name : '',
        groupPath: getGroupPath(ledger.groupId),
        company: ledger.company || '',
        legalChequeName: ledger.legalChequeName || '',
        branch: ledger.branch || '',
        contactPerson: ledger.contactPerson || '',
        address: ledger.address || '',
        buildingNo: ledger.buildingNo || '', street: ledger.street || '', city: ledger.city || '',
        district: ledger.district || '', state: ledger.state || '', country: ledger.country || '', pinCode: ledger.pinCode || '',
        mobile: ledger.mobile || '',
        phone: ledger.phone || '',
        email: ledger.email || '',
        gstin: ledger.gstin || '',
        gstApplicable: ledger.gstApplicable,
        pan: ledger.pan || '',
        nature: ledger.nature || '', vatNo: ledger.vatNo || '', corporateIdNo: ledger.corporateIdNo || '',
        panStatus: ledger.panStatus || '', panRefNo: ledger.panRefNo || '',
        itDeclarationStatus: ledger.itDeclarationStatus || '', taxMasterCode: ledger.taxMasterCode || '',
        msmeCategory: ledger.msmeCategory || '', msmeRegistrationNo: ledger.msmeRegistrationNo || '',
        msmeType: ledger.msmeType || '', msmeActivity: ledger.msmeActivity || '',
        acCategory1: ledger.acCategory1 || '', acCategory2: ledger.acCategory2 || '', acCategory3: ledger.acCategory3 || '',
        interestRate: ledger.interestRate || 0, minBalance: ledger.minBalance || 0, remarks: ledger.remarks || '',
        serviceTaxNo: ledger.serviceTaxNo || '', tinNo: ledger.tinNo || '', cstNo: ledger.cstNo || '', localBodyTaxNo: ledger.localBodyTaxNo || '',
        bankDetails: ledger.bankDetails || [], additionalNames: ledger.additionalNames || [],
        documents: requestedId ? (ledger.documents || []) : (ledger.documents || []).map(({ fileData, ...document }) => document),
        openingBalance: ledger.openingBalance,
        type: 'Ledger',
        balance: currentBalance,
        balanceType: ledger.balanceType,
        status: ledger.status
        ,section: ledgerSection(ledger.name)
      };
    });

    return NextResponse.json(formattedLedgers);
  } catch (error) {
    console.error('Error fetching ledgers:', error);
    return NextResponse.json({ error: 'Failed to fetch ledgers' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const groupName = body.group || 'Assets';
    const openingBalance = amount(body.openingBalance);
    const balanceType = body.balanceType === 'Cr' ? 'Cr' : 'Dr';
    if (!name) return NextResponse.json({ error: 'Account name is required' }, { status: 400 });

    const ledger = await prisma.$transaction(async (tx) => {
      let group;
      if (body.subGroupId) {
        group = await tx.accountsAccountGroup.findUnique({ where: { id: String(body.subGroupId) }, include: { parent: true } });
        if (!group || !group.parent || (body.groupId && group.parentId !== String(body.groupId))) throw new Error('Choose a valid subgroup under the selected group.');
      } else if (body.groupId) {
        group = await tx.accountsAccountGroup.findUnique({ where: { id: String(body.groupId) } });
        if (!group) throw new Error('Choose a valid group or subgroup.');
      } else {
        group = await tx.accountsAccountGroup.upsert({
          where: { name: groupName }, update: {},
          create: { name: groupName, type: groupTypes[groupName] || 'Asset' }
        });
      }
      const created = await tx.accountsLedgerMaster.create({
        data: {
          ledgerCode: body.code || `AUTO-${Date.now()}`,
          name,
          groupId: group.id,
          company: String(body.company || '').trim() || null,
          legalChequeName: String(body.legalChequeName || '').trim() || null,
          branch: String(body.branch || '').trim() || null,
          contactPerson: String(body.contactPerson || '').trim() || null,
          address: String(body.address || '').trim() || null,
          buildingNo: String(body.buildingNo || '').trim() || null,
          street: String(body.street || '').trim() || null,
          city: String(body.city || '').trim() || null,
          district: String(body.district || '').trim() || null,
          state: String(body.state || '').trim() || null,
          country: String(body.country || '').trim() || null,
          pinCode: String(body.pinCode || '').trim() || null,
          mobile: String(body.mobile || '').trim() || null,
          phone: String(body.phone || '').trim() || null,
          email: String(body.email || '').trim() || null,
          gstin: String(body.gstin || '').trim() || null,
          gstApplicable: Boolean(body.gstApplicable || body.gstin),
          pan: String(body.pan || '').trim() || null,
          nature: String(body.nature || '').trim() || null,
          vatNo: String(body.vatNo || '').trim() || null,
          corporateIdNo: String(body.corporateIdNo || '').trim() || null,
          panStatus: String(body.panStatus || '').trim() || null,
          panRefNo: String(body.panRefNo || '').trim() || null,
          itDeclarationStatus: String(body.itDeclarationStatus || '').trim() || null,
          taxMasterCode: String(body.taxMasterCode || '').trim() || null,
          msmeCategory: String(body.msmeCategory || '').trim() || null,
          msmeRegistrationNo: String(body.msmeRegistrationNo || '').trim() || null,
          msmeType: String(body.msmeType || '').trim() || null,
          msmeActivity: String(body.msmeActivity || '').trim() || null,
          acCategory1: String(body.acCategory1 || '').trim() || null,
          acCategory2: String(body.acCategory2 || '').trim() || null,
          acCategory3: String(body.acCategory3 || '').trim() || null,
          interestRate: amount(body.interestRate),
          minBalance: amount(body.minBalance),
          remarks: String(body.remarks || '').trim() || null,
          serviceTaxNo: String(body.serviceTaxNo || '').trim() || null,
          tinNo: String(body.tinNo || '').trim() || null,
          cstNo: String(body.cstNo || '').trim() || null,
          localBodyTaxNo: String(body.localBodyTaxNo || '').trim() || null,
          bankDetails: Array.isArray(body.bankDetails) ? body.bankDetails : [],
          additionalNames: Array.isArray(body.additionalNames) ? body.additionalNames : [],
          documents: Array.isArray(body.documents) ? body.documents : [],
          openingBalance,
          balanceType,
          status: 'Active'
        }
      });
      if (openingBalance > 0) {
        await postJournal(tx, {
          voucherNo: `OPENING-${created.id}`,
          type: 'JV',
          narration: `Opening balance for ${name}`,
          entries: [
            { ledger: name, ledgerType: group.type || groupTypes[groupName] || 'Asset', type: balanceType, amount: openingBalance },
            { ledger: 'Opening Balance Equity', ledgerType: 'Capital', type: balanceType === 'Dr' ? 'Cr' : 'Dr', amount: openingBalance }
          ]
        });
      }
      return created;
    }, { timeout: 30000 });
    return NextResponse.json(ledger, { status: 201 });
  } catch (error) {
    console.error('Error creating ledger:', error);
    return NextResponse.json({ error: error.message || 'Failed to create ledger' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Account id is required' }, { status: 400 });
    if (body.subGroupId) {
      const subgroup = await prisma.accountsAccountGroup.findUnique({ where: { id: String(body.subGroupId) }, include: { parent: true } });
      if (!subgroup?.parent || (body.groupId && subgroup.parentId !== String(body.groupId))) {
        return NextResponse.json({ error: 'Choose a valid subgroup under the selected group.' }, { status: 400 });
      }
    } else if (body.groupId) {
      const group = await prisma.accountsAccountGroup.findUnique({ where: { id: String(body.groupId) } });
      if (!group) return NextResponse.json({ error: 'Choose a valid group or subgroup.' }, { status: 400 });
    }
    const ledger = await prisma.accountsLedgerMaster.update({
      where: { id: body.id },
      data: {
        ledgerCode: body.code || undefined,
        name: body.name,
        ...(body.subGroupId ? { groupId: String(body.subGroupId) } : body.groupId ? { groupId: String(body.groupId) } : {}),
        company: String(body.company || '').trim() || null,
        legalChequeName: String(body.legalChequeName || '').trim() || null,
        branch: String(body.branch || '').trim() || null,
        contactPerson: String(body.contactPerson || '').trim() || null,
        address: String(body.address || '').trim() || null,
        buildingNo: String(body.buildingNo || '').trim() || null,
        street: String(body.street || '').trim() || null,
        city: String(body.city || '').trim() || null,
        district: String(body.district || '').trim() || null,
        state: String(body.state || '').trim() || null,
        country: String(body.country || '').trim() || null,
        pinCode: String(body.pinCode || '').trim() || null,
        mobile: String(body.mobile || '').trim() || null,
        phone: String(body.phone || '').trim() || null,
        email: String(body.email || '').trim() || null,
        gstin: String(body.gstin || '').trim() || null,
        gstApplicable: Boolean(body.gstApplicable || body.gstin),
        pan: String(body.pan || '').trim() || null,
        nature: String(body.nature || '').trim() || null,
        vatNo: String(body.vatNo || '').trim() || null,
        corporateIdNo: String(body.corporateIdNo || '').trim() || null,
        panStatus: String(body.panStatus || '').trim() || null,
        panRefNo: String(body.panRefNo || '').trim() || null,
        itDeclarationStatus: String(body.itDeclarationStatus || '').trim() || null,
        taxMasterCode: String(body.taxMasterCode || '').trim() || null,
        msmeCategory: String(body.msmeCategory || '').trim() || null,
        msmeRegistrationNo: String(body.msmeRegistrationNo || '').trim() || null,
        msmeType: String(body.msmeType || '').trim() || null,
        msmeActivity: String(body.msmeActivity || '').trim() || null,
        acCategory1: String(body.acCategory1 || '').trim() || null,
        acCategory2: String(body.acCategory2 || '').trim() || null,
        acCategory3: String(body.acCategory3 || '').trim() || null,
        interestRate: amount(body.interestRate),
        minBalance: amount(body.minBalance),
        remarks: String(body.remarks || '').trim() || null,
        serviceTaxNo: String(body.serviceTaxNo || '').trim() || null,
        tinNo: String(body.tinNo || '').trim() || null,
        cstNo: String(body.cstNo || '').trim() || null,
        localBodyTaxNo: String(body.localBodyTaxNo || '').trim() || null,
        bankDetails: Array.isArray(body.bankDetails) ? body.bankDetails : [],
        additionalNames: Array.isArray(body.additionalNames) ? body.additionalNames : [],
        documents: Array.isArray(body.documents) ? body.documents : [],
        openingBalance: amount(body.openingBalance),
        balanceType: body.balanceType === 'Cr' ? 'Cr' : 'Dr'
      }
    });
    return NextResponse.json(ledger);
  } catch (error) {
    console.error('Error updating ledger:', error);
    return NextResponse.json({ error: error.message || 'Failed to update ledger' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Account ID is required.' }, { status: 400 });
    const ledger = await prisma.accountsLedgerMaster.findUnique({
      where: { id },
      include: { _count: { select: { journalEntries: true, tdsAdjustments: true } } },
    });
    if (!ledger) return NextResponse.json({ error: 'Contractor / party was not found.' }, { status: 404 });
    if (ledger._count.journalEntries || ledger._count.tdsAdjustments) {
      return NextResponse.json({ error: 'This contractor / party has accounting entries and cannot be deleted.' }, { status: 409 });
    }
    await prisma.accountsLedgerMaster.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Accounts party delete failed:', error);
    return NextResponse.json({ error: 'Unable to delete contractor / party.' }, { status: 500 });
  }
}
