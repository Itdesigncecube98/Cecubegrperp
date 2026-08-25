const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const emp = await prisma.employee.findFirst({
    where: { role: 'EMPLOYEE' },
    select: { id: true, name: true, designation: true, grade: true, position: true }
  });
  console.log(emp);
}
check().catch(console.error).finally(() => prisma.$disconnect());
