const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.locationPing.deleteMany({});
  await prisma.locationRequest.deleteMany({});
  console.log('Deleted all location mock data.');
}
run().catch(console.error).finally(() => prisma.$disconnect());
