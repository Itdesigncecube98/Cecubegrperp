import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const active = searchParams.get("active");

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const categories = await prisma.gstCategory.findMany({
    where: {
      companyId,
      ...(active !== null ? { active: active === "true" } : {}),
    },
    orderBy: { categoryName: "asc" },
  });

  return NextResponse.json({ data: categories });
}

export async function POST(request) {
  const body = await request.json();
  const { companyId, categoryName, gstRate, gstMasterCode, supplyType, active } = body;

  if (!companyId || !categoryName || gstRate === undefined || !gstMasterCode || !supplyType) {
    return NextResponse.json(
      { error: "companyId, categoryName, gstRate, gstMasterCode and supplyType are required" },
      { status: 400 }
    );
  }

  const category = await prisma.gstCategory.create({
    data: {
      companyId,
      categoryName,
      gstRate: Number(gstRate),
      gstMasterCode,
      supplyType,
      active: active ?? true,
    },
  });

  return NextResponse.json({ data: category }, { status: 201 });
}
