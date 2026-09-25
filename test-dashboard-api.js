const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const now = new Date();
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    console.log("Starting queries...");
    const p1 = await prisma.project.count();
    console.log("p1 done", p1);
    
    const p2 = await prisma.project.count({ where: { status: 'Active' } });
    console.log("p2 done", p2);

    const p3 = await prisma.projectActivity.count({ where: { plannedFinish: { lt: now } } });
    console.log("p3 done", p3);

    const p4 = await prisma.siteDPR.count({ where: { date: { gte: startOfToday, lt: startOfTomorrow } } });
    console.log("p4 done", p4);

    const p5 = await prisma.siteDPR.aggregate({
      where: { date: { gte: startOfToday, lt: startOfTomorrow } },
      _sum: { manpowerPresent: true }
    });
    console.log("p5 done", p5);

    const p6 = await prisma.projectActivity.findMany({
      where: { plannedFinish: { gte: now } },
      orderBy: { plannedFinish: 'asc' },
      take: 5,
      select: { id: true, name: true, plannedFinish: true }
    });
    console.log("p6 done", p6);

    const p7 = await prisma.projectActivity.count();
    console.log("p7 done", p7);
  } catch (e) {
    console.error("ERROR", e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
