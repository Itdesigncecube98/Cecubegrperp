import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/tds/master/[id]
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { section, tdsAccountId, limit, percent, surcharge, cess } = body;

    const updated = await prisma.tDSSection.update({
      where: { id },
      data: {
        section,
        tdsAccountId,
        limit: limit || 0,
        percent: percent || 0,
        surcharge: surcharge || 0,
        cess: cess || 0,
      },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) {
    console.error("TDS master PUT error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/tds/master/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await prisma.tDSSection.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("TDS master DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
