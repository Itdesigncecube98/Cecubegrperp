import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tds-master?companyId=xxx&type=TDS
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const type = searchParams.get("type") || "TDS";

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const sections = await prisma.tDSSection.findMany({
    where: { companyId, type },
    include: { tdsAccount: { select: { id: true, name: true } } },
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
    net: Number(s.percent) + Number(s.surcharge) + Number(s.cess),
  }));

  return NextResponse.json({ rows });
}

// POST /api/tds-master  -> upsert (bulk save)
// body: { companyId, type, rows: [{ id?, tdsAccountId, section, limit, percent, surcharge, cess }] }
export async function POST(request) {
  const body = await request.json();
  const { companyId, type, rows } = body;

  if (!companyId || !type || !Array.isArray(rows)) {
    return NextResponse.json(
      { error: "companyId, type and rows[] are required" },
      { status: 400 }
    );
  }

  try {
    const saved = await prisma.$transaction(
      rows.map((row) =>
        row.id
          ? prisma.tDSSection.update({
              where: { id: row.id },
              data: {
                tdsAccountId: row.tdsAccountId,
                section: row.section,
                limit: row.limit || 0,
                percent: row.percent || 0,
                surcharge: row.surcharge || 0,
                cess: row.cess || 0,
              },
            })
          : prisma.tDSSection.create({
              data: {
                companyId,
                type,
                tdsAccountId: row.tdsAccountId,
                section: row.section,
                limit: row.limit || 0,
                percent: row.percent || 0,
                surcharge: row.surcharge || 0,
                cess: row.cess || 0,
              },
            })
      )
    );

    return NextResponse.json({ ok: true, saved });
  } catch (err) {
    console.error("TDS master save error:", err);
    return NextResponse.json({ error: "Failed to save TDS sections" }, { status: 500 });
  }
}
