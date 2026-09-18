export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const groups = await prisma.contractorGroup.findMany({
      orderBy: { name: 'asc' },
      include: {
        contractors: { select: { id: true, companyName: true, contactPerson: true } }
      }
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching contractor groups:', error);
    return NextResponse.json({ error: 'Failed to fetch contractor groups' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, contractorIds } = await req.json();
    const group = await prisma.contractorGroup.create({
      data: { 
        name,
        contractors: {
          connect: (contractorIds || []).map(id => ({ id }))
        }
      },
      include: { contractors: true }
    });
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error creating contractor group:', error);
    return NextResponse.json({ error: 'Failed to create contractor group' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, name, contractorIds } = await req.json();
    const group = await prisma.contractorGroup.update({
      where: { id },
      data: { 
        name,
        contractors: {
          set: (contractorIds || []).map(cid => ({ id: cid }))
        }
      },
      include: { contractors: true }
    });
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating contractor group:', error);
    return NextResponse.json({ error: 'Failed to update contractor group' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.contractorGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contractor group:', error);
    return NextResponse.json({ error: 'Failed to delete contractor group' }, { status: 500 });
  }
}
