export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const dateFilter = (from, to, field) => {
  const filter = {};
  if (from || to) filter[field] = {};
  if (from) filter[field].gte = new Date(`${from}T00:00:00`);
  if (to) filter[field].lte = new Date(`${to}T23:59:59`);
  return filter;
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const family = searchParams.get('family') || 'supplier';
  const view = searchParams.get('view') || 'supplier';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const vendorId = searchParams.get('vendorId');

  try {
    if (family === 'payment') {
      const invoices = await prisma.vendorInvoice.findMany({
        where: { ...(vendorId && { vendorId }), ...dateFilter(from, to, 'date') },
        include: { vendor: { select: { name: true, vendorCode: true } }, po: { select: { poNo: true } } },
        orderBy: { date: 'desc' }
      });
      return NextResponse.json({
        rows: invoices.map(invoice => ({
          id: invoice.id,
          invoiceNo: invoice.invoiceNo,
          date: invoice.date,
          dueDate: invoice.dueDate,
          vendor: invoice.vendor?.name || '-',
          vendorCode: invoice.vendor?.vendorCode || '-',
          poNo: invoice.po?.poNo || '-',
          amount: invoice.totalAmount,
          status: invoice.status
        })),
        vendors: await prisma.vendorMaster.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
      });
    }

    const vendors = await prisma.vendorMaster.findMany({
      where: vendorId ? { id: vendorId } : undefined,
      include: {
        purchaseOrders: { where: dateFilter(from, to, 'poDate'), select: { id: true, poNo: true, poDate: true, totalValue: true, status: true } },
        _count: { select: { invoices: true, purchaseOrders: true } }
      },
      orderBy: { name: 'asc' }
    });
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { ...(vendorId && { vendorId }), ...dateFilter(from, to, 'poDate') },
      include: { vendor: { select: { name: true, vendorCode: true } } },
      orderBy: { poDate: 'desc' }
    });
    const rows = view === 'po-analysis' || view === 'supplier-wise-po'
      ? purchaseOrders.map(po => ({ id: po.id, poNo: po.poNo, date: po.poDate, vendor: po.vendor?.name || '-', vendorCode: po.vendor?.vendorCode || '-', project: po.project || '-', value: po.totalValue, status: po.status }))
      : vendors.map(vendor => ({ id: vendor.id, vendor: vendor.name, vendorCode: vendor.vendorCode || '-', contact: vendor.contactPerson || '-', phone: vendor.mobile || '-', rating: vendor.rating || 0, status: vendor.status, poCount: vendor._count.purchaseOrders, invoiceCount: vendor._count.invoices, value: vendor.purchaseOrders.reduce((sum, po) => sum + (po.totalValue || 0), 0) }));
    return NextResponse.json({ rows, vendors: vendors.map(vendor => ({ id: vendor.id, name: vendor.name })) });
  } catch (error) {
    console.error('Purchase report error:', error);
    return NextResponse.json({ error: 'Unable to load purchase report' }, { status: 500 });
  }
}
