const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    // Delete 'Sick'
    await prisma.leaveType.deleteMany({
      where: { name: 'Sick' }
    });
    console.log('Deleted Sick leave type');

    // Update 'Leave without pay' to 'Leave Without Pay' just in case
    await prisma.leaveType.updateMany({
      where: { name: 'Leave without pay' },
      data: { name: 'Leave Without Pay' }
    });
    console.log('Updated LWP capitalization');

    // Check if Leave Without Pay exists, if not create it
    const lwp = await prisma.leaveType.findFirst({
      where: { name: 'Leave Without Pay' }
    });
    if (!lwp) {
      await prisma.leaveType.create({
        data: { name: 'Leave Without Pay', isPaid: false, isActive: true }
      });
      console.log('Created Leave Without Pay');
    }

    console.log('Leave Types Fixed');
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
