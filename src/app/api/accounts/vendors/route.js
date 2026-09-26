import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

async function generateVendorCode() {
  const count = await prisma.vendor.count();
  const num = String(count + 1).padStart(4, '0');
  return `VEN-${num}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id       = searchParams.get('id');
    const status   = searchParams.get('status');
    const category = searchParams.get('category');
    const search   = searchParams.get('search');

    if (id) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: { select: { purchaseOrders: true, invoices: true } }
        }
      });
      if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      return NextResponse.json(vendor);
    }

    const where = {};
    if (status)   where.status   = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name:          { contains: search, mode: 'insensitive' } },
        { vendorCode:    { contains: search, mode: 'insensitive' } },
        { gstin:         { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } }
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchaseOrders: true, invoices: true } }
      }
    });

    return NextResponse.json(vendors);
  } catch (error) {
    console.error('GET /api/accounts/vendors:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      vendorCode, name, contactPerson, email, phone, address,
      gstin, pan, bankName, bankAccount, bankIfsc,
      category, status, creditDays, notes
    } = data;

    if (!name) return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 });

    const vendor = await prisma.vendor.create({
      data: {
        vendorCode:    vendorCode    || await generateVendorCode(),
        name,
        contactPerson: contactPerson || null,
        email:         email         || null,
        phone:         phone         || null,
        address:       address       || null,
        gstin:         gstin         || null,
        pan:           pan           || null,
        bankName:      bankName      || null,
        bankAccount:   bankAccount   || null,
        bankIfsc:      bankIfsc      || null,
        category:      category      || 'Supplier',
        status:        status        || 'ACTIVE',
        creditDays:    creditDays    ? parseInt(creditDays) : 30,
        notes:         notes         || null
      }
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('POST /api/accounts/vendors:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Vendor code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Vendor id is required' }, { status: 400 });

    if (updates.creditDays !== undefined) updates.creditDays = parseInt(updates.creditDays);

    const vendor = await prisma.vendor.update({
      where: { id: parseInt(id) },
      data: updates
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('PUT /api/accounts/vendors:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Vendor id is required' }, { status: 400 });

    // Check for linked POs before deleting
    const poCount = await prisma.purchaseOrder.count({ where: { vendorId: parseInt(id) } });
    if (poCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with existing purchase orders. Deactivate instead.' },
        { status: 400 }
      );
    }

    await prisma.vendor.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/accounts/vendors:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
