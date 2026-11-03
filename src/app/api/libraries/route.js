export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

const LIBRARY_CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  const cachedLibraries = globalThis.engineeringLibraryCache;
  if (cachedLibraries?.items && cachedLibraries.expiresAt > Date.now()) {
    return NextResponse.json(cachedLibraries.items);
  }

  try {
    const items = await prisma.library.findMany({ orderBy: { name: 'asc' } });
    globalThis.engineeringLibraryCache = {
      items,
      expiresAt: Date.now() + LIBRARY_CACHE_TTL_MS,
    };
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching libraries:', error);
    if (cachedLibraries?.items) {
      const response = NextResponse.json(cachedLibraries.items);
      response.headers.set('X-Data-Stale', 'true');
      return response;
    }
    if (error?.code === 'P2037' || /too many clients|too many database connections/i.test(error?.message || '')) {
      return NextResponse.json({ error: 'Library list is temporarily unavailable because the database connection limit was reached.' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch libraries.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const item = await prisma.library.create({ data });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    const item = await prisma.library.update({ where: { id }, data: updateData });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    await prisma.library.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
