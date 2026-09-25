import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    const grn = await prisma.goodsReceiptNote.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            vendor: true,
            items: true
          }
        },
        items: {
          include: {
            poItem: true
          }
        }
      }
    });

    if (!grn) {
      return NextResponse.json({ error: 'GRN not found' }, { status: 404 });
    }

    return NextResponse.json(grn);
  } catch (error) {
    console.error('Error fetching GRN:', error);
    return NextResponse.json({ error: 'Failed to fetch GRN' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { status, remarks, items } = body;

    const updateData = {};
    if (status) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    const grn = await prisma.goodsReceiptNote.update({
      where: { id },
      data: updateData,
      include: {
        purchaseOrder: {
          include: {
            vendor: true
          }
        },
        items: {
          include: {
            poItem: true
          }
        }
      }
    });

    // If items updated, handle item updates
    if (items && items.length > 0) {
      for (const item of items) {
        if (item.id) {
          await prisma.gRNItem.update({
            where: { id: item.id },
            data: {
              acceptedQuantity: parseFloat(item.acceptedQuantity),
              rejectedQuantity: parseFloat(item.rejectedQuantity),
              remarks: item.remarks
            }
          });
        }
      }
    }

    return NextResponse.json(grn);
  } catch (error) {
    console.error('Error updating GRN:', error);
    return NextResponse.json({ error: 'Failed to update GRN' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);

    await prisma.goodsReceiptNote.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'GRN deleted successfully' });
  } catch (error) {
    console.error('Error deleting GRN:', error);
    return NextResponse.json({ error: 'Failed to delete GRN' }, { status: 500 });
  }
}
