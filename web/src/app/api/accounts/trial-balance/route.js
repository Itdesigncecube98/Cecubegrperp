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

    // Format for Trial Balance frontend
    const rows = ledgerBalances.map((ldg, idx) => {
      // openingSigned is DR positive
      const openDr = ldg.openingSigned > 0 ? ldg.openingSigned : 0;
      const openCr = ldg.openingSigned < 0 ? Math.abs(ldg.openingSigned) : 0;

      // closingSigned is DR positive
      const closeDr = ldg.closingSigned > 0 ? ldg.closingSigned : 0;
      const closeCr = ldg.closingSigned < 0 ? Math.abs(ldg.closingSigned) : 0;

      return {
        id: idx + 1,
        code: ldg.ledgerName.substring(0, 4).toUpperCase(), // Mock code
        name: ldg.ledgerName,
        openDr,
        openCr,
        periodDr: ldg.debit,
        periodCr: ldg.credit,
        closeDr,
        closeCr
      };
    });

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Trial Balance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
