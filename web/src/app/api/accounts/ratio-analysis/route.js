import { NextResponse } from "next/server";
import { getLedgerBalances, aggregateByFixedGroup } from "@/lib/ledger-utils";

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
    const fixedGroups = aggregateByFixedGroup(ledgerBalances);

    // Helpers to get amounts safely. Assets are usually DR (+), Liabilities are CR (-)
    const getAmt = (groupKey) => {
      const g = fixedGroups[groupKey];
      if (!g) return 0;
      return Math.abs(g.closingSigned); // For ratios we usually deal in absolutes
    };

    const currentAssets = getAmt("CURRENT_ASSETS");
    const currentLiabilities = getAmt("CURRENT_LIABILITIES");
    const inventory = getAmt("CLOSING_STOCK") || 0; // If inventory isn't a fixed group but a ledger
    const totalLiabilities = getAmt("LOANS_LIABILITY") + currentLiabilities;
    const equity = getAmt("CAPITAL_ACCOUNTS");

    const workingCapital = currentAssets - currentLiabilities;
    const currentRatio = currentLiabilities === 0 ? 0 : (currentAssets / currentLiabilities);
    const quickRatio = currentLiabilities === 0 ? 0 : ((currentAssets - inventory) / currentLiabilities);
    const debtEquityRatio = equity === 0 ? 0 : (totalLiabilities / equity);

    // Example formatted for the frontend
    const ratios = [
      { id: 1, type: "liquidity", metric: "Working Capital", formula: "Current Assets - Current Liabilities", value: workingCapital, isCurrency: true },
      { id: 2, type: "liquidity", metric: "Current Ratio", formula: "Current Assets / Current Liabilities", value: currentRatio, isCurrency: false },
      { id: 3, type: "liquidity", metric: "Quick Ratio", formula: "(Current Assets - Inventory) / Current Liabilities", value: quickRatio, isCurrency: false },
      { id: 4, type: "solvency", metric: "Debt to Equity Ratio", formula: "Total Liabilities / Shareholders' Equity", value: debtEquityRatio, isCurrency: false },
    ];

    return NextResponse.json({ data: ratios });
  } catch (error) {
    console.error("Ratio Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
