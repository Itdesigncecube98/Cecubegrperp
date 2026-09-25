export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - (days - 1));
    const startStr = startDate.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    const records = await prisma.attendance.findMany({
      where: {
        date: { gte: startStr, lte: todayStr },
        status: { in: ["Present", "Late"] }
      },
      include: { employee: true }
    });

    const empMap = {};
    records.forEach(record => {
      if (!record.employee) return;
      const empId = String(record.employeeId);
      if (!empMap[empId]) {
        empMap[empId] = { name: record.employee.name.toUpperCase(), presentDays: 0 };
      }
      empMap[empId].presentDays += 1;
    });

    const result = Object.values(empMap)
      .sort((a, b) => b.presentDays - a.presentDays)
      .slice(0, 10); // Show top 10

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
