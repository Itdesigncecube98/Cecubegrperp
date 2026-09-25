export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const reasons = await prisma.leavingReason.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(reasons);
  } catch (error) {
    console.error('Error fetching leaving reasons:', error);
    return NextResponse.json({ error: 'Failed to fetch leaving reasons' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate uniqueness
    const existing = await prisma.leavingReason.findUnique({
      where: { name: data.name }
    });
    
    if (existing) {
      return NextResponse.json({ error: 'Leaving reason with this name already exists' }, { status: 400 });
    }

    const reason = await prisma.leavingReason.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true
      }
    });

    return NextResponse.json(reason, { status: 201 });
  } catch (error) {
    console.error('Error creating leaving reason:', error);
    return NextResponse.json({ error: 'Failed to create leaving reason' }, { status: 500 });
  }
}
