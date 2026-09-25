import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const where = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const gtns = await prisma.siteGTN.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectId: true,
            name: true
          }
        },
        items: {
          include: {
            requisition: {
              select: {
                reqNo: true,
                materialName: true
              }
            }
          }
        }
      },
      orderBy: { gtnDate: 'desc' }
    });

    return NextResponse.json(gtns);
  } catch (error) {
    console.error('Error fetching GTNs:', error);
    return NextResponse.json({ error: 'Failed to fetch GTNs' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      projectId,
      supplierId,
      supplierName,
      purchaseOrderNo,
      challanNo,
      challanDate,
      gtnDate,
      fromDate,
      toDate,
      materialCategory,
      fromLocation,
      toLocation,
      vehicleNo,
      remarks,
      items
    } = body;

    // Generate GTN Number
    const lastGTN = await prisma.siteGTN.findFirst({
      orderBy: { gtnNo: 'desc' }
    });
    
    let gtnNo = 'GTN001';
    if (lastGTN) {
      const num = parseInt(lastGTN.gtnNo.replace('GTN', '')) + 1;
      gtnNo = `GTN${num.toString().padStart(3, '0')}`;
    }

    // Generate GTN Serial Number (unique format)
    const year = new Date().getFullYear();
    const lastSerial = await prisma.siteGTN.findFirst({
      where: {
        gtnSrNo: {
          startsWith: `GTN/${year}/`
        }
      },
      orderBy: { gtnSrNo: 'desc' }
    });

    let serialNum = 1;
    if (lastSerial) {
      const lastNum = parseInt(lastSerial.gtnSrNo.split('/')[2]);
      serialNum = lastNum + 1;
    }
    const gtnSrNo = `GTN/${year}/${serialNum.toString().padStart(4, '0')}`;

    // Create GTN with items
    const gtn = await prisma.siteGTN.create({
      data: {
        gtnNo,
        gtnSrNo,
        projectId,
        supplierId,
        supplierName,
        purchaseOrderNo,
        challanNo,
        challanDate: challanDate ? new Date(challanDate) : null,
        gtnDate: gtnDate ? new Date(gtnDate) : new Date(),
        fromDate: fromDate ? new Date(fromDate) : null,
        toDate: toDate ? new Date(toDate) : null,
        materialCategory,
        fromLocation,
        toLocation,
        vehicleNo,
        remarks,
        status: 'Draft',
        items: {
          create: items.map(item => ({
            requisitionId: item.requisitionId || null,
            poSrNo: item.poSrNo,
            materialName: item.materialName,
            materialCategory: item.materialCategory,
            testName: item.testName,
            testDescription: item.testDescription,
            goodMin: item.goodMin ? parseFloat(item.goodMin) : null,
            goodMax: item.goodMax ? parseFloat(item.goodMax) : null,
            testResult: item.testResult,
            testStatus: item.testStatus || 'Pending',
            testRemark: item.testRemark,
            testQty: item.testQty ? parseFloat(item.testQty) : null,
            reqQty: item.reqQty ? parseFloat(item.reqQty) : null,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            grnSrNo: item.grnSrNo
          }))
        }
      },
      include: {
        project: true,
        items: true
      }
    });

    return NextResponse.json(gtn, { status: 201 });
  } catch (error) {
    console.error('Error creating GTN:', error);
    return NextResponse.json({ error: 'Failed to create GTN' }, { status: 500 });
  }
}
