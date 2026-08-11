import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const supervisorId = searchParams.get('supervisorId');

    let trips;
    if (supervisorId) {
      // Fetch direct-report IDs for this supervisor
      const supervisor = await prisma.employee.findUnique({
        where: { id: supervisorId },
        select: { subordinates: { select: { id: true } } }
      });
      const subordinateIds = supervisor?.subordinates?.map(s => s.id) ?? [];
      trips = await prisma.tripLog.findMany({
        where: { employeeId: { in: subordinateIds } },
        include: { employee: true, vehicle: true, pings: { orderBy: { timestamp: 'asc' } } },
        orderBy: { createdAt: 'desc' }
      });
    } else if (employeeId) {
      trips = await prisma.tripLog.findMany({
        where: { employeeId },
        include: { vehicle: true, pings: { orderBy: { timestamp: 'asc' } } },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      trips = await prisma.tripLog.findMany({
        include: { employee: true, vehicle: true, pings: { orderBy: { timestamp: 'asc' } } },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { employeeId, vehicleId, date, startLocation, endLocation, distanceKm } = data;

    if (!employeeId || !vehicleId || !date || !startLocation || !endLocation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: parseInt(vehicleId) }
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const km = distanceKm ? parseFloat(distanceKm) : 0;
    const amount = km * vehicle.ratePerKm;

    const trip = await prisma.tripLog.create({
      data: {
        employeeId,
        vehicleId: parseInt(vehicleId),
        date,
        startLocation,
        endLocation,
        distanceKm: km,
        amount
      }
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error('Error creating trip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
