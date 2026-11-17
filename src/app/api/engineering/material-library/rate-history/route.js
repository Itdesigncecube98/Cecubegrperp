export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';

function readRate(values) {
  if (!values) return null;
  try {
    const parsed = JSON.parse(values);
    return Number.isFinite(Number(parsed.rate)) ? Number(parsed.rate) : null;
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
    if (!readAuthSession(req)) {
      return NextResponse.json({ error: 'Please sign in to view rate history.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    const entityType = type === 'item'
      ? 'MaterialLibraryItem'
      : type === 'group'
        ? 'MaterialLibraryGroup'
        : null;

    if (!id || !entityType) {
      return NextResponse.json({ error: 'A valid resource type and ID are required.' }, { status: 400 });
    }

    const records = await prisma.auditLog.findMany({
      where: { entityType, entityId: id, action: 'RATE_CHANGE' },
      select: { id: true, oldValues: true, newValues: true, remarks: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json(records.map(record => ({
      id: record.id,
      oldRate: readRate(record.oldValues),
      newRate: readRate(record.newValues),
      changedBy: record.remarks || 'Unknown account',
      changedAt: record.createdAt
    })));
  } catch (error) {
    console.error('Error fetching material/labour rate history:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch rate history' }, { status: 500 });
  }
}
