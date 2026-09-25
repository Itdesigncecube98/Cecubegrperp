export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const data = await prisma.relationship.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching relationship:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await prisma.relationship.create({
      data: body,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating relationship:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
