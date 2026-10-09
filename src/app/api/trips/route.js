export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

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
        include: { employee: { include: { supervisor: true } }, vehicle: true, pings: { orderBy: { timestamp: 'asc' } } },
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
        include: { employee: { include: { supervisor: true } }, vehicle: true, pings: { orderBy: { timestamp: 'asc' } } },
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
      const { employeeId, vehicleId, date, startLocation, endLocation, distanceKm, status, reason } = data;
  
      if (!employeeId || !vehicleId || !date || !startLocation || !endLocation) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
  
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: parseInt(vehicleId) }
      });
  
      if (!vehicle) {
        return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      }
  
      const km = distanceKm ? Number(distanceKm) : 0;
      if (!Number.isFinite(km) || km < 0) {
        return NextResponse.json({ error: 'Trip distance must be a valid non-negative number' }, { status: 400 });
      }
      const amount = km * vehicle.ratePerKm;
  
      const tripData = {
        employeeId,
        vehicleId: parseInt(vehicleId),
        date,
        startLocation,
        endLocation,
        distanceKm: km,
        amount
      };

      if (
        data.startCoords != null ||
        data.endCoords != null ||
        (Array.isArray(data.routePath) && data.routePath.length > 0)
      ) {
        const { startCoords, endCoords, routePath } = data;
        const rawCoordinates = [startCoords?.lat, startCoords?.lng, endCoords?.lat, endCoords?.lng];
        const coordinates = rawCoordinates.map(Number);
        const validCoordinates =
          rawCoordinates.every(value => value != null && value !== '') &&
          coordinates.every(Number.isFinite) &&
          coordinates[0] >= -90 && coordinates[0] <= 90 &&
          coordinates[2] >= -90 && coordinates[2] <= 90 &&
          coordinates[1] >= -180 && coordinates[1] <= 180 &&
          coordinates[3] >= -180 && coordinates[3] <= 180;
        const validRoutePath =
          Array.isArray(routePath) &&
          routePath.length >= 2 &&
          routePath.length <= 5000 &&
          routePath.every(point =>
            point?.lat != null &&
            point?.lng != null &&
            Number.isFinite(Number(point?.lat)) &&
            Number.isFinite(Number(point?.lng)) &&
            Number(point.lat) >= -90 &&
            Number(point.lat) <= 90 &&
            Number(point.lng) >= -180 &&
            Number(point.lng) <= 180
          );
        if (!validCoordinates || !validRoutePath) {
          return NextResponse.json({ error: 'Trip needs valid pickup, destination, and calculated route coordinates' }, { status: 400 });
        }
        tripData.startLatitude = coordinates[0];
        tripData.startLongitude = coordinates[1];
        tripData.endLatitude = coordinates[2];
        tripData.endLongitude = coordinates[3];
        tripData.routePath = routePath.map(point => ({
          lat: Number(point.lat),
          lng: Number(point.lng),
        }));
      }

      if (status) tripData.status = status;
      if (reason) tripData.reason = reason;

      const trip = await prisma.tripLog.create({
        data: tripData
      });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error('Error creating trip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
