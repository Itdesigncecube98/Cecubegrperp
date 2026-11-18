const DEFAULT_GROUPS = {
  Asset: 'Assets',
  Liability: 'Liabilities',
  Expense: 'Expenses',
  Income: 'Income'
};

export async function getLedger(tx, name, type) {
  const groupName = DEFAULT_GROUPS[type] || type;
  const group = await tx.accountsAccountGroup.upsert({
    where: { name: groupName },
    update: {},
    create: { name: groupName, type: type || 'Expense' }
  });
  const existing = await tx.accountsLedgerMaster.findFirst({ where: { name, groupId: group.id } });
  if (existing) {
    if (type === 'Capital' && existing.balanceType !== 'Cr') {
      return tx.accountsLedgerMaster.update({ where: { id: existing.id }, data: { balanceType: 'Cr' } });
    }
    return existing;
  }
  return tx.accountsLedgerMaster.create({
    data: {
      name,
      ledgerCode: `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      groupId: group.id,
      balanceType: type === 'Liability' || type === 'Income' || type === 'Capital' ? 'Cr' : 'Dr'
    }
  });
}

export async function postJournal(tx, { voucherNo, type, narration, entries, company, branch, project }) {
  const existing = await tx.accountsJournal.findUnique({ where: { voucherNo } });
  if (existing) return existing;
  const details = [];
  for (const entry of entries) {
    const ledger = await getLedger(tx, entry.ledger, entry.ledgerType);
    details.push({ ledgerId: ledger.id, type: entry.type, amount: entry.amount, narration });
  }
  const totalAmount = details.filter(detail => detail.type === 'Dr').reduce((sum, detail) => sum + detail.amount, 0);
  return tx.accountsJournal.create({
    data: {
      voucherNo, type, narration, company, branch, project, totalAmount, status: 'Posted',
      details: { create: details }
    },
    include: { details: true }
  });
}

export function amount(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export async function getSalaryVoucherAttempts(tx, payCycleId, employeeId, includeDetails = false) {
  const baseVoucherNo = `SALARY-${payCycleId}-${employeeId}`;
  const escapedBase = baseVoucherNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const attemptPattern = new RegExp(`^${escapedBase}(?:-\\d+)?$`);
  const candidates = await tx.accountsJournal.findMany({
    where: { voucherNo: { startsWith: baseVoucherNo } },
    ...(includeDetails
      ? { include: { details: { include: { ledger: { include: { group: true } } } } } }
      : {}),
    orderBy: { createdAt: 'desc' },
  });
  return candidates.filter(journal => attemptPattern.test(journal.voucherNo));
}

export async function getNextSalaryVoucherNo(tx, payCycleId, employeeId) {
  const baseVoucherNo = `SALARY-${payCycleId}-${employeeId}`;
  const attempts = await getSalaryVoucherAttempts(tx, payCycleId, employeeId);
  const active = attempts.find(journal => journal.status !== 'Reversed');
  if (active) return active.voucherNo;
  if (attempts.length === 0) return baseVoucherNo;

  const highestAttempt = attempts.reduce((highest, journal) => {
    const suffix = journal.voucherNo === baseVoucherNo
      ? 1
      : Number(journal.voucherNo.slice(baseVoucherNo.length + 1));
    return Math.max(highest, Number.isFinite(suffix) ? suffix : 0);
  }, 0);
  return `${baseVoucherNo}-${highestAttempt + 1}`;
}