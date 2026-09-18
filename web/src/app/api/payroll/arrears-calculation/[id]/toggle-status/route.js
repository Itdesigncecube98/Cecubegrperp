import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!body.status) {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
    }

    const updated = await prisma.bonusIncentive.update({
      where: { id },
      data: { status: body.status }
    });

    return NextResponse.json({ success: true, data: updated });

  } catch (error) {
    console.error('[TOGGLE STATUS ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
