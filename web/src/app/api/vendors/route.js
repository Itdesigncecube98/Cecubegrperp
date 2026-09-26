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
        mobileNo: true,
        email: true,
        address: true,
        city: true,
        state: true,
        gstNo: true
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
        contactPerson: body.contactPerson,
        mobileNo: body.mobileNo,
        email: body.email,
        address: body.address,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        gstNo: body.gstNo,
        panNo: body.panNo,
        bankName: body.bankName,
        bankAccountNo: body.bankAccountNo,
        bankIFSC: body.bankIFSC,
        paymentTerms: body.paymentTerms,
        creditLimit: body.creditLimit ? parseFloat(body.creditLimit) : null,
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
