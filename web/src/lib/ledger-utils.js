import { prisma } from "@/lib/prisma";

// Net closing balance given opening (signed, DR positive) + debit/credit movement
export function closingBalance(openingSigned, debit, credit) {
  return openingSigned + debit - credit;
}

export function formatDrCr(signedAmount) {
  return {
    amount: Math.abs(signedAmount),
    type: signedAmount >= 0 ? "Dr" : "Cr",
  };
}

// Loads all ledgers (optionally filtered) with their voucher-entry
// movement within [fromDate, toDate], only counting Approved vouchers.
export async function getLedgerBalances({
  companyId,
  fromDate,
  toDate,
  groupName,
  ledgerName,
  postingStatus = "Approved",
}) {
  const ledgers = await prisma.ledger.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(groupName ? { groupName } : {}),
      ...(ledgerName ? { name: ledgerName } : {}),
    },
    include: { group: true },
  });

  const entries = await prisma.voucherEntry.groupBy({
    by: ["ledgerName"],
    where: {
      ...(companyId ? { ledger: { companyId } } : {}),
      voucher: {
        postingStatus,
        voucherDate: { gte: fromDate, lte: toDate },
      },
    },
    _sum: { debit: true, credit: true },
  });

  const movementByLedger = Object.fromEntries(
    entries.map((e) => [e.ledgerName, { debit: e._sum.debit || 0, credit: e._sum.credit || 0 }])
  );

  return ledgers.map((ldg) => {
    const move = movementByLedger[ldg.name] || { debit: 0, credit: 0 };
    // openingBalanceDr is positive, openingBalanceCr is negative to make it DR-positive
    const openingSigned = (ldg.openingBalanceDr || 0) - (ldg.openingBalanceCr || 0);
    const closingSigned = closingBalance(openingSigned, move.debit, move.credit);
    
    return {
      ledgerName: ldg.name,
      groupName: ldg.groupName,
      nature: ldg.group.nature,
      fixedGroup: ldg.group.fixedGroup,
      scheduleType: ldg.group.scheduleType,
      isCashOrBank: ldg.isCashOrBank,
      opening: formatDrCr(openingSigned),
      debit: move.debit,
      credit: move.credit,
      closing: formatDrCr(closingSigned),
      openingSigned,
      closingSigned
    };
  });
}

// Groups flat ledger balances into their Group tree, summing at every level
export async function getGroupedBalances(companyId, ledgerBalances) {
  const groups = await prisma.group.findMany();
  const groupMap = Object.fromEntries(groups.map((g) => [g.name, { ...g, children: [], ledgers: [] }]));
  const roots = [];

  for (const g of groups) {
    if (g.parentName && groupMap[g.parentName]) {
      groupMap[g.parentName].children.push(groupMap[g.name]);
    } else {
      roots.push(groupMap[g.name]);
    }
  }

  for (const bal of ledgerBalances) {
    if (groupMap[bal.groupName]) {
      groupMap[bal.groupName].ledgers.push(bal);
    }
  }

  function sumNode(node) {
    let opening = 0, debit = 0, credit = 0;
    for (const ldg of node.ledgers) {
      opening += ldg.openingSigned;
      debit += ldg.debit;
      credit += ldg.credit;
    }
    for (const child of node.children) {
      const childTotals = sumNode(child);
      opening += childTotals.openingSigned;
      debit += childTotals.debit;
      credit += childTotals.credit;
    }
    const closingSigned = opening + debit - credit;
    node.opening = formatDrCr(opening);
    node.debit = debit;
    node.credit = credit;
    node.closing = formatDrCr(closingSigned);
    node.openingSigned = opening;
    node.closingSigned = closingSigned;
    return { openingSigned: opening, debit, credit };
  }

  roots.forEach(sumNode);
  return roots;
}

export function monthOrRange(fromDate, toDate) {
  return { gte: new Date(fromDate), lte: new Date(toDate) };
}

// Rolls flat ledger balances up into one row per FixedGroup
export function aggregateByFixedGroup(ledgerBalances) {
  const totals = {};
  
  for (const acc of ledgerBalances) {
    if (!acc.fixedGroup) continue;
    if (!totals[acc.fixedGroup]) {
      totals[acc.fixedGroup] = { fixedGroup: acc.fixedGroup, openingSigned: 0, debit: 0, credit: 0 };
    }
    
    const t = totals[acc.fixedGroup];
    t.openingSigned += acc.openingSigned;
    t.debit += acc.debit;
    t.credit += acc.credit;
  }
  
  for (const fg of Object.keys(totals)) {
    const t = totals[fg];
    const closingSigned = t.openingSigned + t.debit - t.credit;
    t.opening = formatDrCr(t.openingSigned);
    t.closing = formatDrCr(closingSigned);
    t.closingSigned = closingSigned;
  }
  return totals;
}
