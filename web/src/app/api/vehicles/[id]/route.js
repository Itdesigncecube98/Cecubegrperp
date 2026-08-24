import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    const data = await request.json();
    const { employeeId, isCompanyVehicle, makeModel, plateNumber, vehicleType, ratePerKm, isActive } = data;

    // If plateNumber changed, check it's not already taken by another vehicle
    if (plateNumber) {
      const existing = await prisma.vehicle.findUnique({ where: { plateNumber } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Vehicle No already registered on another vehicle.' }, { status: 400 });
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        employeeId: isCompanyVehicle ? null : employeeId,
        isCompanyVehicle: isCompanyVehicle !== undefined ? isCompanyVehicle : undefined,
        makeModel,
        ...(plateNumber ? { plateNumber } : {}),
        vehicleType,
        ratePerKm: ratePerKm !== undefined ? parseFloat(ratePerKm) : undefined,
        isActive
      }
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    await prisma.vehicle.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
