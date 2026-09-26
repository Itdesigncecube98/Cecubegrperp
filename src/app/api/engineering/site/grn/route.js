import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const gtnId = searchParams.get('gtnId');
    const id = searchParams.get('id');
    const poNo = searchParams.get('poNo');

    const where = {};
    if (id) where.id = id;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (gtnId) where.gtnId = gtnId;
    if (poNo) where.poNo = { equals: poNo.trim(), mode: 'insensitive' };

    const grns = await prisma.siteGRN.findMany({
      where,
      include: {
        project: true,
        gtn: true,
        items: {
          include: {
            requisition: true
          }
        }
      },
      orderBy: { grnDate: 'desc' }
    });

    return NextResponse.json(grns);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GRNs' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Auto-generate GRN numbers
    const lastGrn = await prisma.siteGRN.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    let grnNo = 'GRN001';
    if (lastGrn && lastGrn.grnNo) {
      const lastNum = parseInt(lastGrn.grnNo.replace('GRN', ''));
      grnNo = `GRN${String(lastNum + 1).padStart(3, '0')}`;
    }

    const grn = await prisma.siteGRN.create({
      data: {
        grnNo,
        projectId: body.projectId,
        gtnId: body.gtnId || null,
        grnDate: body.grnDate ? new Date(body.grnDate) : new Date(),
        grnType: body.grnType || 'WITHOUT_PO',
        supplierId: body.supplierId || null,
        supplierName: body.supplierName || null,
        poNo: body.poNo || null,
        vehicleNo: body.vehicleNo || null,
        challanNo: body.challanNo || null,
        challanDate: body.challanDate ? new Date(body.challanDate) : null,
        gateRegistrationDate: body.gateRegistrationDate ? new Date(body.gateRegistrationDate) : null,
        gateRegistrationIn: body.gateRegistrationIn ? new Date(body.gateRegistrationIn) : null,
        gateRegistrationOut: body.gateRegistrationOut ? new Date(body.gateRegistrationOut) : null,
        gateRegistrationRefNo: body.gateRegistrationRefNo || null,
        state: body.state || null,
        ewayBillNo: body.ewayBillNo || null,
        ewayBillDate: body.ewayBillDate ? new Date(body.ewayBillDate) : null,
        status: body.status || 'Draft',
        remarks: body.remarks || null,
        items: {
          create: (body.items || []).map(item => ({
            requisitionId: item.requisitionId,
            materialName: item.materialName,
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit || null,
            acceptedQty: parseFloat(item.acceptedQty) || 0,
            retainedQty: parseFloat(item.retainedQty) || 0,
            rejectedQty: parseFloat(item.rejectedQty) || 0,
            challanQty: parseFloat(item.challanQty) || 0,
            budgetHead: item.budgetHead || null,
            storeName: item.storeName || null,
            brand: item.brand || null,
            remarks: item.remarks || null,
            testRequired: item.testRequired || false,
            gtnSrNo: item.gtnSrNo || null,
            document: item.document || null
          }))
        }
      },
      include: {
        project: true,
        gtn: true,
        items: true
      }
    });

    return NextResponse.json(grn, { status: 201 });
  } catch (error) {
    console.error('Error creating GRN:', error);
    return NextResponse.json(
      { error: 'Failed to create GRN' },
      { status: 500 }
    );
  }
}
