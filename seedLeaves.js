const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leaveTypes = [
    { name: 'Paid leave', isPaid: true, isActive: true },
    { name: 'Casual', isPaid: true, isActive: true },
    { name: 'Sick', isPaid: true, isActive: true },
    { name: 'Leave without pay', isPaid: false, isActive: true },
    { name: 'Maternity', isPaid: true, isActive: true }
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.create({
      data: lt
    });
  }
  
  console.log('Seed completed.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
