// app/api/gst/gstr2/route.js
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
      direction: "INWARD",
      vDate: { gte: from, lt: to },
    },
    include: { category: true },
    orderBy: { vDate: "asc" },
  });

  const b2b = vouchers.filter((v) => v.partyGstin && !v.isUnregisteredParty);
  const importGoods = vouchers.filter((v) => v.itemType === "IMPORT_GOODS");
  const importService = vouchers.filter((v) => v.itemType === "IMPORT_SERVICE");
  const cdnr = vouchers.filter((v) => v.itemType === "CDNR");
  const nil = vouchers.filter((v) => v.isNilRated || v.isExempted);

  const missingCount = vouchers.filter((v) => v.gstr2aRecoStatus === "Missing").length;

  const filing = await prisma.gstReturnFiling.findUnique({
    where: {
      stateGstinId_returnType_taxMonth_taxYear: {
        stateGstinId,
        returnType: "GSTR2",
        taxMonth: month,
        taxYear: year,
      },
    },
  });

  return NextResponse.json({
    data: { browse: vouchers, b2b, importGoods, importService, cdnr, nil, missingCount },
    totals: sumTotals(vouchers),
    filing: filing || { gspStatus: "PENDING", isHeld: false },
  });
}

export async function POST(request) {
  const body = await request.json();
  const { companyId, stateGstinId, month, year, action, reco } = body;

  if (reco?.voucherId) {
    await prisma.gstVoucher.update({
      where: { id: reco.voucherId },
      data: {
        ...(reco.gstr2aRecoStatus ? { gstr2aRecoStatus: reco.gstr2aRecoStatus } : {}),
        ...(reco.gstr2bRecoStatus ? { gstr2bRecoStatus: reco.gstr2bRecoStatus } : {}),
      },
    });
  }

  if (!action) {
    return NextResponse.json({ data: { updated: true } });
  }

  if (!companyId || !stateGstinId || !month || !year) {
    return NextResponse.json(
      { error: "companyId, stateGstinId, month and year are required for filing actions" },
      { status: 400 }
    );
  }

  const { from, to } = monthRange(month, year);
  const vouchers = await prisma.gstVoucher.findMany({
    where: { companyId, stateGstinId, direction: "INWARD", vDate: { gte: from, lt: to } },
  });

  const gspStatusMap = { SUBMIT: "SUBMITTED", ROLLBACK: "PENDING" };

  const filing = await prisma.gstReturnFiling.upsert({
    where: {
      stateGstinId_returnType_taxMonth_taxYear: {
        stateGstinId,
        returnType: "GSTR2",
        taxMonth: month,
        taxYear: year,
      },
    },
    update: {
      ...(gspStatusMap[action] ? { gspStatus: gspStatusMap[action] } : {}),
      ...(action === "HOLD" ? { isHeld: true } : {}),
      ...(action === "RELEASE" ? { isHeld: false } : {}),
      summaryJson: sumTotals(vouchers),
    },
    create: {
      companyId,
      stateGstinId,
      returnType: "GSTR2",
      taxMonth: month,
      taxYear: year,
      gspStatus: gspStatusMap[action] || "PENDING",
      isHeld: action === "HOLD",
      summaryJson: sumTotals(vouchers),
    },
  });

  return NextResponse.json({ data: filing });
}
