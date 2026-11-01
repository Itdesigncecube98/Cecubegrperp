import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { readAuthSession } from '../../../../lib/authSession';

export const dynamic = 'force-dynamic';

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getTodayInIndia() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function indiaMidnight(date) {
  return new Date(`${date}T00:00:00+05:30`);
}

export async function GET(request) {
  const session = readAuthSession(request);
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (session.type !== 'admin') {
    return NextResponse.json({ error: 'Admin access is required.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate') || '2025-08-01';
  const endDate = searchParams.get('endDate') || getTodayInIndia();
  const requestedPage = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 100);
  const search = (searchParams.get('search') || '').trim().slice(0, 100);

  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
    return NextResponse.json(
      { error: 'Valid startDate and endDate are required (YYYY-MM-DD), with startDate no later than endDate.' },
      { status: 400 },
    );
  }
  if (!Number.isInteger(requestedPage) || requestedPage < 1) {
    return NextResponse.json({ error: 'page must be a positive integer.' }, { status: 400 });
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) {
    return NextResponse.json({ error: 'pageSize must be between 1 and 200.' }, { status: 400 });
  }

  const start = indiaMidnight(startDate);
  const endExclusive = new Date(indiaMidnight(endDate).getTime() + 24 * 60 * 60 * 1000);
  const numericSearch = /^\d+$/.test(search) ? Number(search) : null;
  const where = {
    punchTime: { gte: start, lt: endExclusive },
    ...(search
      ? {
          OR: [
            { employeeCode: { contains: search, mode: 'insensitive' } },
            { employeeName: { contains: search, mode: 'insensitive' } },
            { userId: { contains: search, mode: 'insensitive' } },
            { deviceId: { contains: search, mode: 'insensitive' } },
            ...(Number.isInteger(numericSearch) && numericSearch >= 0 && numericSearch <= 2147483647
              ? [{ deviceLogId: numericSearch }]
              : []),
          ],
        }
      : {}),
  };

  try {
    const total = await prisma.attendancePunch.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const records = await prisma.attendancePunch.findMany({
      where,
      orderBy: [{ punchTime: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        deviceLogId: true,
        deviceId: true,
        userId: true,
        employeeCode: true,
        employeeName: true,
        direction: true,
        punchTime: true,
        location: true,
        source: true,
      },
    });

    return NextResponse.json({ records, total, page, pageSize, totalPages, startDate, endDate });
  } catch (error) {
    console.error('Error fetching biometric attendance backup:', error);
    return NextResponse.json({ error: 'Failed to load biometric attendance backup.' }, { status: 500 });
  }
}
