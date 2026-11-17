export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';

function readStatus(values) {
  if (!values) return null;
  try {
    const parsed = JSON.parse(values);
    return typeof parsed.status === 'string' ? parsed.status : null;
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    if (!readAuthSession(request)) {
      return NextResponse.json({ error: 'Please sign in to view status history.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const id = searchParams.get('id');
    const entityType = entity === 'contractor'
      ? 'Contractor'
      : entity === 'vendor'
        ? 'VendorMaster'
        : null;
    if (!entityType || !id) {
      return NextResponse.json({ error: 'A valid master type and ID are required.' }, { status: 400 });
    }

    const records = await prisma.auditLog.findMany({
      where: { entityType, entityId: id, action: 'STATUS_CHANGE' },
      select: { id: true, oldValues: true, newValues: true, remarks: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json(records.reverse().map(record => ({
      id: record.id,
      fromStatus: readStatus(record.oldValues),
      toStatus: readStatus(record.newValues),
      changedBy: record.remarks || 'Unknown account',
      changedAt: record.createdAt
    })));
  } catch (error) {
    console.error('Error fetching master status history:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch status history' }, { status: 500 });
  }
}
