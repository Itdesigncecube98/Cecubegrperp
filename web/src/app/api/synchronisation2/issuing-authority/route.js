export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const authorities = await prisma.issuingAuthority.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(authorities, { status: 200 });
  } catch (error) {
    console.error('Error fetching issuing authorities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issuing authorities' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, status } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const newAuthority = await prisma.issuingAuthority.create({
      data: {
        name,
        status: status || 'Active',
      },
    });

    return NextResponse.json(newAuthority, { status: 201 });
  } catch (error) {
    console.error('Error creating issuing authority:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Issuing authority with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create issuing authority' },
      { status: 500 }
    );
  }
}
