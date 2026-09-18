export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const bankNames = await prisma.bankName.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(bankNames, { status: 200 });
  } catch (error) {
    console.error('Error fetching bank names:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank names' },
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

    const newBankName = await prisma.bankName.create({
      data: { 
        name,
        status: status || 'Active'
      },
    });

    return NextResponse.json(newBankName, { status: 201 });
  } catch (error) {
    console.error('Error creating bank name:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bank Name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create bank name' },
      { status: 500 }
    );
  }
}
