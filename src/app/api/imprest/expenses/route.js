export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req) {
  try {
    const body = await req.json();
    const { imprestRequestId, expenseDate, category, description, vendorName, billNo, billAmount, billUpload } = body;

    if (!imprestRequestId || !billAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newExpense = await prisma.imprestExpense.create({
      data: {
        imprestRequestId: parseInt(imprestRequestId),
        expenseDate: expenseDate || new Date().toISOString().split('T')[0],
        category: category || 'General',
        description,
        vendorName,
        billNo,
        billAmount: parseFloat(billAmount),
        billUpload
      }
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const imprestRequestId = searchParams.get('imprestRequestId');

    const query = {};
    if (imprestRequestId) {
      query.imprestRequestId = parseInt(imprestRequestId);
    }

    const expenses = await prisma.imprestExpense.findMany({
      where: query,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}
