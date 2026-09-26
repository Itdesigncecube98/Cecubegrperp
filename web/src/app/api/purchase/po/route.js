export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function getVendorFallback(vendorId) {
  if (!vendorId) return null;
  return prisma.vendorMaster.findUnique({ where: { id: vendorId } });
}

async function getProjectLocation(projectId, projectName) {
  const project = projectId
    ? await prisma.projectMaster.findUnique({ where: { id: projectId } })
    : projectName
      ? await prisma.projectMaster.findFirst({ where: { name: projectName } })
      : null;
  if (project?.location) return project.location;
  const legacyProject = projectName
    ? await prisma.project.findFirst({ where: { name: projectName }, select: { state: true } })
    : null;
  return legacyProject?.state || '';
}

function normalizeMaterialName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const id = searchParams.get('id');

    const where = {};
    const VALID_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED'];
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }
    if (id) where.id = id;

    // PurchaseOrder only has items[] and grns[] as relations
    // Supplier info is stored as flat fields: supplierName, supplierAddress, etc.
    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: true,
        grns: {
          select: {
            id: true,
            grnNumber: true,   // field is grnNumber, not grnNo
            status: true,
            items: {
              select: {
                poItemId: true,
                receivedQty: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const libraryItems = await prisma.materialLibraryItem.findMany({
      where: { resourceType: 'Material' },
      select: {
        name: true,
        group: { select: { libraryId: true, library: { select: { name: true } } } }
      }
    });
    const libraryMatches = libraryItems.map(item => ({
      key: normalizeMaterialName(item.name),
      name: item.group?.library?.name || '',
      libraryId: item.group?.libraryId || null
    })).filter(item => item.key && item.name);

    const resolveMaterialLibrary = description => {
      const key = normalizeMaterialName(description);
      if (!key) return null;
      return libraryMatches.find(item => item.key === key)
        || libraryMatches.find(item => item.key.includes(key) || key.includes(item.key))
        || null;
    };

    const enriched = await Promise.all(pos.map(async po => {
      const vendor = await getVendorFallback(po.supplierId);
      const projectLocation = await getProjectLocation(po.projectId, po.projectName);
      let remarkData = {};
      try {
        const parsed = po.remarks ? JSON.parse(po.remarks) : {};
        remarkData = parsed && typeof parsed === 'object' ? parsed : {};
        if (typeof remarkData.remarks === 'string') {
          const nested = JSON.parse(remarkData.remarks);
          if (nested && typeof nested === 'object') remarkData = { ...remarkData, ...nested };
        }
      } catch (error) {
        remarkData = {};
      }
      const resolvedItems = (po.items || []).map(item => ({
        ...item,
        materialLibrary: resolveMaterialLibrary(item.description)
      }));
      const poLibrary = resolvedItems.find(item => item.materialLibrary)?.materialLibrary || null;
      return {
        ...po,
        items: resolvedItems.map(item => ({
          ...item,
          materialLibrary: item.materialLibrary || poLibrary
        })),
        supplierContact: po.supplierContact || vendor?.contactPerson || null,
        supplierPhone: po.supplierPhone || vendor?.whatsappNo || vendor?.mobile || null,
        supplierEmail: po.supplierEmail || vendor?.email || null,
        supplierGstin: po.supplierGstin || vendor?.gstin || vendor?.gstNo || null,
        supplierPan: po.supplierPan || vendor?.pan || vendor?.panNumber || null,
        supplierAddress: po.supplierAddress || vendor?.address || '',
        deliveryAddress: po.deliveryAddress || projectLocation,
        deliveryContact: po.deliveryContact || remarkData.siteContactPerson || null,
        deliveryPhone: po.deliveryPhone || remarkData.siteContactDetail || null
      };
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching POs:', error);
    return NextResponse.json({ error: 'Failed to fetch POs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const vendor = await getVendorFallback(body.supplierId);
    const projectLocation = await getProjectLocation(body.projectId, body.projectName);

    // Generate PO number
    const count = await prisma.purchaseOrder.count();
    const poNumber = body.poNumber || `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // PurchaseOrder schema uses: supplierName, supplierAddress, supplierContact,
    // supplierPhone, supplierEmail, supplierGstin, supplierPan, supplierId (optional)
    // Financial: subTotal, cgstAmount, sgstAmount, igstAmount, totalTaxAmount, totalAmount
    // Workflow: companyId, projectId, projectName, preparedBy, preparedByName, approvedBy, approvedByName
    // Relations: items[], grns[]

    const items = body.items || [];
    let subTotal = 0;
    items.forEach(item => {
      subTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
    });

    const cgstAmount = parseFloat(body.cgstAmount) || 0;
    const sgstAmount = parseFloat(body.sgstAmount) || 0;
    const igstAmount = parseFloat(body.igstAmount) || 0;
    const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;

    const discount = parseFloat(body.discount) || 0;
    const freight = parseFloat(body.freight) || 0;
    const otherCharges = parseFloat(body.otherCharges) || 0;
    const totalAmount = subTotal - discount + totalTaxAmount + freight + otherCharges;
    
    const extraData = {
      discount,
      freight,
      otherCharges,
      remarks: body.remarks || ''
    };

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        poDate: body.poDate ? new Date(body.poDate) : new Date(),
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        status: 'DRAFT',

        // Supplier info (flat fields — no vendor relation on this model)
        supplierId: body.supplierId || null,
        supplierName: body.supplierName || '',
        supplierAddress: body.supplierAddress || vendor?.address || '',
        supplierContact: body.supplierContact || vendor?.contactPerson || null,
        supplierPhone: body.supplierPhone || vendor?.whatsappNo || vendor?.mobile || null,
        supplierEmail: body.supplierEmail || vendor?.email || null,
        supplierGstin: body.supplierGstin || vendor?.gstin || vendor?.gstNo || null,
        supplierPan: body.supplierPan || vendor?.pan || vendor?.panNumber || null,

        // Delivery
        deliveryAddress: body.deliveryAddress || projectLocation,
        deliveryContact: body.deliveryContact || null,
        deliveryPhone: body.deliveryPhone || null,

        // Financials
        subTotal,
        cgstPercent: parseFloat(body.cgstPercent) || 0,
        cgstAmount,
        sgstPercent: parseFloat(body.sgstPercent) || 0,
        sgstAmount,
        igstPercent: parseFloat(body.igstPercent) || 0,
        igstAmount,
        totalTaxAmount,
        roundOff: parseFloat(body.roundOff) || 0,
        totalAmount,
        totalAmountWords: body.totalAmountWords || null,

        // Terms
        paymentTerms: body.paymentTerms || null,
        scopeOfWork: body.scopeOfWork || null,
        deliverySchedule: body.deliverySchedule || null,
        otherTerms: body.otherTerms || null,

        // Workflow
        companyId: body.companyId || '',
        projectId: body.projectId || null,
        projectName: body.projectName || null,
        preparedBy: body.preparedBy || null,
        preparedByName: body.preparedByName || 'Purchase Manager',
        approvedBy: body.approvedBy || null,
        approvedByName: body.approvedByName || 'Director',
        remarks: JSON.stringify(extraData),

        items: {
          create: items.map((item, idx) => ({
            sNo: item.sNo || idx + 1,
            description: item.description || item.item || '',
            hsnCode: item.hsnCode || null,
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit || 'Nos',
            rate: parseFloat(item.rate) || 0,
            discountPercent: parseFloat(item.discountPercent) || 0,
            taxableAmount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0),
            gstPercent: parseFloat(item.gstPercent) || 0,
            gstAmount: ((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)) * ((parseFloat(item.gstPercent) || 0) / 100),
            totalAmount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) * (1 + (parseFloat(item.gstPercent) || 0) / 100),
            pendingQty: parseFloat(item.quantity) || 0,
            specifications: item.specifications || item.specification || null,
            remarks: item.remarks || null,
          }))
        }
      },
      include: {
        items: true,
        grns: true
      }
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    console.error('Error creating PO:', error);
    return NextResponse.json({ error: error.message || 'Failed to create PO' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, action, status } = body;
    if (!id) return NextResponse.json({ error: 'PO id is required' }, { status: 400 });

    const VALID_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED'];

    if (!action && !status) {
      const vendor = await getVendorFallback(body.supplierId);
      const projectLocation = await getProjectLocation(body.projectId, body.projectName);
      const items = body.items || [];
      const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
      const cgstAmount = parseFloat(body.cgstAmount) || 0;
      const sgstAmount = parseFloat(body.sgstAmount) || 0;
      const igstAmount = parseFloat(body.igstAmount) || 0;
      const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
      
      const discount = parseFloat(body.discount) || 0;
      const freight = parseFloat(body.freight) || 0;
      const otherCharges = parseFloat(body.otherCharges) || 0;
      
      const extraData = {
        discount,
        freight,
        otherCharges,
        remarks: body.remarks || ''
      };
      
      const updated = await prisma.$transaction(async tx => {
        await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
        return tx.purchaseOrder.update({
          where: { id },
          data: {
            poDate: body.poDate ? new Date(body.poDate) : undefined,
            deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
            supplierId: body.supplierId || null,
            supplierName: body.supplierName || vendor?.name || '', supplierAddress: body.supplierAddress || vendor?.address || '',
            supplierContact: body.supplierContact || vendor?.contactPerson || null, supplierPhone: body.supplierPhone || vendor?.whatsappNo || vendor?.mobile || null,
            supplierEmail: body.supplierEmail || vendor?.email || null, supplierGstin: body.supplierGstin || vendor?.gstin || vendor?.gstNo || null,
            supplierPan: body.supplierPan || vendor?.pan || vendor?.panNumber || null, projectName: body.projectName || null, deliveryAddress: body.deliveryAddress || projectLocation,
            paymentTerms: body.paymentTerms || null, scopeOfWork: body.scopeOfWork || null,
            deliverySchedule: body.deliverySchedule || null, otherTerms: body.otherTerms || null,
            subTotal, totalTaxAmount, totalAmount: subTotal - discount + totalTaxAmount + freight + otherCharges,
            remarks: JSON.stringify(extraData),
            roundOff: parseFloat(body.roundOff) || 0, totalAmountWords: body.totalAmountWords || null,
            items: { create: items.map((item, index) => ({
              sNo: item.sNo || index + 1, description: item.description || item.item || '',
              hsnCode: item.hsnCode || null,
              quantity: parseFloat(item.quantity) || 0, unit: item.unit || 'Nos', rate: parseFloat(item.rate) || 0,
              discountPercent: parseFloat(item.discountPercent || item.itemDiscount) || 0,
              taxableAmount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0),
              gstPercent: parseFloat(item.gstPercent) || 0,
              gstAmount: ((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)) * ((parseFloat(item.gstPercent) || 0) / 100),
              totalAmount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) * (1 + (parseFloat(item.gstPercent) || 0) / 100),
              pendingQty: parseFloat(item.quantity) || 0,
              specifications: item.specifications || item.specification || null,
            })) }
          }, include: { items: true }
        });
      });
      return NextResponse.json(updated);
    }

    let newStatus;
    if (action === 'approve') newStatus = 'APPROVED';
    else if (action === 'submit') newStatus = 'PENDING_APPROVAL';
    else if (action === 'reject') newStatus = 'CANCELLED';
    else if (status && VALID_STATUSES.includes(status)) newStatus = status;
    else return NextResponse.json({ error: 'Invalid action or status' }, { status: 400 });

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: newStatus },
      include: { items: true }
    });

    return NextResponse.json(po);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to update purchase order' }, { status: 500 });
  }
}
