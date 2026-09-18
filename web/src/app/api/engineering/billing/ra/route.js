export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const bills = await prisma.projectRABill.findMany({
      include: {
        project: { select: { name: true, projectId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(bills);
  } catch (error) {
    console.error('Error fetching RA Bills:', error);
    return NextResponse.json({ error: 'Failed to fetch RA Bills' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const count = await prisma.projectRABill.count();
    const billNo = body.billNo || `RA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const bill = await prisma.projectRABill.create({
      data: {
        billNo,
        projectId: body.projectId,
        date: body.date ? new Date(body.date) : new Date(),
        
        previousCertified: parseFloat(body.previousCertified) || 0,
        currentBill: parseFloat(body.currentBill) || 0,
        cumulative: parseFloat(body.cumulative) || 0,
        
        retentionPercent: parseFloat(body.retentionPercent) || 0,
        retentionAmount: parseFloat(body.retentionAmount) || 0,
        advanceRecovery: parseFloat(body.advanceRecovery) || 0,
        otherDeductions: parseFloat(body.otherDeductions) || 0,
        
        netPayable: parseFloat(body.netPayable) || 0,
        status: 'Submitted',
      }
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error('Error creating RA Bill:', error);
    return NextResponse.json({ error: error.message || 'Failed to create RA Bill' }, { status: 500 });
  }
}
