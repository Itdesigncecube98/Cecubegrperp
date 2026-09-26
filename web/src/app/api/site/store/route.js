import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function syncApprovedReceipts() {
  const grns = await prisma.siteGRN.findMany({
    where: { status: { in: ['Received', 'Accepted', 'Approved', 'APPROVED'] } },
    include: { items: true, gtn: { include: { items: true } } }
  });
  const rows = [];
  const poNumbers = [...new Set(grns.map(grn => grn.poNo).filter(Boolean))];
  const bills = poNumbers.length ? await prisma.vendorBill.findMany({
    where: { poNo: { in: poNumbers } },
    select: { poNo: true, billNo: true },
    orderBy: { createdAt: 'desc' }
  }) : [];
  const billByPo = new Map();
  bills.forEach(bill => { if (!billByPo.has(bill.poNo)) billByPo.set(bill.poNo, bill.billNo); });

  for (const grn of grns) {
    for (const item of grn.items) {
      if (Number(item.acceptedQty) <= 0) continue;
      const gtnItem = grn.gtn?.items.find(candidate => candidate.requisitionId === item.requisitionId && candidate.materialName === item.materialName);
      const requiresCompletedTesting = item.testRequired === true;
      const testingApproved = gtnItem?.testStatus === 'Pass'
        || (grn.gtn && ['Completed', 'Approved', 'APPROVED'].includes(grn.gtn.status));
      if (requiresCompletedTesting && !testingApproved) continue;
      if (requiresCompletedTesting && gtnItem?.testStatus === 'Fail') continue;
      rows.push({
        projectId: grn.projectId,
        requisitionId: item.requisitionId,
        grnId: grn.id,
        grnItemId: item.id,
        gtnId: grn.gtnId || null,
        materialName: item.materialName,
        unit: item.unit,
        quantity: Number(item.acceptedQty),
        storeName: item.storeName,
        brand: item.brand,
        poNo: grn.poNo,
        purchaseBillNo: billByPo.get(grn.poNo) || null,
        sourceType: requiresCompletedTesting ? 'GTN' : 'GRN',
        status: 'AVAILABLE',
        receivedAt: grn.grnDate,
        remarks: item.remarks
      });
    }
  }
  if (rows.length) await prisma.siteStoreStock.createMany({ data: rows, skipDuplicates: true });
}

export async function GET(request) {
  try {
    await syncApprovedReceipts();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const where = {
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
      ...(search ? { materialName: { contains: search, mode: 'insensitive' } } : {})
    };
    const stock = await prisma.siteStoreStock.findMany({
      where,
      include: { project: { select: { id: true, projectId: true, name: true } } },
      orderBy: { receivedAt: 'desc' }
    });
    const poNumbers = [...new Set(stock.map(item => item.poNo).filter(Boolean))];
    const bills = poNumbers.length ? await prisma.vendorBill.findMany({
      where: { poNo: { in: poNumbers } },
      select: { poNo: true, billNo: true },
      orderBy: { createdAt: 'desc' }
    }) : [];
    const billByPo = new Map();
    bills.forEach(bill => { if (!billByPo.has(bill.poNo)) billByPo.set(bill.poNo, bill.billNo); });
    const enriched = stock.map(item => ({ ...item, purchaseBillNo: item.purchaseBillNo || billByPo.get(item.poNo) || null }));
    return NextResponse.json({
      items: enriched,
      totals: {
        lines: enriched.length,
        quantity: enriched.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching site store:', error);
    return NextResponse.json({ error: 'Failed to fetch site store' }, { status: 500 });
  }
}
