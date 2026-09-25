export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (id) {
      const supplier = await prisma.supplier.findUnique({ where: { id } });
      if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
      return NextResponse.json(supplier);
    }
    
    const suppliers = await prisma.supplier.findMany({ 
      include: { contractors: true },
      orderBy: { name: 'asc' } 
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    let createData = { ...data };
    if (data.contractorIds && Array.isArray(data.contractorIds)) {
      createData.contractors = {
        connect: data.contractorIds.map(id => ({ id }))
      };
      delete createData.contractorIds;
    }
    const supplier = await prisma.supplier.create({ data: createData, include: { contractors: true } });
    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const data = await req.json();
    const { id, contractorIds, ...updateData } = data;
    
    if (contractorIds && Array.isArray(contractorIds)) {
      updateData.contractors = {
        set: contractorIds.map(cid => ({ id: cid }))
      };
    }
    
    const supplier = await prisma.supplier.update({ 
      where: { id }, 
      data: updateData,
      include: { contractors: true }
    });
    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 });
  }
}
