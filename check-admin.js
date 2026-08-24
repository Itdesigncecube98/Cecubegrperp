const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const admins = await prisma.admin.findMany();
  console.log('Admins in DB:', admins);
  if (admins.length === 0) {
    const newAdmin = await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: 'admin@cecube.com',
        password: 'password123',
        role: 'SUPERADMIN'
      }
    });
    console.log('Created default admin:', newAdmin);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
