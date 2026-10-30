export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

const ALLOWED_HEAD_TYPES = new Set(['CTC', 'Earning', 'Deduction', 'Other']);

function isFixedAmount(calculationType) {
  return String(calculationType || '').includes('Fixed Amount');
}

function validFixedAmount(calculationType, fixedAmount) {
  if (!isFixedAmount(calculationType)) return true;
  return fixedAmount !== '' && fixedAmount !== null && fixedAmount !== undefined && Number.isFinite(Number(fixedAmount)) && Number(fixedAmount) >= 0;
}

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
    const { category, description, calculationType, fixedAmount, remark, isActive } = body;
    
    if (!ALLOWED_HEAD_TYPES.has(String(category || '').trim()) || !String(description || '').trim()) {
      return NextResponse.json({ error: 'Choose one of the four supported head types and enter a description' }, { status: 400 });
    }

    if (!validFixedAmount(calculationType, fixedAmount)) {
      return NextResponse.json({ error: 'Enter a valid non-negative fixed amount' }, { status: 400 });
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
        fixedAmount: String(calculationType || '').includes('Fixed Amount') ? Number(fixedAmount) : null,
        remark: remark || null,
        isActive: isActive !== false,
        headType: { connect: { id: headType.id } }
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
    const { id, category, description, calculationType, fixedAmount, remark, isActive } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Id is required' }, { status: 400 });
    }

    let selectedHeadType = null;
    if (category) {
      if (!ALLOWED_HEAD_TYPES.has(String(category).trim())) {
        return NextResponse.json({ error: 'Only CTC, Earning, Deduction, and Other head types are supported' }, { status: 400 });
      }
      let headType = await prisma.headType.findUnique({ where: { name: category } });
      if (!headType) return NextResponse.json({ error: `Required head type ${category} is missing` }, { status: 400 });
      selectedHeadType = headType;
    }

    if (!validFixedAmount(calculationType, fixedAmount)) {
      return NextResponse.json({ error: 'Enter a valid non-negative fixed amount' }, { status: 400 });
    }

    const updateData = {
      description,
      calculationType,
      fixedAmount: calculationType !== undefined
        ? (String(calculationType).includes('Fixed Amount') ? Number(fixedAmount) : null)
        : undefined,
      remark: remark !== undefined ? remark : undefined,
      isActive,
      ...(selectedHeadType && { headType: { connect: { id: selectedHeadType.id } } })
    };
    const updated = await prisma.salaryHead.update({
      where: { id },
      data: updateData,
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
