import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    
    // Mark as ACTIVE
    const trip = await prisma.tripLog.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Error starting trip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
