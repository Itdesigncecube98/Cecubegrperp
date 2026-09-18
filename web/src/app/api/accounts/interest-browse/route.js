import { NextResponse } from "next/server";
import { getLedgerBalances } from "@/lib/ledger-utils";
import { differenceInDays } from "date-fns";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const groupId = searchParams.get("groupId"); // Might be filtering by "LOANS_LIABILITY" etc.

  if (!fromDate || !toDate) {
    return NextResponse.json({ error: "fromDate and toDate are required" }, { status: 400 });
  }

  try {
    const fDate = new Date(fromDate);
    const tDate = new Date(toDate);
    const daysInPeriod = differenceInDays(tDate, fDate) || 1;

    // Optional: Only calculate interest for specific groups like Loans
    const ledgerBalances = await getLedgerBalances({ companyId, fromDate: fDate, toDate: tDate });
    
    // Default mock interest rate since there's no interest rate in the schema
    const DEFAULT_RATE = 10; 

    const rows = ledgerBalances
      .filter(l => l.closingSigned !== 0) // Only ledgers with a balance
      .map((l, idx) => {
        const principal = Math.abs(l.closingSigned);
        // Interest = Principal * Rate * (Days / 365)
        const interest = (principal * DEFAULT_RATE * daysInPeriod) / (100 * 365);
        
        return {
          id: idx + 1,
          accountName: l.ledgerName,
          openingBal: l.openingSigned > 0 ? l.openingSigned : Math.abs(l.openingSigned), // Mock absolute for display
          principal: principal,
          interestRate: DEFAULT_RATE,
          days: daysInPeriod,
          interest: interest,
          totalAmount: principal + interest
        };
      });

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Interest Browse Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
