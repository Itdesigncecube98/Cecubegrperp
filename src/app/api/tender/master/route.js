import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const where = type ? { type } : {};
    const items = await prisma.tenderMaster.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(req) {
  const body = await req.json();
  if (!body.type || !body.name) {
    return NextResponse.json({ error: 'type and name are required' }, { status: 400 });
  }
  try {
    const item = await prisma.tenderMaster.create({
      data: {
        type: body.type,
        name: body.name,
        code: body.code || null,
        description: body.description || null
      }
    });
    return NextResponse.json(item);
  } catch (err) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'This name already exists for this type' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function PUT(req) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const item = await prisma.tenderMaster.update({
    where: { id: body.id },
    data: {
      name: body.name,
      code: body.code || null,
      description: body.description || null,
      isActive: body.isActive ?? true
    }
  });
  return NextResponse.json(item);
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.tenderMaster.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
