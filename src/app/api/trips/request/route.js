import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const data = await request.json();
    const { employeeId, message } = data; // message could be stored in startLocation or a new field. We'll store it in endLocation as destination

    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    // Since vehicleId is required in the DB, we have to either make vehicleId optional in schema, or find a default vehicle, or just have Admin assign one.
    // Wait, the schema requires vehicleId: Int.
    // We should make vehicleId optional in the schema or the Admin must select a vehicle.
    // Let's require the Admin to select a vehicle.
    const { vehicleId } = data;
    if (!vehicleId) {
        return NextResponse.json({ error: 'Missing vehicleId' }, { status: 400 });
    }

    const trip = await prisma.tripLog.create({
      data: {
        employeeId,
        vehicleId: parseInt(vehicleId),
        date: new Date().toISOString().split('T')[0],
        status: 'REQUESTED'
      }
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error('Error creating trip request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
