export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

// Haversine formula to calculate distance between two coordinates in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

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

    let totalDistanceKm = 0;
    const pings = trip.pings;
    
    for (let i = 1; i < pings.length; i++) {
      const prev = pings[i - 1];
      const curr = pings[i];
      totalDistanceKm += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }

    // Round to 2 decimal places
    totalDistanceKm = Math.round(totalDistanceKm * 100) / 100;
    
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
