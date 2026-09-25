export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { amount, postJournal } from '@/lib/accounting';

export async function PUT(request, { params }) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    const data = await request.json();
    const { status, distanceKm } = data;

    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    }

    const updateData = { status };

    if (distanceKm !== undefined) {
      // Find the trip to get the vehicle's rate
      const trip = await prisma.tripLog.findUnique({
        where: { id },
        include: { vehicle: true }
      });

      if (trip && trip.vehicle) {
        const km = parseFloat(distanceKm);
        updateData.distanceKm = km;
        updateData.amount = km * trip.vehicle.ratePerKm;
      }
    } else if (status === 'APPROVED' || status === 'COMPLETED') {
      // Just in case it's approved and we need to ensure amount is set
      const trip = await prisma.tripLog.findUnique({
        where: { id },
        include: { vehicle: true }
      });
      if (trip && trip.vehicle && trip.amount === 0 && trip.distanceKm > 0) {
        updateData.amount = trip.distanceKm * trip.vehicle.ratePerKm;
      }
    }

    const updatedTrip = await prisma.tripLog.update({
      where: { id },
      data: updateData
    });

    if (['APPROVED', 'PAID'].includes(updatedTrip.status) && amount(updatedTrip.amount) > 0) {
      const trip = await prisma.tripLog.findUnique({ where: { id }, include: { employee: true } });
      await prisma.$transaction(async (tx) => {
        await postJournal(tx, {
          voucherNo: `VEHICLE-TRIP-${id}`,
          type: 'Purchase',
          narration: `Approved vehicle expense for ${trip.employee.name} on ${trip.date || 'trip'}`,
          entries: [
            { ledger: `Vehicle Expenses - ${trip.employee.name}`, ledgerType: 'Expense', type: 'Dr', amount: amount(updatedTrip.amount) },
            { ledger: `Vehicle Payable - ${trip.employee.name}`, ledgerType: 'Liability', type: 'Cr', amount: amount(updatedTrip.amount) }
          ]
        });
      }, { timeout: 30000 });
    }

    return NextResponse.json(updatedTrip);
  } catch (error) {
    console.error('Error updating trip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    await prisma.tripLog.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
