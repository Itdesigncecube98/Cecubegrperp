export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BRAND_STATUSES = ['Active', 'Inactive'];

const normalizeName = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeStatus = (value) => (BRAND_STATUSES.includes(value) ? value : 'Active');

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const name = normalizeName(body?.name);

    if (!name) {
      return NextResponse.json({ error: 'Brand name is required.' }, { status: 400 });
    }

    const duplicate = await prisma.brand.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true }
    });

    if (duplicate) {
      return NextResponse.json({ error: `A brand named "${name}" already exists.` }, { status: 409 });
    }

    const brand = await prisma.brand.create({
      data: { name, status: normalizeStatus(body?.status) }
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error('Error creating brand:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A brand with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create brand' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    const name = normalizeName(body?.name);

    if (!id) {
      return NextResponse.json({ error: 'Brand id is required.' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Brand name is required.' }, { status: 400 });
    }

    const duplicate = await prisma.brand.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        NOT: { id }
      },
      select: { id: true }
    });

    if (duplicate) {
      return NextResponse.json({ error: `A brand named "${name}" already exists.` }, { status: 409 });
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: { name, status: normalizeStatus(body?.status) }
    });

    return NextResponse.json(brand);
  } catch (error) {
    console.error('Error updating brand:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'This brand no longer exists.' }, { status: 404 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A brand with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update brand' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : '';

    if (!id) {
      return NextResponse.json({ error: 'Brand id is required.' }, { status: 400 });
    }

    await prisma.brand.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brand:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'This brand no longer exists.' }, { status: 404 });
    }
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'This brand is already used in purchase records and cannot be deleted.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to delete brand' }, { status: 500 });
  }
}
