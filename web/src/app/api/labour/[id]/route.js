import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(_request, { params }) {
  try {
    const labour = await prisma.labour.findUnique({ where: { id: params.id } });
    if (!labour) return NextResponse.json({ error: "Labour record not found" }, { status: 404 });
    return NextResponse.json({ data: labour });
  } catch (error) {
    console.error("Error fetching labour:", error);
    return NextResponse.json({ error: "Failed to fetch labour" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const dateFields = ["joiningDate", "leavingDate", "dateOfBirth", "pfStartDate"];
    const data = {};

    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      data[key] = dateFields.includes(key) && value ? new Date(value) : value;
    }
    if (data.dailyWages !== undefined && data.dailyWages !== null) data.dailyWages = Number(data.dailyWages);

    const labour = await prisma.labour.update({ where: { id: params.id }, data });
    return NextResponse.json({ data: labour });
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Employee Code already exists" }, { status: 409 });
    }
    console.error("Error updating labour:", err);
    return NextResponse.json({ error: "Labour record not found or update failed" }, { status: 404 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    await prisma.labour.delete({ where: { id: params.id } });
    return NextResponse.json({ data: { id: params.id, deleted: true } });
  } catch (err) {
    console.error("Error deleting labour:", err);
    return NextResponse.json({ error: "Labour record not found or delete failed" }, { status: 404 });
  }
}
