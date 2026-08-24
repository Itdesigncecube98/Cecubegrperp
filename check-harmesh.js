const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHarmesh() {
  const emps = await prisma.employee.findMany();
  const harmesh = emps.find(e => e.name.toLowerCase().includes('harmesh'));
  if (harmesh) {
    console.log('Harmesh found:', harmesh);
    const isSupervisor = emps.some(e => e.supervisorId === harmesh.id);
    console.log('Is Harmesh a supervisor?', isSupervisor);
    
    // Let's also check if anyone's supervisorId is set to anything
    const employeesWithSupervisor = emps.filter(e => e.supervisorId !== null);
    console.log('Employees with supervisor:', employeesWithSupervisor);
  } else {
    console.log('Harmesh not found');
  }
}
checkHarmesh();
