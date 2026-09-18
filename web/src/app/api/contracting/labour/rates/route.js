export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/contracting/labour/rates
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const state = searchParams.get('state');
    
    const where = { isActive: true };
    if (category) where.category = category;
    if (state) where.state = state;

    const rates = await prisma.labourRateMaster.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { designation: 'asc' }
      ]
    });

    return NextResponse.json(rates);
  } catch (error) {
    console.error('Error fetching labour rates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/contracting/labour/rates
export async function POST(request) {
  try {
    const data = await request.json();
    const { category, designation, unit, rate, otRate, state, effectiveFrom } = data;

    if (!category || !designation || rate === undefined) {
      return NextResponse.json({ error: 'category, designation, and rate are required' }, { status: 400 });
    }

    const newRate = await prisma.labourRateMaster.create({
      data: {
        category,
        designation,
        unit: unit || 'Day',
        rate: parseFloat(rate) || 0,
        otRate: parseFloat(otRate) || 0,
        state: state || null,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        isActive: true,
      }
    });

    return NextResponse.json(newRate, { status: 201 });
  } catch (error) {
    console.error('Error creating labour rate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/contracting/labour/rates
export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...fields } = data;
    
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const updateData = {};
    if (fields.category !== undefined) updateData.category = fields.category;
    if (fields.designation !== undefined) updateData.designation = fields.designation;
    if (fields.unit !== undefined) updateData.unit = fields.unit;
    if (fields.rate !== undefined) updateData.rate = parseFloat(fields.rate) || 0;
    if (fields.otRate !== undefined) updateData.otRate = parseFloat(fields.otRate) || 0;
    if (fields.state !== undefined) updateData.state = fields.state;
    if (fields.effectiveFrom !== undefined) updateData.effectiveFrom = new Date(fields.effectiveFrom);
    if (fields.isActive !== undefined) updateData.isActive = fields.isActive;

    const updated = await prisma.labourRateMaster.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating labour rate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/contracting/labour/rates
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // We can either hard delete or soft delete. Doing a hard delete here for simplicity,
    // though soft deleting (isActive = false) is often preferred for master data.
    await prisma.labourRateMaster.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting labour rate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
