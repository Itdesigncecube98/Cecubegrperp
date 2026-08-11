const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const employees = await prisma.employee.findMany({ take: 2 });
  if (employees.length === 0) {
    console.log("No employees found.");
    return;
  }
  
  const empId = employees[0].id;
  
  const today = new Date().toISOString().split('T')[0];
  const reqTime = new Date(`${today}T09:00:00Z`);
  
  // Trip 1: Completed
  const req1 = await prisma.locationRequest.create({
    data: {
      employeeId: empId,
      status: 'COMPLETED',
      latitude: 19.0760,
      longitude: 72.8777,
      address: 'Mumbai HQ',
      movementType: 'Client Visit',
      requestedAt: reqTime,
      respondedAt: new Date(`${today}T11:00:00Z`),
    }
  });
  
  // Generate pings for Trip 1
  let lat = 19.0760;
  let lon = 72.8777;
  for(let i=0; i<10; i++) {
    await prisma.locationPing.create({
      data: {
        requestId: req1.id,
        latitude: lat,
        longitude: lon,
        timestamp: new Date(reqTime.getTime() + (i * 10 * 60000))
      }
    });
    lat += 0.005;
    lon += 0.002;
  }

  // Trip 2: Active
  const req2Time = new Date(`${today}T13:00:00Z`);
  const req2 = await prisma.locationRequest.create({
    data: {
      employeeId: empId,
      status: 'ACTIVE',
      latitude: 19.1260,
      longitude: 72.8977,
      address: 'Site B',
      movementType: 'Site Inspection',
      requestedAt: req2Time,
    }
  });

  lat = 19.1260;
  lon = 72.8977;
  for(let i=0; i<5; i++) {
    await prisma.locationPing.create({
      data: {
        requestId: req2.id,
        latitude: lat,
        longitude: lon,
        timestamp: new Date(req2Time.getTime() + (i * 10 * 60000))
      }
    });
    lat -= 0.002;
    lon += 0.004;
  }
  
  console.log("Mock data created!");
}

run().catch(console.error).finally(() => prisma.$disconnect());
