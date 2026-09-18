export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const taxType = params.get('taxType') || 'TDS';
  const search = params.get('search');
  const data = await prisma.tdsAccount.findMany({
    where: { taxType, ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}) },
    include: { section: true }, orderBy: { name: 'asc' }
  });
  return NextResponse.json({ data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'TDS account name is required' }, { status: 400 });
    const data = await prisma.tdsAccount.create({ data: { name: body.name, taxType: body.taxType || 'TDS' } });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Failed to create TDS account' }, { status: 500 }); }
}

export async function PUT(request) {
  try {
    const { rows } = await request.json();
    if (!Array.isArray(rows) || !rows.length) return NextResponse.json({ error: 'Rows are required' }, { status: 400 });
    const data = await prisma.$transaction(rows.map(row => prisma.tdsAccount.update({
      where: { id: Number(row.id) },
      data: { sectionId: row.sectionId ? Number(row.sectionId) : null, tdsLimit: Number(row.tdsLimit) || 0, tdsPercent: Number(row.tdsPercent) || 0, tdsSurcharge: Number(row.tdsSurcharge) || 0, tdsCess: Number(row.tdsCess) || 0, tdsNet: (Number(row.tdsPercent) || 0) + (Number(row.tdsSurcharge) || 0) + (Number(row.tdsCess) || 0) }
    })));
    return NextResponse.json({ data });
  } catch (error) { return NextResponse.json({ error: 'Failed to save TDS master' }, { status: 500 }); }
}
