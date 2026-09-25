export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const salaryHeads = await prisma.salaryHead.findMany({
      include: {
        headType: true
      },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(salaryHeads);
  } catch (error) {
    console.error('Failed to fetch salary heads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { category, description, calculationType, remark, isActive } = body;
    
    if (!category || !description) {
      return NextResponse.json({ error: 'Category and description are required' }, { status: 400 });
    }

    // Upsert the HeadType if it doesn't exist (since UI uses simple strings 'CTC', 'Earning', etc.)
    let headType = await prisma.headType.findUnique({ where: { name: category } });
    if (!headType) {
      headType = await prisma.headType.create({ data: { name: category } });
    }

    const newHead = await prisma.salaryHead.create({
      data: {
        description,
        calculationType,
        remark: remark || null,
        isActive: isActive !== false,
        headTypeId: headType.id
      },
      include: { headType: true }
    });

    return NextResponse.json(newHead);
  } catch (error) {
    console.error('Failed to create salary head:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, category, description, calculationType, remark, isActive } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Id is required' }, { status: 400 });
    }

    let headTypeId = undefined;
    if (category) {
      let headType = await prisma.headType.findUnique({ where: { name: category } });
      if (!headType) {
        headType = await prisma.headType.create({ data: { name: category } });
      }
      headTypeId = headType.id;
    }

    const updated = await prisma.salaryHead.update({
      where: { id },
      data: {
        description,
        calculationType,
        remark: remark !== undefined ? remark : null,
        isActive,
        ...(headTypeId && { headTypeId })
      },
      include: { headType: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update salary head:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Id is required' }, { status: 400 });
    
    await prisma.salaryHead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete salary head:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
