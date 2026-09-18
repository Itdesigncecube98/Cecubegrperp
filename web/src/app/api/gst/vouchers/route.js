// app/api/gst/vouchers/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sumTotals } from "@/lib/gst-utils";

// GET /api/gst/vouchers?companyId=&stateGstinId=&fromDate=&toDate=&direction=INWARD|OUTWARD|ALL
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const stateGstinId = searchParams.get("stateGstinId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const direction = searchParams.get("direction");
  const search = searchParams.get("search");

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const where = {
    companyId,
    ...(stateGstinId ? { stateGstinId } : {}),
    ...(direction && direction !== "ALL" ? { direction } : {}),
    ...(fromDate && toDate
      ? { vDate: { gte: new Date(fromDate), lte: new Date(toDate) } }
      : {}),
    ...(search
      ? {
          OR: [
            { partyName: { contains: search, mode: "insensitive" } },
            { vNo: { contains: search, mode: "insensitive" } },
            { billNo: { contains: search, mode: "insensitive" } },
            { partyGstin: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const vouchers = await prisma.gstVoucher.findMany({
    where,
    include: { category: true, stateGstin: true },
    orderBy: { vDate: "desc" },
  });

  return NextResponse.json({
    data: vouchers,
    totals: sumTotals(vouchers),
    count: vouchers.length,
  });
}

// POST /api/gst/vouchers  (create a voucher)
export async function POST(request) {
  const body = await request.json();
  const {
    companyId,
    stateGstinId,
    categoryId,
    vDate,
    vNo,
    billNo,
    billDate,
    partyName,
    partyGstin,
    partyState,
    direction,
    itemType,
    chargeType,
    transDetails,
    costCentre,
    assessableValue = 0,
    cgstAmt = 0,
    sgstAmt = 0,
    igstAmt = 0,
    cessAmt = 0,
  } = body;

  if (!companyId || !stateGstinId || !vDate || !vNo || !partyName || !direction) {
    return NextResponse.json(
      { error: "companyId, stateGstinId, vDate, vNo, partyName and direction are required" },
      { status: 400 }
    );
  }

  const totalTax = Number(cgstAmt) + Number(sgstAmt) + Number(igstAmt) + Number(cessAmt);
  const invoiceAmt = Number(assessableValue) + totalTax;

  const voucher = await prisma.gstVoucher.create({
    data: {
      companyId,
      stateGstinId,
      categoryId: categoryId || null,
      vDate: new Date(vDate),
      vNo,
      billNo,
      billDate: billDate ? new Date(billDate) : null,
      partyName,
      partyGstin,
      partyState,
      direction,
      itemType,
      chargeType,
      transDetails,
      costCentre,
      assessableValue: Number(assessableValue),
      cgstAmt: Number(cgstAmt),
      sgstAmt: Number(sgstAmt),
      igstAmt: Number(igstAmt),
      cessAmt: Number(cessAmt),
      totalTax,
      invoiceAmt,
    },
  });

  return NextResponse.json({ data: voucher }, { status: 201 });
}
