export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const REPORT_VIEWS = {
  supplier: ['summary', 'po-analysis', 'supplier-wise-transaction', 'supplier-wise-po'],
  payment: ['summary', 'details', 'date-tracking', 'ageing']
};

const amount = value => Number(value || 0);

function parseDate(value, endOfDay = false) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateFilter(from, to, field) {
  const gte = parseDate(from);
  const lte = parseDate(to, true);
  return (gte || lte) ? { [field]: { ...(gte && { gte }), ...(lte && { lte }) } } : {};
}

function addDays(date, days) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + (Number(days) || 0));
  return result;
}

function billStatus(bill, vendor, today) {
  const outstanding = Math.max(0, amount(bill.netAmount) - amount(bill.paidAmount));
  if (outstanding === 0) return 'Paid';
  const dueDate = addDays(bill.billDate, vendor?.creditDays);
  if (dueDate < today) return 'Overdue';
  return amount(bill.paidAmount) > 0 ? 'Part-paid' : 'Unpaid';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const family = searchParams.get('family') || 'supplier';
  const view = searchParams.get('view') || 'supplier';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const vendorId = searchParams.get('vendorId') || '';

  if (!REPORT_VIEWS[family]?.includes(view)) {
    return NextResponse.json({ error: 'Unknown purchase report.' }, { status: 400 });
  }
  if ((from && !parseDate(from)) || (to && !parseDate(to, true))) {
    return NextResponse.json({ error: 'Enter valid report dates.' }, { status: 400 });
  }
  if (from && to && from > to) {
    return NextResponse.json({ error: 'The start date must be on or before the end date.' }, { status: 400 });
  }

  try {
    const vendors = await prisma.vendorMaster.findMany({
      select: {
        id: true,
        vendorCode: true,
        name: true,
        creditDays: true,
        status: true
      },
      orderBy: { name: 'asc' }
    });
    const selectedVendors = vendorId ? vendors.filter(vendor => vendor.id === vendorId) : vendors;
    const vendorById = new Map(vendors.map(vendor => [vendor.id, vendor]));
    const vendorByName = new Map(vendors.map(vendor => [vendor.name.trim().toLowerCase(), vendor]));
    const selectedVendor = id => vendorId ? id === vendorId : true;

    if (family === 'supplier') {
      const [purchaseOrders, bills] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where: {
            ...(vendorId && { supplierId: vendorId }),
            ...dateFilter(from, to, 'poDate')
          },
          select: {
            id: true,
            poNumber: true,
            poDate: true,
            supplierId: true,
            supplierName: true,
            projectName: true,
            totalAmount: true,
            status: true
          },
          orderBy: { poDate: 'desc' }
        }),
        prisma.vendorBill.findMany({
          where: {
            ...(vendorId && { vendorId }),
            ...dateFilter(from, to, 'billDate')
          },
          select: { id: true, vendorId: true, grossAmount: true, netAmount: true, paidAmount: true }
        })
      ]);

      const metricsByVendor = new Map();
      const metricsFor = vendor => {
        if (!metricsByVendor.has(vendor.id)) {
          metricsByVendor.set(vendor.id, { poCount: 0, poValue: 0, billCount: 0, billedValue: 0, paidValue: 0, outstanding: 0 });
        }
        return metricsByVendor.get(vendor.id);
      };

      for (const po of purchaseOrders) {
        const vendor = vendorById.get(po.supplierId) || vendorByName.get((po.supplierName || '').trim().toLowerCase());
        if (!vendor || !selectedVendor(vendor.id)) continue;
        const metrics = metricsFor(vendor);
        metrics.poCount += 1;
        metrics.poValue += amount(po.totalAmount);
      }
      for (const bill of bills) {
        const vendor = vendorById.get(bill.vendorId);
        if (!vendor || !selectedVendor(vendor.id)) continue;
        const metrics = metricsFor(vendor);
        metrics.billCount += 1;
        metrics.billedValue += amount(bill.netAmount);
        metrics.paidValue += amount(bill.paidAmount);
        metrics.outstanding += Math.max(0, amount(bill.netAmount) - amount(bill.paidAmount));
      }

      let rows;
      if (view === 'po-analysis' || view === 'supplier-wise-po') {
        rows = purchaseOrders.map(po => ({
          id: po.id,
          poNo: po.poNumber,
          date: po.poDate,
          vendor: po.supplierName || vendorById.get(po.supplierId)?.name || '-',
          vendorCode: vendorById.get(po.supplierId)?.vendorCode || '-',
          project: po.projectName || '-',
          value: amount(po.totalAmount),
          status: po.status
        }));
      } else if (view === 'supplier-wise-transaction') {
        const transactionBills = await prisma.vendorBill.findMany({
          where: { ...(vendorId && { vendorId }), ...dateFilter(from, to, 'billDate') },
          orderBy: { billDate: 'desc' },
          select: { id: true, billNo: true, billDate: true, poNo: true, vendorId: true, grossAmount: true, netAmount: true, paidAmount: true, status: true }
        });
        rows = transactionBills.map(bill => {
          const vendor = vendorById.get(bill.vendorId);
          return {
            id: bill.id,
            billNo: bill.billNo,
            date: bill.billDate,
            vendor: vendor?.name || '-',
            vendorCode: vendor?.vendorCode || '-',
            poNo: bill.poNo || '-',
            value: amount(bill.netAmount),
            paidValue: amount(bill.paidAmount),
            outstanding: Math.max(0, amount(bill.netAmount) - amount(bill.paidAmount)),
            status: bill.status
          };
        });
      } else if (view === 'summary') {
        rows = selectedVendors.map(vendor => ({
          id: vendor.id,
          vendorCode: vendor.vendorCode || '-',
          vendor: vendor.name,
          poCount: metricsByVendor.get(vendor.id)?.poCount || 0,
          poValue: metricsByVendor.get(vendor.id)?.poValue || 0,
          billCount: metricsByVendor.get(vendor.id)?.billCount || 0,
          billedValue: metricsByVendor.get(vendor.id)?.billedValue || 0,
          paidValue: metricsByVendor.get(vendor.id)?.paidValue || 0,
          outstanding: metricsByVendor.get(vendor.id)?.outstanding || 0,
          status: vendor.status
        }))
          .filter(row => row.poCount || row.billCount)
          .sort((a, b) => b.poValue - a.poValue || b.billedValue - a.billedValue);
      }

      return NextResponse.json({
        rows,
        vendors: vendors.map(({ id, name }) => ({ id, name })),
        stats: {
          records: rows.length,
          purchaseOrders: purchaseOrders.length,
          purchaseValue: purchaseOrders.reduce((sum, po) => sum + amount(po.totalAmount), 0),
          billedValue: bills.reduce((sum, bill) => sum + amount(bill.netAmount), 0),
          paidValue: bills.reduce((sum, bill) => sum + amount(bill.paidAmount), 0),
          outstanding: bills.reduce((sum, bill) => sum + Math.max(0, amount(bill.netAmount) - amount(bill.paidAmount)), 0)
        }
      });
    }

    const bills = await prisma.vendorBill.findMany({
        where: { ...(vendorId && { vendorId }), ...dateFilter(from, to, 'billDate') },
        include: { voucher: { select: { voucherDate: true } } },
        orderBy: { billDate: 'desc' }
      });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentRows = bills.map(bill => {
      const vendor = vendorById.get(bill.vendorId);
      const creditDays = Number(vendor?.creditDays) || 0;
      const dueDate = addDays(bill.billDate, creditDays);
      const netAmount = amount(bill.netAmount);
      const paidAmount = amount(bill.paidAmount);
      const outstanding = Math.max(0, netAmount - paidAmount);
      const daysOverdue = outstanding > 0 ? Math.max(0, Math.floor((today - dueDate) / 86400000)) : 0;
      return {
        id: bill.id,
        invoiceNo: bill.billNo,
        date: bill.billDate,
        dueDate,
        paymentDate: bill.voucher?.voucherDate || null,
        vendor: vendor?.name || 'Unknown supplier',
        vendorCode: vendor?.vendorCode || '-',
        poNo: bill.poNo || '-',
        amount: amount(bill.grossAmount),
        netAmount,
        paidAmount,
        outstanding,
        daysOverdue,
        creditDays,
        status: billStatus(bill, vendor, today)
      };
    });

    let rows = paymentRows;
    if (view === 'summary') {
      const byStatus = new Map();
      for (const row of paymentRows) {
        const group = byStatus.get(row.status) || { id: row.status, status: row.status, billCount: 0, amount: 0, paidAmount: 0, outstanding: 0 };
        group.billCount += 1;
        group.amount += row.netAmount;
        group.paidAmount += row.paidAmount;
        group.outstanding += row.outstanding;
        byStatus.set(row.status, group);
      }
      rows = [...byStatus.values()].sort((a, b) => a.status.localeCompare(b.status));
    } else if (view === 'ageing') {
      const buckets = [
        { id: 'not-due', bucket: 'Not due', min: -Infinity, max: 0 },
        { id: '1-30', bucket: '1–30 days', min: 1, max: 30 },
        { id: '31-60', bucket: '31–60 days', min: 31, max: 60 },
        { id: '61-90', bucket: '61–90 days', min: 61, max: 90 },
        { id: '90-plus', bucket: 'Over 90 days', min: 91, max: Infinity }
      ];
      rows = buckets.map(bucket => {
        const matches = paymentRows.filter(row => row.outstanding > 0 && (
          bucket.id === 'not-due' ? row.daysOverdue === 0 && row.dueDate >= today : row.daysOverdue >= bucket.min && row.daysOverdue <= bucket.max
        ));
        return {
          id: bucket.id,
          bucket: bucket.bucket,
          billCount: matches.length,
          amount: matches.reduce((sum, row) => sum + row.outstanding, 0)
        };
      });
    }

    return NextResponse.json({
      rows,
      vendors: vendors.map(({ id, name }) => ({ id, name })),
      stats: {
        records: paymentRows.length,
        purchaseValue: paymentRows.reduce((sum, row) => sum + row.amount, 0),
        billedValue: paymentRows.reduce((sum, row) => sum + row.netAmount, 0),
        paidValue: paymentRows.reduce((sum, row) => sum + row.paidAmount, 0),
        outstanding: paymentRows.reduce((sum, row) => sum + row.outstanding, 0),
        overdue: paymentRows.filter(row => row.daysOverdue > 0).reduce((sum, row) => sum + row.outstanding, 0)
      }
    });
  } catch (error) {
    console.error('Purchase report error:', error);
    return NextResponse.json({ error: 'Unable to load purchase report' }, { status: 500 });
  }
}
