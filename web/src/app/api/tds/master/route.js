import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tds/master?companyId=xxx&type=TDS
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const type = searchParams.get("type") || "TDS";

  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  try {
    const sections = await prisma.tDSSection.findMany({
      where: { companyId, type },
      include: {
        tdsAccount: { select: { id: true, name: true } },
      },
      orderBy: { section: "asc" },
    });

    const rows = sections.map((s) => ({
      id: s.id,
      tdsAccountId: s.tdsAccountId,
      tdsAccountName: s.tdsAccount.name,
      section: s.section,
      limit: Number(s.limit),
      percent: Number(s.percent),
      surcharge: Number(s.surcharge),
      cess: Number(s.cess),
    }));

    return NextResponse.json({ rows });
  } catch (err) {
    console.error("TDS master GET error:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

// POST /api/tds/master
export async function POST(request) {
  try {
    const body = await request.json();
    const { companyId, type, section, tdsAccountId, limit, percent, surcharge, cess } = body;

    if (!companyId || !type || !section || !tdsAccountId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await prisma.tDSSection.create({
      data: {
        companyId,
        type,
        section,
        tdsAccountId,
        limit: limit || 0,
        percent: percent || 0,
        surcharge: surcharge || 0,
        cess: cess || 0,
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    console.error("TDS master POST error:", err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
