export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const groups = await prisma.supplierGroup.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching supplier groups:', error);
    return NextResponse.json({ error: 'Failed to fetch supplier groups' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name } = await req.json();
    const group = await prisma.supplierGroup.create({ data: { name } });
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error creating supplier group:', error);
    return NextResponse.json({ error: 'Failed to create supplier group' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, name } = await req.json();
    const group = await prisma.supplierGroup.update({ where: { id }, data: { name } });
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating supplier group:', error);
    return NextResponse.json({ error: 'Failed to update supplier group' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await prisma.supplierGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier group:', error);
    return NextResponse.json({ error: 'Failed to delete supplier group' }, { status: 500 });
  }
}
