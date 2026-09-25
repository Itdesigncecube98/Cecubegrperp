export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Upsert BOQ item
    const boqItem = await prisma.tenderBOQItem.create({
      data: {
        tenderId: id,
        serialNo: body.serialNo,
        description: body.description,
        unit: body.unit,
        quantity: parseFloat(body.quantity) || 0,
        clientRate: parseFloat(body.clientRate) || 0,
        estimatedRate: parseFloat(body.estimatedRate) || 0
      }
    });

    return NextResponse.json(boqItem, { status: 201 });
  } catch (error) {
    console.error('Error creating BOQ item:', error);
    return NextResponse.json({ error: error.message || 'Failed to create BOQ item' }, { status: 500 });
  }
}
