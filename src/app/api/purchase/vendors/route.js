export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { normalizeMasterRecordStatus } from '@/lib/masterRecordStatus';
import { writeMasterRecordStatusAudit } from '@/lib/serverMasterStatusAudit';

export async function GET(req) {
  try {
    const vendors = await prisma.vendorMaster.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(vendors.map(vendor => ({
      ...vendor,
      status: normalizeMasterRecordStatus(vendor.status, vendor.status),
      documents: (() => {
        try { return vendor.documents ? JSON.parse(vendor.documents) : []; } catch { return []; }
      })()
    })));
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const count = await prisma.vendorMaster.count();
    const vendorCode = body.vendorCode || `VND-${String(count + 1).padStart(4, '0')}`;
    const status = normalizeMasterRecordStatus(body.status, 'Active');
    if (!status) return NextResponse.json({ error: 'Invalid vendor status' }, { status: 400 });

    const session = readAuthSession(req);
    const vendor = await prisma.$transaction(async tx => {
      const createdVendor = await tx.vendorMaster.create({
        data: {
          vendorCode,
          name: body.name,
          type: body.type,
          contactPerson: body.contactPerson,
          mobile: body.mobile,
          whatsappNo: body.whatsappNo,
          email: body.email,
          address: body.address,
          godownAddress: body.godownAddress,
          city: body.city,
          state: body.state,
          gstin: body.gstin,
          pan: body.pan,
          faxNo: body.faxNo,
          website: body.website,
          msmeStatus: body.msmeStatus === true || body.msmeStatus === 'true',
          bankName: body.bankName,
          accountNo: body.accountNo,
          ifsc: body.ifsc,
          accountName: body.accountName,
          paymentTerms: body.paymentTerms,
          creditDays: parseInt(body.creditDays) || 0,
          category: body.category,
          fixedGroup: body.fixedGroup,
          documents: JSON.stringify(Array.isArray(body.documents) ? body.documents : []),
          status,
          createdById: body.createdById
        }
      });
      await writeMasterRecordStatusAudit(tx, req, session, {
        entityType: 'VendorMaster',
        entityId: createdVendor.id,
        oldStatus: null,
        newStatus: status
      });
      return createdVendor;
    });

    return NextResponse.json({
      ...vendor,
      status: normalizeMasterRecordStatus(vendor.status, vendor.status),
      documents: (() => {
        try { return vendor.documents ? JSON.parse(vendor.documents) : []; } catch { return []; }
      })()
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json({ error: error.message || 'Failed to create vendor' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Vendor id is required' }, { status: 400 });
    }

    const existingVendor = await prisma.vendorMaster.findUnique({ where: { id: body.id } });
    if (!existingVendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

    const status = body.action === 'approve'
      ? 'Approved'
      : body.action === 'reject'
        ? 'Unapproved'
        : body.status === undefined
          ? existingVendor.status
          : normalizeMasterRecordStatus(body.status);
    if (!status) return NextResponse.json({ error: 'Invalid vendor status' }, { status: 400 });

    const session = readAuthSession(req);
    const vendor = await prisma.$transaction(async tx => {
      const updatedVendor = await tx.vendorMaster.update({
        where: { id: body.id },
        data: body.action === 'approve' || body.action === 'reject'
          ? { status }
          : {
              name: body.name,
              type: body.type,
              contactPerson: body.contactPerson,
              mobile: body.mobile,
              whatsappNo: body.whatsappNo,
              email: body.email,
              address: body.address,
              godownAddress: body.godownAddress,
              city: body.city,
              state: body.state,
              gstin: body.gstin,
              pan: body.pan,
              faxNo: body.faxNo,
              website: body.website,
              msmeStatus: body.msmeStatus === true || body.msmeStatus === 'true',
              bankName: body.bankName,
              accountNo: body.accountNo,
              ifsc: body.ifsc,
              accountName: body.accountName,
              paymentTerms: body.paymentTerms,
              creditDays: parseInt(body.creditDays, 10) || 0,
              category: body.category,
              fixedGroup: body.fixedGroup,
              documents: body.documents !== undefined
                ? JSON.stringify(Array.isArray(body.documents) ? body.documents : [])
                : existingVendor.documents,
              status
            }
      });
      await writeMasterRecordStatusAudit(tx, req, session, {
        entityType: 'VendorMaster',
        entityId: body.id,
        oldStatus: existingVendor.status,
        newStatus: status
      });
      return updatedVendor;
    });

    return NextResponse.json({
      ...vendor,
      status: normalizeMasterRecordStatus(vendor.status, vendor.status),
      documents: (() => {
        try { return vendor.documents ? JSON.parse(vendor.documents) : []; } catch { return []; }
      })()
    });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json({ error: error.message || 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Vendor id is required' }, { status: 400 });
    }

    await prisma.vendorMaster.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'This vendor is already used in purchase records and cannot be deleted.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete vendor' }, { status: 500 });
  }
}
