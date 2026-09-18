import { NextResponse } from "next/server";
import { getLedgerBalances, getGroupedBalances } from "@/lib/ledger-utils";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (!fromDate || !toDate) {
    return NextResponse.json({ error: "fromDate and toDate are required" }, { status: 400 });
  }

  try {
    const fDate = new Date(fromDate);
    const tDate = new Date(toDate);

    const ledgerBalances = await getLedgerBalances({ companyId, fromDate: fDate, toDate: tDate });
    const grouped = await getGroupedBalances(companyId, ledgerBalances);

    // Filter Assets and Liabilities
    // Note: Since grouped returns roots, we filter root groups by nature
    const assetsGroups = grouped.filter(g => g.nature === "ASSET" && g.closingSigned !== 0);
    const liabilitiesGroups = grouped.filter(g => g.nature === "LIABILITY" && g.closingSigned !== 0);

    // Also get flat lists for the simple view
    const flatAssets = ledgerBalances.filter(l => l.nature === "ASSET" && l.closingSigned !== 0);
    const flatLiabilities = ledgerBalances.filter(l => l.nature === "LIABILITY" && l.closingSigned !== 0);

    // Calculate P&L for Net Profit
    const incomes = ledgerBalances.filter(l => l.nature === "INCOME" && l.closingSigned !== 0);
    const expenses = ledgerBalances.filter(l => l.nature === "EXPENSE" && l.closingSigned !== 0);
    
    const totalIncome = incomes.reduce((sum, l) => sum + (l.closingSigned < 0 ? Math.abs(l.closingSigned) : -l.closingSigned), 0);
    const totalExpense = expenses.reduce((sum, l) => sum + l.closingSigned, 0);
    const netProfit = totalIncome - totalExpense;

    // Formatting for the frontend
    // Assets are usually debit (positive), Liabilities are credit (negative)
    return NextResponse.json({
      data: {
        liabilities: flatLiabilities.map(l => ({ name: l.ledgerName, group: l.groupName, amount: l.closingSigned < 0 ? Math.abs(l.closingSigned) : -l.closingSigned })),
        assets: flatAssets.map(a => ({ name: a.ledgerName, group: a.groupName, amount: a.closingSigned })),
        groupedLiabilities: liabilitiesGroups,
        groupedAssets: assetsGroups,
        netProfit,
      }
    });
  } catch (error) {
    console.error("Balance Sheet Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
