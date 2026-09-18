export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    const where = projectId ? { projectId } : {};
    
    const ncrs = await prisma.qualityNCR.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(ncrs);
  } catch (error) {
    console.error('Error fetching NCRs:', error);
    return NextResponse.json({ error: 'Failed to fetch NCRs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const ncr = await prisma.qualityNCR.create({
      data: {
        projectId: body.projectId,
        ncrNo: body.ncrNo || `NCR-${Date.now()}`,
        raisedBy: body.raisedBy,
        date: body.date,
        location: body.location || '',
        tradeCategory: body.tradeCategory || '',
        nonConformanceDescription: body.nonConformanceDescription,
        severity: body.severity || 'Medium',
        rootCause: body.rootCause || '',
        correctiveAction: body.correctiveAction || '',
        preventiveAction: body.preventiveAction || '',
        responsiblePerson: body.responsiblePerson || '',
        targetCloseDate: body.targetCloseDate || body.date,
        status: body.status || 'Open',
        actualCloseDate: body.actualCloseDate || null,
        verifiedBy: body.verifiedBy || null,
        remarks: body.remarks || ''
      }
    });
    return NextResponse.json(ncr, { status: 201 });
  } catch (error) {
    console.error('Error creating NCR:', error);
    return NextResponse.json({ error: 'Failed to create NCR' }, { status: 500 });
  }
}
