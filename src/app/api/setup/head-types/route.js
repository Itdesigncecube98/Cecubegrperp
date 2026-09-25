export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const headTypes = await prisma.headType.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(headTypes);
  } catch (error) {
    console.error('Failed to fetch head types:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, isActive, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newHeadType = await prisma.headType.create({
      data: {
        name,
        description: description || null,
        isActive: isActive !== false,
      }
    });

    return NextResponse.json(newHeadType);
  } catch (error) {
    console.error('Failed to create head type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, isActive, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'Id is required' }, { status: 400 });
    }

    const updated = await prisma.headType.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(isActive !== undefined && { isActive }),
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update head type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Id is required' }, { status: 400 });

    await prisma.headType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete head type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
