import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const data = await request.json();
    const { requestId, latitude, longitude } = data;

    if (!requestId || !latitude || !longitude) {
      return NextResponse.json({ error: 'requestId, latitude, and longitude are required' }, { status: 400 });
    }

    // First save the ping
    const ping = await prisma.locationPing.create({
      data: {
        requestId: parseInt(requestId),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }
    });

    // Also update the main request to reflect the latest location
    await prisma.locationRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }
    });

    return NextResponse.json(ping, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
