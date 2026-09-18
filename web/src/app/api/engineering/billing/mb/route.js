export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const mbs = await prisma.projectMB.findMany({
      include: {
        project: { select: { name: true, projectId: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(mbs);
  } catch (error) {
    console.error('Error fetching MBs:', error);
    return NextResponse.json({ error: 'Failed to fetch MBs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const count = await prisma.projectMB.count();
    const mbNo = body.mbNo || `MB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const mb = await prisma.projectMB.create({
      data: {
        mbNo,
        projectId: body.projectId,
        date: body.date ? new Date(body.date) : new Date(),
        periodFrom: body.periodFrom ? new Date(body.periodFrom) : null,
        periodTo: body.periodTo ? new Date(body.periodTo) : null,
        status: 'Draft',
        
        items: {
          create: body.items.map(item => ({
            description: item.description,
            unit: item.unit,
            quantity: parseFloat(item.quantity) || 0,
            contractRate: parseFloat(item.contractRate) || 0,
            amount: (parseFloat(item.quantity) || 0) * (parseFloat(item.contractRate) || 0)
          }))
        }
      },
      include: {
        items: true
      }
    });

    return NextResponse.json(mb, { status: 201 });
  } catch (error) {
    console.error('Error creating MB:', error);
    return NextResponse.json({ error: error.message || 'Failed to create MB' }, { status: 500 });
  }
}
