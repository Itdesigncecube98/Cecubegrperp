export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';

// GET /api/trips/[id]/pings — returns all GPS pings for a trip ordered by time
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);

    if (isNaN(tripId)) {
      return NextResponse.json({ error: 'Invalid trip id' }, { status: 400 });
    }

    const pings = await prisma.tripPing.findMany({
      where: { tripId },
      orderBy: { timestamp: 'asc' }
    });

    return NextResponse.json(pings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
