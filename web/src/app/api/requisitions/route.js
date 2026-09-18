export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    let query = {
      include: {
        project: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    };

    if (projectId && projectId !== 'all') {
      query.where = { projectId };
    }

    const requisitions = await prisma.requisition.findMany(query);
    return NextResponse.json(requisitions);
  } catch (error) {
    console.error('Failed to fetch requisitions:', error);
    return NextResponse.json({ error: 'Failed to fetch requisitions' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Generate a requisition number (e.g., REQ-YYYYMMDD-XXX)
    const count = await prisma.requisition.count();
    const reqNo = `REQ-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${(count + 1).toString().padStart(3, '0')}`;

    const newReq = await prisma.requisition.create({
      data: {
        reqNo: reqNo,
        date: body.date || new Date().toISOString().split('T')[0],
        projectId: body.projectId,
        material: body.material,
        unit: body.unit,
        reqdDate: body.reqdDate,
        reqQty: body.reqQty.toString(),
        appQty: body.appQty ? body.appQty.toString() : null,
        status: body.status || 'Pending'
      },
      include: {
        project: true
      }
    });
    
    return NextResponse.json(newReq, { status: 201 });
  } catch (error) {
    console.error('Failed to create requisition:', error);
    return NextResponse.json({ error: 'Failed to create requisition' }, { status: 500 });
  }
}
