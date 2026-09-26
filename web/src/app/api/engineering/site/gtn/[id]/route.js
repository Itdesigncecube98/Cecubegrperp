import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    // Await params for Next.js 15+ compatibility
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    const gtn = await prisma.siteGTN.findUnique({
      where: { id },
      include: {
        project: true,
        items: {
          include: {
            requisition: true
          }
        }
      }
    });

    if (!gtn) {
      return NextResponse.json({ error: 'GTN not found' }, { status: 404 });
    }

    return NextResponse.json(gtn);
  } catch (error) {
    console.error('Error fetching GTN:', error);
    return NextResponse.json({ error: 'Failed to fetch GTN' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    // Await params for Next.js 15+ compatibility
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();
    const {
      status,
      remarks,
      items
    } = body;

    const updateData = {};
    if (status) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    const gtn = await prisma.siteGTN.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        items: true
      }
    });

    // Update items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        if (item.id) {
          await prisma.siteGTNItem.update({
            where: { id: item.id },
            data: {
              testResult: item.testResult,
              testStatus: item.testStatus,
              testRemark: item.testRemark
            }
          });
        }
      }
    }

    if (status === 'Completed') {
      const completedGtn = await prisma.siteGTN.findUnique({
        where: { id },
        include: { items: true }
      });
      const grn = await prisma.siteGRN.findFirst({
        where: { gtnId: id },
        include: { items: true }
      });
      if (completedGtn && grn) {
        const purchaseBill = grn.poNo
          ? await prisma.vendorBill.findFirst({ where: { poNo: grn.poNo }, orderBy: { createdAt: 'desc' }, select: { billNo: true } })
          : null;
        const passedItems = completedGtn.items.filter(item => item.testStatus !== 'Fail');
        const storeItems = passedItems.map(gtnItem => {
          const grnItem = grn.items.find(item => item.requisitionId === gtnItem.requisitionId && item.materialName === gtnItem.materialName);
          if (!grnItem || Number(grnItem.acceptedQty) <= 0) return null;
          return {
            projectId: grn.projectId,
            requisitionId: grnItem.requisitionId,
            grnId: grn.id,
            grnItemId: grnItem.id,
            gtnId: id,
            materialName: grnItem.materialName,
            unit: grnItem.unit,
            quantity: Number(grnItem.acceptedQty),
            storeName: grnItem.storeName,
            brand: grnItem.brand,
            poNo: grn.poNo,
            purchaseBillNo: purchaseBill?.billNo || null,
            sourceType: 'GTN',
            status: 'AVAILABLE',
            remarks: grnItem.remarks
          };
        }).filter(Boolean);
        if (storeItems.length > 0) await prisma.siteStoreStock.createMany({ data: storeItems, skipDuplicates: true });
      }
    }

    return NextResponse.json(gtn);
  } catch (error) {
    console.error('Error updating GTN:', error);
    return NextResponse.json({ error: 'Failed to update GTN' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    // Await params for Next.js 15+ compatibility
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await prisma.siteGTN.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'GTN deleted successfully' });
  } catch (error) {
    console.error('Error deleting GTN:', error);
    return NextResponse.json({ error: 'Failed to delete GTN' }, { status: 500 });
  }
}
