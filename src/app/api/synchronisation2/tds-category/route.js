export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const categories = await prisma.tdsCategory.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error('Error fetching TDS categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TDS categories' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const newCategory = await prisma.tdsCategory.create({
      data: { name },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating TDS category:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'TDS Category with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create TDS category' },
      { status: 500 }
    );
  }
}
