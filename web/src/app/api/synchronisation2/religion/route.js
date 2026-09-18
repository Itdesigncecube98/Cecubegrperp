export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const religions = await prisma.religion.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(religions, { status: 200 });
  } catch (error) {
    console.error('Error fetching religions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch religions' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const newReligion = await prisma.religion.create({
      data: {
        name,
        description: description || null,
      },
    });

    return NextResponse.json(newReligion, { status: 201 });
  } catch (error) {
    console.error('Error creating religion:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Religion with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create religion' },
      { status: 500 }
    );
  }
}
