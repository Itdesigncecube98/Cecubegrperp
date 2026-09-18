import Decimal from "decimal.js";
import { prisma } from "./prisma";

const ZERO = new Decimal(0);

/** Dr = positive, Cr = negative, in the ledger's own signed terms. */
export function signedOpening(ledger) {
  const dr = new Decimal(ledger.openingBalanceDr.toString());
  const cr = new Decimal(ledger.openingBalanceCr.toString());
  return dr.minus(cr);
}

/**
 * Flip a signed (Dr-positive) balance into its "natural" positive direction
 * based on account nature. Assets/Expenses are naturally Dr; Liabilities/
 * Income/Equity are naturally Cr.
 */
export function naturalBalance(nature, signedClosing) {
  return nature === "ASSET" || nature === "EXPENSE" ? signedClosing : signedClosing.negated();
}

/**
 * Loads every ledger for a company together with the voucher entries that
 * fall inside [fromDate, toDate], and returns each ledger's closing balance
 * (both signed and "natural") as Decimal instances.
 */
export async function getLedgerClosingBalances(companyId, fromDate, toDate) {
  const ledgers = await prisma.ledger.findMany({
    where: { companyId },
    include: {
      group: true,
      entries: {
        where: {
          voucher: {
            postingStatus: "Approved",
            date: { gte: fromDate, lte: toDate },
          },
        },
        select: { debit: true, credit: true },
      },
    },
  });

  return ledgers.map((ledger) => {
    const movement = ledger.entries.reduce(
      (sum, e) => sum.plus(new Decimal(e.debit.toString())).minus(new Decimal(e.credit.toString())),
      ZERO
    );
    const closingSigned = signedOpening(ledger).plus(movement);
    const closingNatural = naturalBalance(ledger.group.nature, closingSigned);

    return {
      id: ledger.id,
      name: ledger.name,
      group: ledger.group,
      isCashOrBank: ledger.isCashOrBank,
      isStockInHand: ledger.isStockInHand,
      closingSigned,
      closingNatural,
    };
  });
}

/** Sum of natural (positive) closing balances for ledgers under a given FixedGroup. */
export function sumByFixedGroup(ledgerBalances, fixedGroup) {
  return ledgerBalances
    .filter((l) => l.group.fixedGroup === fixedGroup)
    .reduce((sum, l) => sum.plus(l.closingNatural), ZERO);
}

/** Sum of natural (positive) closing balances for ledgers under a given Schedule III type. */
export function sumByScheduleType(ledgerBalances, scheduleType) {
  return ledgerBalances
    .filter((l) => l.group.scheduleType === scheduleType)
    .reduce((sum, l) => sum.plus(l.closingNatural), ZERO);
}

// ---------------------------------------------------------------------------
// SCHEDULE III
// ---------------------------------------------------------------------------

const SCHEDULE_III_LAYOUT = [
  {
    section: "EQUITY AND LIABILITIES",
    groups: [
      {
        heading: "Shareholders' Funds",
        lines: [
          ["Share capital", "SHARE_CAPITAL"],
          ["Reserves and surplus", "RESERVES_AND_SURPLUS"],
          ["Money received against share warrants", "MONEY_RECEIVED_AGAINST_SHARE_WARRANTS"],
        ],
      },
      {
        heading: "Non-current liabilities",
        lines: [
          ["Long-term borrowings", "LONG_TERM_BORROWINGS"],
          ["Deferred tax liabilities (net)", "DEFERRED_TAX_LIABILITIES"],
          ["Other long-term liabilities", "OTHER_LONG_TERM_LIABILITIES"],
          ["Long-term provisions", "LONG_TERM_PROVISIONS"],
        ],
      },
      {
        heading: "Current liabilities",
        lines: [
          ["Short-term borrowings", "SHORT_TERM_BORROWINGS"],
          ["Trade payables", "TRADE_PAYABLES"],
          ["Other current liabilities", "OTHER_CURRENT_LIABILITIES"],
          ["Short-term provisions", "SHORT_TERM_PROVISIONS"],
        ],
      },
    ],
  },
  {
    section: "ASSETS",
    groups: [
      {
        heading: "Non-current assets",
        lines: [
          ["Tangible assets", "TANGIBLE_ASSETS"],
          ["Intangible assets", "INTANGIBLE_ASSETS"],
          ["Capital work-in-progress", "CAPITAL_WORK_IN_PROGRESS"],
          ["Intangible assets under development", "INTANGIBLE_ASSETS_UNDER_DEVELOPMENT"],
          ["Non-current investments", "NON_CURRENT_INVESTMENTS"],
          ["Deferred tax assets (net)", "DEFERRED_TAX_ASSETS"],
          ["Long-term loans and advances", "LONG_TERM_LOANS_AND_ADVANCES"],
          ["Other non-current assets", "OTHER_NON_CURRENT_ASSETS"],
        ],
      },
      {
        heading: "Current assets",
        lines: [
          ["Current investments", "CURRENT_INVESTMENTS"],
          ["Inventories", "INVENTORIES"],
          ["Trade receivables", "TRADE_RECEIVABLES"],
          ["Cash and cash equivalents", "CASH_AND_CASH_EQUIVALENTS"],
          ["Short-term loans and advances", "SHORT_TERM_LOANS_AND_ADVANCES"],
          ["Other current assets", "OTHER_CURRENT_ASSETS"],
        ],
      },
    ],
  },
];

export async function buildSchedule3(companyId, fromDate, toDate) {
  const ledgerBalances = await getLedgerClosingBalances(companyId, fromDate, toDate);

  const sections = SCHEDULE_III_LAYOUT.map((section) => {
    const groups = section.groups.map((g) => {
      const lines = g.lines.map(([label, scheduleType]) => ({
        label,
        scheduleType,
        amount: toNum(sumByScheduleType(ledgerBalances, scheduleType)),
      }));
      const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
      return { heading: g.heading, lines, subtotal };
    });
    const total = round2(groups.reduce((s, g) => s + g.subtotal, 0));
    return { section: section.section, groups, total };
  });

  const equityAndLiabilitiesTotal = sections[0].total;
  const assetsTotal = sections[1].total;

  return {
    fromDate,
    toDate,
    sections,
    totals: {
      equityAndLiabilities: equityAndLiabilitiesTotal,
      assets: assetsTotal,
      difference: round2(equityAndLiabilitiesTotal - assetsTotal),
    },
  };
}

// ---------------------------------------------------------------------------
// CASH FLOW (Receipts & Payments derived from ledger vouchers, then bucketed
// into Operating / Investing / Financing per the counter-party group)
// ---------------------------------------------------------------------------

export async function getCashFlowByActivity(companyId, fromDate, toDate) {
  const vouchers = await prisma.voucher.findMany({
    where: {
      companyId,
      postingStatus: "Approved",
      date: { gte: fromDate, lte: toDate },
    },
    include: {
      entries: {
        include: { ledger: { include: { group: true } } },
      },
    },
  });

  const totals = { OPERATING: ZERO, INVESTING: ZERO, FINANCING: ZERO };

  for (const voucher of vouchers) {
    const cashEntries = voucher.entries.filter((e) => e.ledger.isCashOrBank);
    if (cashEntries.length === 0) continue;

    const cashDelta = cashEntries.reduce(
      (sum, e) => sum.plus(new Decimal(e.debit.toString())).minus(new Decimal(e.credit.toString())),
      ZERO
    );
    if (cashDelta.isZero()) continue;

    const counterEntries = voucher.entries.filter((e) => !e.ledger.isCashOrBank);

    for (const entry of counterEntries) {
      const debit = new Decimal(entry.debit.toString());
      const credit = new Decimal(entry.credit.toString());

      const contribution = cashDelta.isPositive() ? credit.minus(debit) : debit.minus(credit);

      const activity = entry.ledger.group.cashFlowActivity;
      if (activity && totals[activity] !== undefined) {
        totals[activity] = totals[activity].plus(contribution);
      }
    }
  }

  const operating = toNum(totals.OPERATING);
  const investing = toNum(totals.INVESTING);
  const financing = toNum(totals.FINANCING);

  return {
    operating: round2(operating),
    investing: round2(investing),
    financing: round2(financing),
    net: round2(operating + investing + financing),
  };
}

// ---------------------------------------------------------------------------
// RATIO ANALYSIS (Liquidity, Solvency, Profitability, Turnover, Cash Flow)
// ---------------------------------------------------------------------------

export async function buildRatioAnalysis(companyId, fromDate, toDate) {
  const lb = await getLedgerClosingBalances(companyId, fromDate, toDate);

  const currentAssets = toNum(sumByFixedGroup(lb, "CURRENT_ASSETS"));
  const currentLiabilities = toNum(sumByFixedGroup(lb, "CURRENT_LIABILITIES"));
  const stockInHand = toNum(
    lb.filter((l) => l.isStockInHand).reduce((s, l) => s.plus(l.closingNatural), ZERO)
  );
  const fixedAssets = toNum(sumByFixedGroup(lb, "FIXED_ASSETS"));
  const investments = toNum(sumByFixedGroup(lb, "INVESTMENTS"));
  const capitalAccounts = toNum(sumByFixedGroup(lb, "CAPITAL_ACCOUNTS"));
  const loansLiability = toNum(sumByFixedGroup(lb, "LOANS_LIABILITY"));
  const salesAccounts = toNum(sumByFixedGroup(lb, "SALES_ACCOUNTS"));
  const purchaseAccounts = toNum(sumByFixedGroup(lb, "PURCHASE_ACCOUNTS"));
  const directExpenses = toNum(sumByFixedGroup(lb, "DIRECT_EXPENSES"));
  const indirectExpenses = toNum(sumByFixedGroup(lb, "INDIRECT_EXPENSES"));
  const indirectIncome = toNum(sumByFixedGroup(lb, "INCOME_INDIRECT"));

  const cashInHand = toNum(
    lb
      .filter((l) => l.isCashOrBank && /cash/i.test(l.name))
      .reduce((s, l) => s.plus(l.closingNatural), ZERO)
  );
  const bankAccounts = toNum(
    lb
      .filter((l) => l.isCashOrBank && !/cash/i.test(l.name) && l.closingNatural.gte(0))
      .reduce((s, l) => s.plus(l.closingNatural), ZERO)
  );
  const bankODAccounts = toNum(
    lb
      .filter((l) => l.isCashOrBank && l.closingNatural.lt(0))
      .reduce((s, l) => s.plus(l.closingNatural.abs()), ZERO)
  );

  const grossProfit = salesAccounts - stockInHand - purchaseAccounts - directExpenses;
  const netProfit = grossProfit + indirectIncome - indirectExpenses;

  const workingCapital = currentAssets - currentLiabilities;
  const capitalEmployed = capitalAccounts + netProfit;
  const totalAssets = currentAssets + fixedAssets + investments;

  const div = (num, den) => (den ? num / den : 0);

  const liquidity = {
    workingCapital: round2(workingCapital),
    currentRatio: round2(div(currentAssets, currentLiabilities)),
    quickRatio: round2(div(currentAssets - stockInHand, currentLiabilities)),
    workingCapitalTurnover: round2(div(salesAccounts, workingCapital)),
    sundryDebtors: round2(currentAssets),
  };

  const solvency = {
    debtEquityRatio: round2(div(loansLiability, capitalEmployed)),
    cashInHand: round2(cashInHand),
    bankAccounts: round2(bankAccounts),
    bankODAccounts: round2(bankODAccounts),
    stockInHand: round2(stockInHand),
  };

  const profitability = {
    grossProfit: round2(grossProfit),
    grossProfitPct: round2(div(grossProfit, salesAccounts) * 100),
    netProfit: round2(netProfit),
    netProfitPct: round2(div(netProfit, salesAccounts) * 100),
    returnOnInvestmentPct: round2(div(netProfit, capitalEmployed) * 100),
    returnOnWorkingCapitalPct: round2(div(netProfit, workingCapital) * 100),
  };

  const turnover = {
    salesAccounts: round2(salesAccounts),
    purchaseAccounts: round2(purchaseAccounts),
    operatingCostPct: round2(
      div(purchaseAccounts + directExpenses + indirectExpenses, salesAccounts) * 100
    ),
    inventoryTurnover: round2(div(salesAccounts, stockInHand)),
  };

  const cashFlow = await getCashFlowByActivity(companyId, fromDate, toDate);

  const cashFlowRatios = {
    netCashFromOperating: cashFlow.operating,
    netCashFromInvesting: cashFlow.investing,
    netCashFromFinancing: cashFlow.financing,
    netCashFlow: cashFlow.net,
    operatingCashFlowRatio: round2(div(cashFlow.operating, currentLiabilities)),
    cashFlowCoverageRatio: round2(div(cashFlow.operating, loansLiability)),
    cashFlowMarginPct: round2(div(cashFlow.operating, salesAccounts) * 100),
    cashReturnOnCapitalEmployedPct: round2(div(cashFlow.operating, capitalEmployed) * 100),
    cashReturnOnAssetsPct: round2(div(cashFlow.operating, totalAssets) * 100),
    freeCashFlow: round2(cashFlow.operating + cashFlow.investing),
  };

  return {
    fromDate,
    toDate,
    liquidity,
    solvency,
    profitability,
    turnover,
    cashFlowRatios,
  };
}

function toNum(d) {
  return d instanceof Decimal ? d.toNumber() : Number(d);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
