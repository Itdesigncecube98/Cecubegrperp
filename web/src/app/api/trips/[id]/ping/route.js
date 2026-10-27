export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function POST(request, { params }) {
  try {
    const { id: paramId } = await params;
    const tripId = parseInt(paramId);
    if (!Number.isInteger(tripId) || tripId <= 0) {
      return NextResponse.json({ error: 'Invalid trip id' }, { status: 400 });
    }
    const data = await request.json();
    const latitude = Number(data?.latitude);
    const longitude = Number(data?.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    const trip = await prisma.tripLog.findUnique({ where: { id: tripId }, select: { id: true, status: true } });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    if (trip.status !== 'ACTIVE') return NextResponse.json({ error: 'Trip is not active' }, { status: 409 });

    const ping = await prisma.tripPing.create({
      data: {
        tripId,
        latitude,
        longitude,
        timestamp: new Date(),
      }
    });

    return NextResponse.json(ping, { status: 201 });
  } catch (error) {
    console.error('Error recording trip ping:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
