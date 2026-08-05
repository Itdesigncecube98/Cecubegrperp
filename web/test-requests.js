const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const supervisorId = 'cmsfsgdom0001l1043cz79f4l'; // Harmesh
    console.log('Querying punch requests for supervisor:', supervisorId);
    const requests = await prisma.punchRequest.findMany({
      where: {
        employee: { supervisorId: supervisorId }
      },
      include: {
        employee: true
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Requests:', requests);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
