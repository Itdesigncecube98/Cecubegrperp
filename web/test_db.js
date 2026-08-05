const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const reqs = await prisma.punchRequest.findMany({ include: { employee: true } });
  require('fs').writeFileSync('all_requests.txt', JSON.stringify(reqs, null, 2));
}
run().catch(console.error).finally(()=>prisma.$disconnect());
