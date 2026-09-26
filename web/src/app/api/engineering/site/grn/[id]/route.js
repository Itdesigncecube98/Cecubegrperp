import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const grn = await prisma.siteGRN.findUnique({
      where: { id },
      include: {
        project: true,
        gtn: true,
        items: {
          include: {
            requisition: true
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
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();

    const updateData = {
      grnDate: body.grnDate ? new Date(body.grnDate) : undefined,
      supplierName: body.supplierName,
      poNo: body.poNo,
      vehicleNo: body.vehicleNo,
      challanNo: body.challanNo,
      challanDate: body.challanDate ? new Date(body.challanDate) : null,
      ewayBillNo: body.ewayBillNo,
      ewayBillDate: body.ewayBillDate ? new Date(body.ewayBillDate) : null,
      status: body.status,
      remarks: body.remarks
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const grn = await prisma.siteGRN.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        gtn: true,
        items: true
      }
    });

    // Update items if provided
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        if (item.id) {
          await prisma.siteGRNItem.update({
            where: { id: item.id },
            data: {
              acceptedQty: parseFloat(item.acceptedQty) || 0,
              retainedQty: parseFloat(item.retainedQty) || 0,
              rejectedQty: parseFloat(item.rejectedQty) || 0,
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
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await prisma.siteGRN.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'GRN deleted successfully' });
  } catch (error) {
    console.error('Error deleting GRN:', error);
    return NextResponse.json({ error: 'Failed to delete GRN' }, { status: 500 });
  }
}
