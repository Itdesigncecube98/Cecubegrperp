import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { vendorCode: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {};

    const vendors = await prisma.vendorMaster.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        vendorCode: true,
        name: true,
        contactPerson: true,
        mobile: true,
        email: true,
        address: true,
        city: true,
        state: true,
        gstin: true
      }
    });

    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const vendor = await prisma.vendorMaster.create({
      data: {
        vendorCode: body.vendorCode,
        name: body.name,
        type: body.type,
        contactPerson: body.contactPerson,
        mobile: body.mobile || body.mobileNo,
        email: body.email,
        address: body.address,
        city: body.city,
        state: body.state,
        gstin: body.gstin || body.gstNo,
        pan: body.pan || body.panNo,
        bankName: body.bankName,
        accountNo: body.accountNo || body.bankAccountNo,
        ifsc: body.ifsc || body.bankIFSC,
        paymentTerms: body.paymentTerms,
        creditDays: body.creditDays ? parseInt(body.creditDays, 10) : 0,
        status: body.status || 'Active'
      }
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}
