export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_UNITS = [
  'Cft',
  'cm',
  'Coupler',
  'cum',
  'Dozen',
  'Drum',
  'Each',
  'foot',
  'Ft.',
  'Kg',
  'Litre',
  'Meter',
  'Nos',
  'Sq.ft',
  'Ton'
];

async function seedDefaultUnitsIfNeeded() {
  const count = await prisma.unitLibrary.count();
  if (count === 0) {
    for (const unitName of DEFAULT_UNITS) {
      await prisma.unitLibrary.create({
        data: {
          name: unitName,
          status: 'Active'
        }
      }).catch(() => {});
    }
  }
}

export async function GET(req) {
  try {
    await seedDefaultUnitsIfNeeded();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'name'; // 'name' or 'recent'
    const libraryId = searchParams.get('libraryId');

    let where = {};
    if (search && search.trim()) {
      where = {
        name: {
          contains: search.trim(),
          mode: 'insensitive'
        }
      };
    }
    if (libraryId) where.libraryId = libraryId;

    const units = await prisma.unitLibrary.findMany({
      where,
      orderBy: sortBy === 'recent' ? { createdAt: 'desc' } : { createdAt: 'asc' }
    });

    if (sortBy === 'name') {
      units.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
    }

    const response = NextResponse.json(units);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error('Error fetching unit library:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch unit library' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const name = data.name ? data.name.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'Unit name is required' }, { status: 400 });
    }

    const existing = await prisma.unitLibrary.findFirst({
      where: {
        libraryId: data.libraryId || null,
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: `Unit "${name}" already exists.` }, { status: 400 });
    }

    const unit = await prisma.unitLibrary.create({
      data: {
        name,
        libraryId: data.libraryId || null,
        code: data.code ? data.code.trim() : null,
        description: data.description ? data.description.trim() : null,
        status: data.status || 'Active'
      }
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create unit' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const data = await req.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: 'Unit ID is required' }, { status: 400 });
    }

    if (updateData.name) {
      updateData.name = updateData.name.trim();
      const existing = await prisma.unitLibrary.findFirst({
        where: {
          name: {
            equals: updateData.name,
            mode: 'insensitive'
          },
          NOT: { id }
        }
      });

      if (existing) {
        return NextResponse.json({ error: `Another unit with name "${updateData.name}" already exists.` }, { status: 400 });
      }
    }

    const unit = await prisma.unitLibrary.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.error('Error updating unit:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update unit' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    let id = null;
    try {
      const data = await req.json();
      id = data?.id;
    } catch (e) {
      // Ignore if body is not JSON
    }

    if (!id) {
      const { searchParams } = new URL(req.url);
      id = searchParams.get('id');
    }

    if (!id) {
      return NextResponse.json({ error: 'Unit ID is required' }, { status: 400 });
    }

    await prisma.unitLibrary.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting unit:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete unit' }, { status: 500 });
  }
}

