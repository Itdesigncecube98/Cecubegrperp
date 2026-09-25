export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const mb = await prisma.projectMB.update({
      where: { id },
      data: { status: 'Certified' }
    });
    return NextResponse.json(mb);
  } catch (error) {
    console.error('Error certifying MB:', error);
    return NextResponse.json({ error: 'Failed to certify MB' }, { status: 500 });
  }
}
