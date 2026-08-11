const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const balances = await prisma.leaveBalance.findMany();
    
    for (const b of balances) {
      let updateData = {};
      let currentLwp = b.leaveWithoutPay || 0;
      let needsUpdate = false;

      if (b.casualLeaves < 0) {
        currentLwp += Math.abs(b.casualLeaves);
        updateData.casualLeaves = 0;
        needsUpdate = true;
      }

      if (b.earnedLeaves < 0) {
        currentLwp += Math.abs(b.earnedLeaves);
        updateData.earnedLeaves = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updateData.leaveWithoutPay = currentLwp;
        await prisma.leaveBalance.update({
          where: { id: b.id },
          data: updateData
        });
        console.log(`Fixed negative balance for employeeId: ${b.employeeId}`);
      }
    }
    
    console.log('Done fixing negative balances.');
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
