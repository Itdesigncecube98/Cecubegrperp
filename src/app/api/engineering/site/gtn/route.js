import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PUT as updateGTNById } from './[id]/route';

async function resolveProjectMaster(projectId) {
  const projectMaster = await prisma.projectMaster.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (projectMaster || !projectId) return projectMaster;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, company: true, state: true },
  });
  if (!project) return null;

  const matchingMaster = await prisma.projectMaster.findFirst({
    where: { name: project.name },
    select: { id: true },
  });
  if (matchingMaster) return matchingMaster;

  return prisma.projectMaster.create({
    data: {
      projectId: `PROJECT-${project.id}`,
      name: project.name,
      clientName: project.company || null,
      location: project.state || null,
      projectType: 'EPC',
      status: 'Active',
    },
    select: { id: true },
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const purchaseOrderNo = searchParams.get('purchaseOrderNo');

    if (id) {
      const gtn = await prisma.siteGTN.findUnique({
        where: { id },
        include: {
          project: { select: { id: true, projectId: true, name: true } },
          items: { include: { requisition: { select: { reqNo: true, materialName: true } } } }
        }
      });
      if (!gtn) return NextResponse.json({ error: 'GTN not found' }, { status: 404 });
      return NextResponse.json(gtn);
    }

    const where = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (purchaseOrderNo) where.purchaseOrderNo = purchaseOrderNo;

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

    const projectMaster = await resolveProjectMaster(projectId);
    if (!projectMaster) {
      return NextResponse.json({ error: 'Selected project could not be found.' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Add at least one item before creating a GTN.' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    // Lock number allocation until the insert commits so simultaneous GTN
    // requests cannot read and claim the same next number.
    const gtn = await prisma.$transaction(async tx => {
      let lockAcquired = false;
      while (!lockAcquired) {
        const [lockResult] = await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtext('site-gtn-number')) AS acquired`;
        lockAcquired = lockResult.acquired;
        if (!lockAcquired) await new Promise(resolve => setTimeout(resolve, 50));
      }

      const existingNumbers = await tx.siteGTN.findMany({ select: { gtnNo: true } });
      const existingSerials = await tx.siteGTN.findMany({
        where: { gtnSrNo: { startsWith: `GTN/${year}/` } },
        select: { gtnSrNo: true },
      });
      const nextGtnNumber = existingNumbers.reduce((highest, row) => {
        const match = /^GTN(\d+)$/.exec(row.gtnNo || '');
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 0) + 1;
      const nextSerialNumber = existingSerials.reduce((highest, row) => {
        const match = new RegExp(`^GTN/${year}/(\\d+)$`).exec(row.gtnSrNo || '');
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 0) + 1;
      const gtnNo = `GTN${String(nextGtnNumber).padStart(3, '0')}`;
      const gtnSrNo = `GTN/${year}/${String(nextSerialNumber).padStart(4, '0')}`;

      return tx.siteGTN.create({
        data: {
          gtnNo,
          gtnSrNo,
          projectId: projectMaster.id,
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
              testName: item.testName || item.testParameters,
              testDescription: item.testDescription || item.testParameters,
              goodMin: item.goodMin ? parseFloat(item.goodMin) : null,
              goodMax: item.goodMax ? parseFloat(item.goodMax) : null,
              testResult: item.testResult,
              testStatus: item.testStatus || 'Pending',
              testRemark: item.testRemark || item.remarks,
              testQty: item.testQty ? parseFloat(item.testQty) : null,
              reqQty: item.reqQty ? parseFloat(item.reqQty) : null,
              quantity: parseFloat(item.quantity),
              unit: item.unit,
              grnSrNo: item.grnSrNo,
            })),
          },
        },
        include: { project: true, items: true },
      });
    });

    return NextResponse.json(gtn, { status: 201 });
  } catch (error) {
    console.error('Error creating GTN:', error);
    return NextResponse.json({ error: 'Failed to create GTN' }, { status: 500 });
  }
}

// Backward compatibility for GTN edit clients that still PUT to the collection URL.
export async function PUT(request) {
  try {
    const body = await request.clone().json();
    if (!body?.id) {
      return NextResponse.json({ error: 'GTN id is required to update a GTN.' }, { status: 400 });
    }
    return updateGTNById(request, { params: Promise.resolve({ id: String(body.id) }) });
  } catch (error) {
    console.error('Error forwarding GTN update:', error);
    return NextResponse.json({ error: 'Failed to update GTN' }, { status: 500 });
  }
}
