const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const defaultProjects = [
    {
      name: 'Unitech GBP Servicing of Busduct for DG Sets HVAC',
      state: 'Haryana',
      company: 'CeCube Engineering India Private Limited',
      library: 'Unitech Library',
      builtUpArea: '826800.0000',
      saleableArea: '0.0000',
      startDate: '31/12/2025 00:00:00',
      endDate: '31/12/2025 00:00:00',
      cost: '0.0000\n01/01/1900'
    },
    {
      name: '"Godrej Panipat Consultancy Charge for EP Approval',
      state: 'Haryana',
      company: 'CeCube Engineering India Private Limited',
      library: 'Consultancy',
      builtUpArea: '3680000.0000',
      saleableArea: '0.0000',
      startDate: '20/12/2025 00:00:00',
      endDate: '20/12/2025 00:00:00',
      cost: '0.0000\n01/01/1900'
    },
    {
      name: '10KWP Solar Power Plant at House No 608 Jhajjar',
      state: 'Haryana',
      company: 'CeCube Green Energy Private Limited',
      library: 'CeCube Green Energy',
      builtUpArea: '430000.0000',
      saleableArea: '0.0000',
      startDate: '07/08/2025 00:00:00',
      endDate: '30/08/2025 00:00:00',
      cost: '0.0000\n01/01/1900'
    }
  ];

  console.log('Seeding projects...');
  for (const p of defaultProjects) {
    await prisma.project.create({ data: p });
  }
  console.log('Projects seeded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
