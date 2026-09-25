export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// GET /api/attendance/top-hours?days=30
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - (days - 1));
    const startStr = startDate.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];


    // Fetch all attendance records in range (exclude only "Not Marked")
    const records = await prisma.attendance.findMany({
      where: {
        date: { gte: startStr, lte: todayStr },
        NOT: { status: "Not Marked" }
      },
      include: { employee: true }
    });


    const empMap = {};
    records.forEach(record => {
      if (!record.employee) return;
      if (record.status === "Not Marked") return;
      const empId = String(record.employeeId);
      if (!empMap[empId]) {
        empMap[empId] = { name: record.employee.name.toUpperCase(), totalHours: 0, daysWorked: 0 };
      }
      let dayHours = 0;
      try {
        const slots = JSON.parse(record.timeSlots || "[]");
        const isToday = record.date === todayStr;
        const nowHHMM = `${String(today.getHours()).padStart(2,"0")}:${String(today.getMinutes()).padStart(2,"0")}`;
        slots.forEach(slot => {
          if (!slot.in) return;
          // If no out punch, use current time for today's records
          const outTime = slot.out || (isToday ? nowHHMM : null);
          if (outTime) {
            const inT = new Date(`1970-01-01T${slot.in}:00`);
            const outT = new Date(`1970-01-01T${outTime}:00`);
            const diff = (outT - inT) / (1000 * 60 * 60);
            if (diff > 0 && diff < 24) dayHours += diff;
          }
        });
      } catch(e) {}
      // Always count the day (employee was marked present/late)
      empMap[empId].daysWorked += 1;
      empMap[empId].totalHours += dayHours;
    });

    const result = Object.values(empMap)
      .map(e => ({ name: e.name, hours: e.daysWorked > 0 ? Number((e.totalHours / e.daysWorked).toFixed(1)) : 0 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

