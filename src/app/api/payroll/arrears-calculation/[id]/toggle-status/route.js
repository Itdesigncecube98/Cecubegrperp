import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Arrears ID is required' }, { status: 400 });
    }

    const body = await request.json();
    if (!['PENDING', 'APPROVED'].includes(body?.status)) {
      return NextResponse.json({ success: false, error: 'Status must be PENDING or APPROVED' }, { status: 400 });
    }

    const updated = await prisma.bonusIncentive.update({
      where: { id },
      data: { status: body.status }
    });

    return NextResponse.json({ success: true, data: updated });

  } catch (error) {
    console.error('[TOGGLE STATUS ERROR]', error);
    const status = error.code === 'P2025' ? 404 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
