import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export async function POST(request) {
  try {
    const { documentType, id, to, sentBy } = await request.json();
    if (!id || !['purchase-order', 'purchase-bill', 'work-order', 'vendor-master', 'purchase-indent'].includes(documentType)) {
      return NextResponse.json({ error: 'A supported document type and id are required.' }, { status: 400 });
    }

    let recipient = String(to || '').trim();
    let number = '';
    let details = [];
    let title = '';
    if (documentType === 'purchase-order') {
      const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      if (!po) return NextResponse.json({ error: 'Purchase order not found.' }, { status: 404 });
      recipient ||= po.supplierEmail || '';
      number = po.poNumber;
      title = 'Purchase Order';
      details = [['Supplier', po.supplierName], ['Project', po.projectName], ['Total', `₹${Number(po.totalAmount || 0).toLocaleString('en-IN')}`]];
      details.push(['Items', (po.items || []).map(item => `${item.description} — ${item.quantity} ${item.unit} @ ₹${Number(item.rate || 0).toLocaleString('en-IN')}`).join('<br/>') || '—']);
    } else if (documentType === 'purchase-bill') {
      const bill = await prisma.vendorBill.findUnique({ where: { id } });
      if (!bill) return NextResponse.json({ error: 'Purchase bill not found.' }, { status: 404 });
      const vendor = await prisma.vendorMaster.findUnique({ where: { id: bill.vendorId } }).catch(() => null);
      recipient ||= vendor?.email || '';
      number = bill.billNo;
      title = 'Purchase Bill';
      details = [['Vendor', vendor?.name || ''], ['Bill date', new Date(bill.billDate).toLocaleDateString('en-IN')], ['Net payable', `₹${Number(bill.netAmount || 0).toLocaleString('en-IN')}`]];
    } else if (documentType === 'work-order') {
      const order = await prisma.workOrder.findUnique({ where: { id } });
      if (!order) return NextResponse.json({ error: 'Work order not found.' }, { status: 404 });
      const contractor = order.contractorId
        ? await prisma.contractor.findUnique({ where: { id: order.contractorId } }).catch(() => null)
        : null;
      recipient ||= contractor?.email || '';
      number = order.woNo;
      title = 'Work Order';
      details = [['Contractor', order.contractorName], ['Status', order.status], ['Contract value', `₹${Number(order.contractValue || 0).toLocaleString('en-IN')}`]];
      try {
        const scope = JSON.parse(order.scope || '{}');
        const lines = (scope.items || []).map(item => `${item.description} — ${item.qty || item.quantity || 0} ${item.unit || ''} @ ₹${Number(item.rate || 0).toLocaleString('en-IN')}`);
        if (lines.length) details.push(['Scope', lines.join('<br/>')]);
      } catch { /* Keep the email summary when old scope data is not JSON. */ }
    } else if (documentType === 'vendor-master') {
      const vendor = await prisma.vendorMaster.findUnique({ where: { id } });
      if (!vendor) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
      recipient ||= vendor.email || '';
      number = vendor.vendorCode;
      title = 'Vendor Master';
      details = [['Vendor', vendor.name], ['Contact', vendor.contactPerson], ['Mobile', vendor.mobile], ['Category', vendor.category], ['GSTIN', vendor.gstin]];
    } else {
      const indent = await prisma.purchaseIndent.findUnique({ where: { id }, include: { items: true, requestedBy: true } });
      if (!indent) return NextResponse.json({ error: 'Purchase indent not found.' }, { status: 404 });
      recipient ||= indent.requestedBy?.email || '';
      number = indent.prNo;
      title = 'Purchase Indent';
      details = [['Requester', indent.requestedBy?.name], ['Project', indent.project], ['Site', indent.site], ['Status', indent.status], ['Required date', indent.requiredDate ? new Date(indent.requiredDate).toLocaleDateString('en-IN') : '—'], ['Items', (indent.items || []).map(item => `${item.item} — ${item.quantity} ${item.unit}`).join('<br/>') || '—']];
    }

    if (!/^\S+@\S+\.\S+$/.test(recipient)) {
      return NextResponse.json({ error: 'Add a valid recipient email address first.' }, { status: 400 });
    }

    const subject = `${title} ${number}`;
    const html = `<div style="font-family:Arial,sans-serif;color:#0f172a"><h2>${escapeHtml(title)} ${escapeHtml(number)}</h2><p>Please find the ${title.toLowerCase()} details below. A printable HTML copy is attached.</p><table style="border-collapse:collapse">${details.map(([label, value]) => `<tr><th style="text-align:left;padding:6px 14px 6px 0">${escapeHtml(label)}</th><td style="padding:6px">${escapeHtml(value || '—').replaceAll('&lt;br/&gt;', '<br/>')}</td></tr>`).join('')}</table><p style="color:#64748b">This message was sent from CeCube Engineering.</p></div>`;
    const attachmentHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} ${escapeHtml(number)}</title></head><body>${html}</body></html>`;
    const result = await sendEmail({ to: recipient, subject, html, attachments: [{
      filename: `${String(number).replace(/[^a-zA-Z0-9_-]/g, '_')}.html`,
      content: attachmentHtml,
      contentType: 'text/html; charset=utf-8',
    }] });
    if (!result.success) return NextResponse.json({ error: result.error || 'Email could not be sent.' }, { status: 502 });

    await prisma.emailLog.create({
      data: { subject, message: `${title} ${number}`, recipientCount: 1, recipientEmails: recipient,
        recipientNames: '', emailType: documentType, status: result.mocked ? 'MOCKED' : 'SENT', sentBy: sentBy || null },
    }).catch(error => console.error('Email log write failed', error));
    return NextResponse.json({ success: true, recipient, mocked: !!result.mocked });
  } catch (error) {
    console.error('Document email send failed', error);
    return NextResponse.json({ error: error.message || 'Unable to send document email.' }, { status: 500 });
  }
}
