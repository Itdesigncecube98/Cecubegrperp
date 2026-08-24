const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const regs = await p.punchRequest.findMany({
    where: { type: 'REGULARIZE' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { employee: { select: { name: true } } }
  });
  console.log('Recent REGULARIZE:', JSON.stringify(regs.map(r => ({
    id: r.id, name: r.employee?.name, date: r.date, time: r.time, status: r.status, createdAt: r.createdAt
  })), null, 2));

  for (const r of regs.slice(0, 5)) {
    const att = await p.attendance.findUnique({
      where: { employeeId_date: { employeeId: r.employeeId, date: r.date } }
    });
    console.log(`Attendance for ${r.employee?.name} ${r.date} (${r.status}):`, att ? { status: att.status, timeSlots: att.timeSlots } : null);
  }
}

main().finally(() => p.$disconnect());
