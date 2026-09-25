import { NextResponse } from "next/server";
import { getLedgerBalances } from "@/lib/ledger-utils";

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

    // Filter incomes and expenses
    const incomes = ledgerBalances.filter(l => l.nature === "INCOME" && l.closingSigned !== 0);
    const expenses = ledgerBalances.filter(l => l.nature === "EXPENSE" && l.closingSigned !== 0);

    // Calculate totals (credit is positive for income, debit is positive for expense)
    const totalIncome = incomes.reduce((sum, l) => sum + (l.closingSigned < 0 ? Math.abs(l.closingSigned) : -l.closingSigned), 0);
    const totalExpense = expenses.reduce((sum, l) => sum + l.closingSigned, 0);

    const netProfit = totalIncome - totalExpense;

    // Formatting for the frontend (which expects expenditure and income arrays)
    return NextResponse.json({
      data: {
        expenditures: expenses.map(e => ({ name: e.ledgerName, amount: e.closingSigned })),
        incomes: incomes.map(i => ({ name: i.ledgerName, amount: i.closingSigned < 0 ? Math.abs(i.closingSigned) : -i.closingSigned })),
        totalExpenditure: totalExpense,
        totalIncome,
        netProfit
      }
    });
  } catch (error) {
    console.error("P&L Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
