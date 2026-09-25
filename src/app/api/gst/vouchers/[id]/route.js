// app/api/gst/vouchers/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request, { params }) {
  const voucher = await prisma.gstVoucher.findUnique({
    where: { id: params.id },
    include: { category: true, stateGstin: true },
  });
  if (!voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  return NextResponse.json({ data: voucher });
}

export async function PUT(request, { params }) {
  const body = await request.json();
  const {
    vDate, vNo, billNo, billDate, partyName, partyGstin, partyState,
    itemType, chargeType, transDetails, costCentre,
    assessableValue, cgstAmt, sgstAmt, igstAmt, cessAmt, vStatus, categoryId,
  } = body;

  const data = {
    ...(vDate !== undefined ? { vDate: new Date(vDate) } : {}),
    ...(vNo !== undefined ? { vNo } : {}),
    ...(billNo !== undefined ? { billNo } : {}),
    ...(billDate !== undefined ? { billDate: billDate ? new Date(billDate) : null } : {}),
    ...(partyName !== undefined ? { partyName } : {}),
    ...(partyGstin !== undefined ? { partyGstin } : {}),
    ...(partyState !== undefined ? { partyState } : {}),
    ...(itemType !== undefined ? { itemType } : {}),
    ...(chargeType !== undefined ? { chargeType } : {}),
    ...(transDetails !== undefined ? { transDetails } : {}),
    ...(costCentre !== undefined ? { costCentre } : {}),
    ...(vStatus !== undefined ? { vStatus } : {}),
    ...(categoryId !== undefined ? { categoryId } : {}),
  };

  if (
    assessableValue !== undefined ||
    cgstAmt !== undefined ||
    sgstAmt !== undefined ||
    igstAmt !== undefined ||
    cessAmt !== undefined
  ) {
    const existing = await prisma.gstVoucher.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

    const av = assessableValue !== undefined ? Number(assessableValue) : existing.assessableValue;
    const cg = cgstAmt !== undefined ? Number(cgstAmt) : existing.cgstAmt;
    const sg = sgstAmt !== undefined ? Number(sgstAmt) : existing.sgstAmt;
    const ig = igstAmt !== undefined ? Number(igstAmt) : existing.igstAmt;
    const ce = cessAmt !== undefined ? Number(cessAmt) : existing.cessAmt;
    const totalTax = cg + sg + ig + ce;

    Object.assign(data, {
      assessableValue: av,
      cgstAmt: cg,
      sgstAmt: sg,
      igstAmt: ig,
      cessAmt: ce,
      totalTax,
      invoiceAmt: av + totalTax,
    });
  }

  try {
    const voucher = await prisma.gstVoucher.update({ where: { id: params.id }, data });
    return NextResponse.json({ data: voucher });
  } catch (err) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    await prisma.gstVoucher.delete({ where: { id: params.id } });
    return NextResponse.json({ data: { id: params.id, deleted: true } });
  } catch (err) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  }
}
