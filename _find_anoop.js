const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const anoop = await p.employee.findMany({
    where: { name: { contains: 'Anoop', mode: 'insensitive' } },
    select: { id: true, empId: true, name: true, email: true, role: true, supervisorId: true, department: true }
  });
  console.log('Anoop matches:', JSON.stringify(anoop, null, 2));

  const roles = await p.employee.groupBy({ by: ['role'], _count: true });
  console.log('Roles:', JSON.stringify(roles, null, 2));

  const supervisors = await p.employee.findMany({
    where: { role: 'SUPERVISOR' },
    select: { id: true, name: true, role: true }
  });
  console.log('Supervisors:', JSON.stringify(supervisors, null, 2));
}

main().finally(() => p.$disconnect());
