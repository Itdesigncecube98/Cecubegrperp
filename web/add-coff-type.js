const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCoffType() {
  try {
    // Check if COFF type already exists
    const existingType = await prisma.leaveType.findFirst({
      where: { name: 'COFF' }
    });

    if (existingType) {
      console.log('COFF leave type already exists:', existingType);
      return;
    }

    // Add COFF leave type
    const coffType = await prisma.leaveType.create({
      data: {
        name: 'COFF',
        isPaid: true,
        isActive: true,
        includeWeeklyOff: false,
        includeHoliday: false,
        considerAsPresent: true
      }
    });
    
    console.log('COFF leave type added successfully:', coffType);
  } catch (error) {
    console.error('Error adding COFF type:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCoffType();