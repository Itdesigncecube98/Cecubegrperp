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
    
    // Group by scheduleType
    const scheduleTotals = {};
    for (const l of ledgerBalances) {
      if (!l.scheduleType) continue;
      if (!scheduleTotals[l.scheduleType]) {
        scheduleTotals[l.scheduleType] = { id: l.scheduleType, name: l.scheduleType.replace(/_/g, " "), currentYear: 0, previousYear: 0 };
      }
      
      // Usually liabilities are credits (-), assets are debits (+). We can take absolute values for schedule 3 display.
      scheduleTotals[l.scheduleType].currentYear += Math.abs(l.closingSigned);
      // Previous year would require another query, but we leave it as 0 or opening for now
      scheduleTotals[l.scheduleType].previousYear += Math.abs(l.openingSigned);
    }

    return NextResponse.json({ data: Object.values(scheduleTotals) });
  } catch (error) {
    console.error("Schedule 3 Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
