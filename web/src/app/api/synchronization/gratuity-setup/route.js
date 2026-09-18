export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const setups = await prisma.gratuitySetup.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(setups);
  } catch (error) {
    console.error('Error fetching gratuity setups:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    const data = {
      fromDate: body.fromDate,
      toDate: body.toDate,
      minServedLimit: parseInt(body.minServedLimit),
      maxPayableLimit: parseFloat(body.maxPayableLimit),
      formula: body.formula || '',
      monthsRoundOff: body.monthsRoundOff || 'No',
      denominator: parseInt(body.denominator) || 26,
      subtractor: parseInt(body.subtractor) || 0
    };

    let result;
    if (body.id && typeof body.id === 'string' && body.id.length > 10) {
      // Update existing (cuid is usually > 10 chars)
      result = await prisma.gratuitySetup.update({
        where: { id: body.id },
        data
      });
    } else {
      // Create new
      result = await prisma.gratuitySetup.create({
        data
      });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error saving gratuity setup:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await prisma.gratuitySetup.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gratuity setup:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
