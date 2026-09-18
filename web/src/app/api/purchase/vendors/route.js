export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const vendors = await prisma.vendorMaster.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(vendors);
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

    const vendor = await prisma.vendorMaster.create({
      data: {
        vendorCode,
        name: body.name,
        type: body.type,
        contactPerson: body.contactPerson,
        mobile: body.mobile,
        email: body.email,
        address: body.address,
        city: body.city,
        state: body.state,
        gstin: body.gstin,
        pan: body.pan,
        msmeStatus: body.msmeStatus === true || body.msmeStatus === 'true',
        bankName: body.bankName,
        accountNo: body.accountNo,
        ifsc: body.ifsc,
        paymentTerms: body.paymentTerms,
        creditDays: parseInt(body.creditDays) || 0,
        category: body.category,
        createdById: body.createdById
      }
    });

    return NextResponse.json(vendor, { status: 201 });
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

    const vendor = await prisma.vendorMaster.update({
      where: { id: body.id },
      data: {
        name: body.name,
        type: body.type,
        contactPerson: body.contactPerson,
        mobile: body.mobile,
        email: body.email,
        address: body.address,
        city: body.city,
        state: body.state,
        gstin: body.gstin,
        pan: body.pan,
        msmeStatus: body.msmeStatus === true || body.msmeStatus === 'true',
        bankName: body.bankName,
        accountNo: body.accountNo,
        ifsc: body.ifsc,
        paymentTerms: body.paymentTerms,
        creditDays: parseInt(body.creditDays, 10) || 0,
        category: body.category,
        status: body.status || 'Active'
      }
    });

    return NextResponse.json(vendor);
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
