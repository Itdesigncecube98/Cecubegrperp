export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    let vehicles;
    if (employeeId) {
      vehicles = await prisma.vehicle.findMany({
        where: {
          OR: [
            { employeeId },
            { isCompanyVehicle: true }
          ],
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      vehicles = await prisma.vehicle.findMany({
        include: { employee: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json(Array.isArray(vehicles) ? vehicles : []);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { employeeId, isCompanyVehicle, makeModel, plateNumber, vehicleType, ratePerKm, isActive } = data;

    if ((!isCompanyVehicle && !employeeId) || !makeModel || !plateNumber || !vehicleType || ratePerKm === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check unique plate
    const existing = await prisma.vehicle.findUnique({
      where: { plateNumber }
    });
    if (existing) {
      return NextResponse.json({ error: 'Vehicle No already registered. Please use a different vehicle number.' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        employeeId: isCompanyVehicle ? null : employeeId,
        isCompanyVehicle: isCompanyVehicle || false,
        makeModel,
        plateNumber,
        vehicleType,
        ratePerKm: parseFloat(ratePerKm),
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
