import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/ledgers?companyId=xxx
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  try {
    const ledgers = await prisma.ledger.findMany({
      where: companyId ? { companyId } : {},
      include: {
        group: { select: { name: true, nature: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ledgers });
  } catch (err) {
    console.error("Ledgers GET error:", err);
    return NextResponse.json({ error: "Failed to load ledgers" }, { status: 500 });
  }
}
