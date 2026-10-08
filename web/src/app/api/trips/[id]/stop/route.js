export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { cleanTripTrack } from '@/lib/tripGps';

export async function PUT(request, { params }) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    
    let data = {};
    try {
      data = await request.json();
    } catch (e) {
      // Body might be empty or missing, default to empty object
    }
    const { startLocation, endLocation } = data; // Optional names from the user

    const trip = await prisma.tripLog.findUnique({
      where: { id },
      include: { pings: { orderBy: { timestamp: 'asc' } }, vehicle: true }
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const { distanceKm: measuredDistanceKm } = cleanTripTrack(trip.pings);

    // Round to 2 decimal places
    const totalDistanceKm = Math.round(measuredDistanceKm * 100) / 100;
    
    // Auto calculate amount
    const amount = totalDistanceKm * (trip.vehicle?.ratePerKm || 0);

    const updatedTrip = await prisma.tripLog.update({
      where: { id },
      data: { 
        status: 'COMPLETED',
        distanceKm: totalDistanceKm,
        amount: amount,
        startLocation: startLocation || trip.startLocation || 'Auto-tracked Start',
        endLocation: endLocation || trip.endLocation || 'Auto-tracked End'
      }
    });

    return NextResponse.json(updatedTrip);
  } catch (error) {
    console.error('Error stopping trip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
