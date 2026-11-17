export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const toDate = value => value ? new Date(value) : null;
const nextNumber = (prefix, count) => `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const requisitionId = searchParams.get('requisitionId');
    const where = requisitionId ? { items: { some: { requisitionId } } } : {};
    const grns = await prisma.siteGRN.findMany({
      where,
      include: { project: true, gtn: { select: { gtnNo: true } }, items: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(grns);
  } catch (error) {
    console.error('Error fetching site GRNs:', error);
    return NextResponse.json({ error: 'Failed to fetch GRNs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const incomingItems = Array.isArray(body.items) ? body.items.filter(item => Number(item.quantity) > 0) : [];
    if (!body.projectId) return NextResponse.json({ error: 'Project is required.' }, { status: 400 });
    if (incomingItems.length === 0) return NextResponse.json({ error: 'Select at least one material.' }, { status: 400 });
    if (!body.grnDate) return NextResponse.json({ error: 'GRN date is required.' }, { status: 400 });
    if (body.grnType === 'PO' && !body.poNo) return NextResponse.json({ error: 'PO number is required for PO GRN type.' }, { status: 400 });

    const items = incomingItems.filter(item => String(item.materialName || '').trim());
    if (items.length === 0) return NextResponse.json({ error: 'Select at least one material.' }, { status: 400 });

    const [gtnCount, grnCount] = await Promise.all([prisma.siteGTN.count(), prisma.siteGRN.count()]);
    const gtnItems = items.filter(item => item.sendToGtn !== false);
    const gtnNo = gtnItems.length > 0 ? (body.gtnNo || nextNumber('GTN', gtnCount)) : null;
    const grnNo = body.grnNo || nextNumber('GRN', grnCount);
    const ewayBillNo = body.ewayBillNo || nextNumber('EWB', grnCount);

    const result = await prisma.$transaction(async tx => {
      const gtn = gtnItems.length > 0 ? await tx.siteGTN.create({
        data: {
          gtnNo,
          projectId: body.projectId,
          gtnDate: toDate(body.gtnDate) || new Date(),
          fromLocation: body.fromLocation || null,
          toLocation: body.toLocation || null,
          vehicleNo: body.vehicleNo || null,
          status: 'Dispatched',
          remarks: body.remarks || null,
          items: { create: gtnItems.map(item => ({ materialName: item.materialName, quantity: Number(item.quantity), unit: item.unit || null })) }
        }
      }) : null;
      if (gtn) await tx.siteGTNStatusHistory.create({ data: {
        gtnId: gtn.id,
        toStatus: 'Dispatched',
        actorName: body.createdBy || body.receivedBy || 'Site User',
        note: 'GTN created with GRN',
      } });
      const grn = await tx.siteGRN.create({
        data: {
          grnNo,
          projectId: body.projectId,
          gtnId: gtn?.id || null,
          grnDate: toDate(body.grnDate) || new Date(),
          grnType: body.grnType === 'PO' ? 'PO' : 'WITHOUT_PO',
          supplierId: body.supplierId || null,
          supplierName: body.supplierName || null,
          poNo: body.poNo || null,
          vehicleNo: body.vehicleNo || null,
          challanNo: body.challanNo || null,
          challanDate: toDate(body.challanDate),
          gateRegistrationDate: toDate(body.gateRegistrationDate),
          gateRegistrationIn: toDate(body.gateRegistrationIn),
          gateRegistrationOut: toDate(body.gateRegistrationOut),
          gateRegistrationRefNo: body.gateRegistrationRefNo || null,
          state: body.state || null,
          ewayBillNo,
          ewayBillDate: toDate(body.ewayBillDate) || new Date(),
          status: body.status || 'Received',
          remarks: body.remarks || null,
          statusHistory: { create: { fromStatus: null, toStatus: body.status || 'Received', note: 'GRN created' } },
          items: { create: items.map(item => ({ materialName: item.materialName, quantity: Number(item.quantity), unit: item.unit || null, acceptedQty: Number(item.goodQty ?? item.quantity), retainedQty: Number(item.retainedQty) || 0, rejectedQty: Number(item.rejectedQty) || 0, challanQty: Number(item.challanQty) || 0, budgetHead: item.budgetHead || null, storeName: item.storeName || null, brand: item.brand || null, remarks: item.remarks || null, testRequired: Boolean(item.testRequired), gtnSrNo: item.gtnSrNo || null, document: item.document || null })) }
        },
        include: { items: true }
      });
      const purchaseBill = body.poNo
        ? await tx.vendorBill.findFirst({ where: { poNo: body.poNo }, orderBy: { createdAt: 'desc' }, select: { billNo: true } })
        : null;
      const storeItems = grn.items
        .filter(item => !item.testRequired && Number(item.acceptedQty) > 0)
        .map(item => ({
          projectId: grn.projectId,
          requisitionId: null,
          grnId: grn.id,
          grnItemId: item.id,
          gtnId: null,
          materialName: item.materialName,
          unit: item.unit,
          quantity: Number(item.acceptedQty),
          storeName: item.storeName,
          brand: item.brand,
          poNo: grn.poNo,
          purchaseBillNo: purchaseBill?.billNo || null,
          sourceType: 'GRN',
          status: 'AVAILABLE',
          remarks: item.remarks
        }));
      if (storeItems.length > 0) await tx.siteStoreStock.createMany({ data: storeItems, skipDuplicates: true });
      return { gtn, grn };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating site GRN:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create GRN' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    if (!body.id || !Array.isArray(body.items)) return NextResponse.json({ error: 'GRN and item details are required.' }, { status: 400 });
    const result = await prisma.$transaction(async tx => {
      const current = await tx.siteGRN.findUnique({ where: { id: body.id }, select: { status: true } });
      if (!current) return null;
      const nextStatus = body.status || current.status;
      const grn = await tx.siteGRN.update({
        where: { id: body.id },
        data: {
        grnType: body.grnType === 'PO' ? 'PO' : 'WITHOUT_PO',
        supplierId: body.supplierId || null,
        supplierName: body.supplierName || null,
        poNo: body.poNo || null,
        grnDate: toDate(body.grnDate) || undefined,
        vehicleNo: body.vehicleNo || null,
        challanNo: body.challanNo || null,
        state: body.state || null,
        ewayBillNo: body.ewayBillNo || null,
        status: nextStatus,
        items: {
          update: body.items.filter(item => item.id).map(item => ({
            where: { id: item.id },
            data: {
              acceptedQty: Number(item.goodQty) || 0,
              retainedQty: Number(item.retainedQty) || 0,
              rejectedQty: Number(item.rejectedQty) || 0,
              challanQty: Number(item.challanQty) || 0,
              budgetHead: item.budgetHead || null,
              storeName: item.storeName || null,
              brand: item.brand || null,
              remarks: item.remarks || null,
              testRequired: Boolean(item.testRequired),
              gtnSrNo: item.gtnSrNo || null,
              document: item.document || null
            }
          }))
        }
        },
        include: { items: true }
      });
      if (nextStatus !== current.status) {
        await tx.siteGRNStatusHistory.create({ data: {
          grnId: body.id,
          fromStatus: current.status,
          toStatus: nextStatus,
          note: 'GRN status updated',
        } });
      }
      return grn;
    });
    if (!result) return NextResponse.json({ error: 'GRN not found.' }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating site GRN:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update GRN' }, { status: 500 });
  }
}
