import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request, { params }) {
  const category = await prisma.gstCategory.findUnique({ where: { id: params.id } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  return NextResponse.json({ data: category });
}

export async function PUT(request, { params }) {
  const body = await request.json();
  const { categoryName, gstRate, gstMasterCode, supplyType, active } = body;

  try {
    const category = await prisma.gstCategory.update({
      where: { id: params.id },
      data: {
        ...(categoryName !== undefined ? { categoryName } : {}),
        ...(gstRate !== undefined ? { gstRate: Number(gstRate) } : {}),
        ...(gstMasterCode !== undefined ? { gstMasterCode } : {}),
        ...(supplyType !== undefined ? { supplyType } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });
    return NextResponse.json({ data: category });
  } catch (err) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    await prisma.gstCategory.delete({ where: { id: params.id } });
    return NextResponse.json({ data: { id: params.id, deleted: true } });
  } catch (err) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
}
