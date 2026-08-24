import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const requestId = parseInt(id);

    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const locationRequest = await prisma.locationRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: true,
        pings: { orderBy: { timestamp: 'asc' } }
      }
    });

    if (!locationRequest) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(locationRequest);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
