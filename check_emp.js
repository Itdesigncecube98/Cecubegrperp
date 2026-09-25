const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Depts:', await prisma.department.count());
  console.log('Admins:', await prisma.admin.count());
  console.log('Users:', await prisma.systemUser.count());
  console.log('Employees:', await prisma.employee.count());
}
main().catch(console.error).finally(() => prisma.$disconnect());
