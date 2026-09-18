import { NextResponse } from "next/server";
import { getLedgerBalances } from "@/lib/ledger-utils";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const groupName = searchParams.get("groupName") || undefined;
  const ledgerName = searchParams.get("ledgerName") || undefined;
  const zeroBalance = searchParams.get("zeroBalance") === "true";
  const debitOnly = searchParams.get("debitOnly") === "true";
  const creditOnly = searchParams.get("creditOnly") === "true";
  const view = searchParams.get("view") || "accountList"; // accountList, detailed, monthwise, daywise, global

  if (!fromDate || !toDate) {
    return NextResponse.json({ error: "fromDate and toDate are required" }, { status: 400 });
  }

  try {
    const fDate = new Date(fromDate);
    const tDate = new Date(toDate);

    if (view === "accountList") {
      let rows = await getLedgerBalances({ companyId, fromDate: fDate, toDate: tDate, groupName, ledgerName });
      
      if (!zeroBalance) rows = rows.filter((r) => r.closing.amount !== 0);
      if (debitOnly) rows = rows.filter((r) => r.closing.type === "Dr");
      if (creditOnly) rows = rows.filter((r) => r.closing.type === "Cr");
      
      return NextResponse.json({ data: rows });
    }
    
    // For detailed views (Ledger Browse, Monthwise, Daywise), we need the actual voucher entries
    if (view === "detailed" || view === "monthwise" || view === "daywise") {
      if (!ledgerName) {
        return NextResponse.json({ error: "ledgerName is required for detailed view" }, { status: 400 });
      }

      // 1. Get opening balance for this ledger up to fromDate
      const ledger = await prisma.ledger.findUnique({ where: { name: ledgerName } });
      if (!ledger) return NextResponse.json({ error: "Ledger not found" }, { status: 404 });

      const pastEntries = await prisma.voucherEntry.aggregate({
        where: {
          ledgerName,
          voucher: { postingStatus: "Approved", voucherDate: { lt: fDate } }
        },
        _sum: { debit: true, credit: true }
      });

      const baseOpeningSigned = (ledger.openingBalanceDr || 0) - (ledger.openingBalanceCr || 0);
      const openingSigned = baseOpeningSigned + (pastEntries._sum.debit || 0) - (pastEntries._sum.credit || 0);
      
      // 2. Get entries within date range
      const entries = await prisma.voucherEntry.findMany({
        where: {
          ledgerName,
          voucher: { postingStatus: "Approved", voucherDate: { gte: fDate, lte: tDate } }
        },
        include: { voucher: true },
        orderBy: { voucher: { voucherDate: 'asc' } }
      });

      if (view === "detailed") {
        return NextResponse.json({ data: { openingSigned, entries } });
      }

      if (view === "monthwise") {
        const monthly = {};
        for (const e of entries) {
          const m = format(e.voucher.voucherDate, "MMMM");
          if (!monthly[m]) monthly[m] = { month: m, debit: 0, credit: 0 };
          monthly[m].debit += e.debit;
          monthly[m].credit += e.credit;
        }
        return NextResponse.json({ data: { openingSigned, months: Object.values(monthly) } });
      }

      if (view === "daywise") {
        const daily = {};
        for (const e of entries) {
          const d = format(e.voucher.voucherDate, "dd/MM/yyyy");
          if (!daily[d]) daily[d] = { date: d, debit: 0, credit: 0 };
          daily[d].debit += e.debit;
          daily[d].credit += e.credit;
        }
        return NextResponse.json({ data: { openingSigned, days: Object.values(daily) } });
      }
    }

    if (view === "global") {
      // Just return all ledgers grouped by company for Global view
      const allRows = await getLedgerBalances({ fromDate: fDate, toDate: tDate });
      const companies = {};
      for (const row of allRows) {
        // Assume company is derived from somewhere, mock it for now since Ledger.companyId is optional
        const cid = "Global Company"; 
        if (!companies[cid]) companies[cid] = { companyName: cid, accountType: row.groupName, debit: 0, credit: 0, balance: 0 };
        companies[cid].debit += row.debit;
        companies[cid].credit += row.credit;
      }
      return NextResponse.json({ data: Object.values(companies) });
    }

  } catch (error) {
    console.error("Ledger Browse Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
