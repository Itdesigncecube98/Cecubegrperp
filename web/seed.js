const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = ['CeCube Engineering India Private Limited', 'CeCube Green Energy Private Limited', 'Godrej Properties Ltd', 'Unitech Group'];
  const libraries = ['Unitech Library', 'Consultancy', 'CeCube Green Energy', 'Default Library'];
  const categories1 = ['Residential', 'Commercial', 'Industrial', 'Infrastructure'];
  const categories2 = ['High Rise', 'Low Rise', 'Township', 'Warehouse'];
  const statuses = ['Planning', 'In Progress', 'On Hold', 'Completed'];

  console.log('Seeding database...');

  for (const name of companies) {
    await prisma.company.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of libraries) {
    await prisma.library.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of categories1) {
    await prisma.projectCategory1.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of categories2) {
    await prisma.projectCategory2.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of statuses) {
    await prisma.projectStatus.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log('Database seeded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
