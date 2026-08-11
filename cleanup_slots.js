const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const records = await prisma.attendance.findMany();
  for (const r of records) {
    if (!r.timeSlots) continue;
    let slots = JSON.parse(r.timeSlots);
    let newSlots = [];
    for(let i = 0; i < slots.length; i++) {
      const s = slots[i];
      // If this is an incomplete slot and the NEXT slot has the exact same 'in' time, skip this one
      if (!s.out && slots[i+1] && slots[i+1].in === s.in) {
        continue;
      }
      newSlots.push(s);
    }
    if (slots.length !== newSlots.length) {
      console.log('Fixed duplicate', r.id);
      await prisma.attendance.update({
        where: { id: r.id },
        data: { timeSlots: JSON.stringify(newSlots) }
      });
    }
  }
  console.log('Done');
}
run();
