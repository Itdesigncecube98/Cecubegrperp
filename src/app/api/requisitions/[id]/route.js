export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const updatedReq = await prisma.requisition.update({
      where: { id },
      data: {
        date: body.date,
        projectId: body.projectId,
        material: body.material,
        unit: body.unit,
        reqdDate: body.reqdDate,
        reqQty: body.reqQty ? body.reqQty.toString() : undefined,
        appQty: body.appQty ? body.appQty.toString() : null,
        status: body.status
      },
      include: {
        project: true
      }
    });

    return NextResponse.json(updatedReq);
  } catch (error) {
    console.error('Failed to update requisition:', error);
    return NextResponse.json({ error: 'Failed to update requisition' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await prisma.requisition.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete requisition:', error);
    return NextResponse.json({ error: 'Failed to delete requisition' }, { status: 500 });
  }
}
