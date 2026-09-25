// app/api/gst/gstr1/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthRange, sumTotals } from "@/lib/gst-utils";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const stateGstinId = searchParams.get("stateGstinId");
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));

  if (!companyId || !stateGstinId || !month || !year) {
    return NextResponse.json(
      { error: "companyId, stateGstinId, month and year are required" },
      { status: 400 }
    );
  }

  const { from, to } = monthRange(month, year);

  const vouchers = await prisma.gstVoucher.findMany({
    where: {
      companyId,
      stateGstinId,
      direction: "OUTWARD",
      vDate: { gte: from, lt: to },
    },
    include: { category: true },
    orderBy: { vDate: "asc" },
  });

  const b2b = vouchers.filter((v) => v.partyGstin && !v.isUnregisteredParty && !v.isZeroRated);
  const b2cl = vouchers.filter((v) => v.isUnregisteredParty && v.assessableValue > 250000 && v.partyState);
  const b2cs = vouchers.filter((v) => v.isUnregisteredParty && !(v.assessableValue > 250000));
  const exp = vouchers.filter((v) => v.isZeroRated);
  const nilExempt = vouchers.filter((v) => v.isNilRated || v.isExempted || v.isNonGst);

  const filing = await prisma.gstReturnFiling.findUnique({
    where: {
      stateGstinId_returnType_taxMonth_taxYear: {
        stateGstinId,
        returnType: "GSTR1",
        taxMonth: month,
        taxYear: year,
      },
    },
  });

  return NextResponse.json({
    data: {
      browse: vouchers,
      b2b,
      b2cl,
      b2cs,
      exp,
      nilExempt,
    },
    totals: sumTotals(vouchers),
    filing: filing || { gspStatus: "PENDING", isHeld: false },
  });
}

export async function POST(request) {
  const body = await request.json();
  const { companyId, stateGstinId, month, year, action } = body;

  if (!companyId || !stateGstinId || !month || !year || !action) {
    return NextResponse.json(
      { error: "companyId, stateGstinId, month, year and action are required" },
      { status: 400 }
    );
  }

  const { from, to } = monthRange(month, year);
  const vouchers = await prisma.gstVoucher.findMany({
    where: { companyId, stateGstinId, direction: "OUTWARD", vDate: { gte: from, lt: to } },
  });

  const gspStatusMap = {
    SUBMIT: "SUBMITTED",
    ROLLBACK: "PENDING",
  };

  const filing = await prisma.gstReturnFiling.upsert({
    where: {
      stateGstinId_returnType_taxMonth_taxYear: {
        stateGstinId,
        returnType: "GSTR1",
        taxMonth: month,
        taxYear: year,
      },
    },
    update: {
      ...(gspStatusMap[action] ? { gspStatus: gspStatusMap[action] } : {}),
      ...(action === "HOLD" ? { isHeld: true } : {}),
      ...(action === "RELEASE" ? { isHeld: false } : {}),
      ...(action === "SUBMIT" ? { submittedAt: new Date() } : {}),
      summaryJson: sumTotals(vouchers),
    },
    create: {
      companyId,
      stateGstinId,
      returnType: "GSTR1",
      taxMonth: month,
      taxYear: year,
      gspStatus: gspStatusMap[action] || "PENDING",
      isHeld: action === "HOLD",
      submittedAt: action === "SUBMIT" ? new Date() : null,
      summaryJson: sumTotals(vouchers),
    },
  });

  return NextResponse.json({ data: filing });
}
