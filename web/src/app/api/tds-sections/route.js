export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const taxType = new URL(request.url).searchParams.get('taxType') || 'TDS';
  const data = await prisma.tdsSection.findMany({ where: { taxType }, orderBy: { code: 'asc' } });
  return NextResponse.json({ data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.code) return NextResponse.json({ error: 'Section code is required' }, { status: 400 });
    const data = await prisma.tdsSection.create({ data: { code: body.code, description: body.description, taxType: body.taxType || 'TDS' } });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.code === 'P2002' ? 'Section already exists' : 'Failed to create section' }, { status: 500 });
  }
}
