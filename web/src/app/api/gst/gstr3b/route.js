// app/api/gst/gstr3b/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/gst-utils";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const stateGstinId = searchParams.get("stateGstinId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (!companyId || !stateGstinId || !fromDate || !toDate) {
    return NextResponse.json(
      { error: "companyId, stateGstinId, fromDate and toDate are required" },
      { status: 400 }
    );
  }

  const range = { gte: new Date(fromDate), lte: new Date(toDate) };

  const outward = await prisma.gstVoucher.findMany({
    where: { companyId, stateGstinId, direction: "OUTWARD", vDate: range },
  });
  const inwardRCM = await prisma.gstVoucher.findMany({
    where: { companyId, stateGstinId, direction: "INWARD", isReverseCharge: true, vDate: range },
  });

  function totalsOf(list) {
    return list.reduce(
      (acc, v) => {
        acc.taxableValue += v.assessableValue || 0;
        acc.centralTax += v.cgstAmt || 0;
        acc.stateTax += v.sgstAmt || 0;
        acc.integratedTax += v.igstAmt || 0;
        acc.cess += v.cessAmt || 0;
        return acc;
      },
      { taxableValue: 0, centralTax: 0, stateTax: 0, integratedTax: 0, cess: 0 }
    );
  }

  const outwardTaxable = totalsOf(outward.filter((v) => !v.isZeroRated && !v.isNilRated && !v.isExempted && !v.isNonGst));
  const outwardZeroRated = totalsOf(outward.filter((v) => v.isZeroRated));
  const outwardNilExempt = totalsOf(outward.filter((v) => v.isNilRated || v.isExempted));
  const inwardReverseCharge = totalsOf(inwardRCM);
  const nonGstOutward = totalsOf(outward.filter((v) => v.isNonGst));

  const interStateUnregistered = outward.filter((v) => v.isUnregisteredParty && v.partyState);
  const interStateComposition = outward.filter((v) => v.isCompositionParty && v.partyState);
  const interStateUin = outward.filter((v) => v.isUinHolder && v.partyState);

  function byState(list) {
    const map = {};
    for (const v of list) {
      const key = v.partyState || "Unknown";
      if (!map[key]) map[key] = { placeOfSupply: key, taxableValue: 0, integratedTax: 0 };
      map[key].taxableValue += v.assessableValue || 0;
      map[key].integratedTax += v.igstAmt || 0;
    }
    return Object.values(map).map((r) => ({
      ...r,
      taxableValue: round2(r.taxableValue),
      integratedTax: round2(r.integratedTax),
    }));
  }

  return NextResponse.json({
    data: {
      section3_1: {
        outwardTaxable,
        outwardZeroRated,
        outwardNilExempt,
        inwardReverseCharge,
        nonGstOutward,
      },
      section3_2: {
        compositionTaxablePersons: byState(interStateComposition),
        uinHolders: byState(interStateUin),
        unregisteredPersons: byState(interStateUnregistered),
      },
    },
  });
}

export async function POST(request) {
  const body = await request.json();
  const { companyId, stateGstinId, fromDate, toDate, action } = body;

  if (!companyId || !stateGstinId || !fromDate || !toDate || !action) {
    return NextResponse.json(
      { error: "companyId, stateGstinId, fromDate, toDate and action are required" },
      { status: 400 }
    );
  }

  const d = new Date(fromDate);
  const taxMonth = d.getUTCMonth() + 1;
  const taxYear = d.getUTCFullYear();

  const filing = await prisma.gstReturnFiling.upsert({
    where: {
      stateGstinId_returnType_taxMonth_taxYear: {
        stateGstinId,
        returnType: "GSTR3B",
        taxMonth,
        taxYear,
      },
    },
    update: {
      gspStatus: action === "SUBMIT" ? "SUBMITTED" : "PENDING",
      submittedAt: action === "SUBMIT" ? new Date() : null,
    },
    create: {
      companyId,
      stateGstinId,
      returnType: "GSTR3B",
      taxMonth,
      taxYear,
      gspStatus: action === "SUBMIT" ? "SUBMITTED" : "PENDING",
      submittedAt: action === "SUBMIT" ? new Date() : null,
    },
  });

  return NextResponse.json({ data: filing });
}
