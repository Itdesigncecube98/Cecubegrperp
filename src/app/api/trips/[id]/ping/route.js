import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request, { params }) {
  try {
    const { id: paramId } = await params;
    const tripId = parseInt(paramId);
    const data = await request.json();
    const { latitude, longitude } = data;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    const ping = await prisma.tripPing.create({
      data: {
        tripId,
        latitude,
        longitude
      }
    });

    return NextResponse.json(ping, { status: 201 });
  } catch (error) {
    console.error('Error recording trip ping:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
