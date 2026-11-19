import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';

export const dynamic = 'force-dynamic';
const MAX_LEVELS = 3;

export async function GET(request) {
  if (readAuthSession(request)?.type !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 1 },
      select: { purchaseWorkOrderApprovalConfig: true },
    });
    return NextResponse.json({ config: settings?.purchaseWorkOrderApprovalConfig || { levels: [] } });
  } catch (error) {
    console.error('Error fetching procurement approval workflow:', error);
    return NextResponse.json({ error: 'Failed to load approval workflow settings.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const session = readAuthSession(request);
  if (session?.type !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!Array.isArray(body.levels) || body.levels.length < 1 || body.levels.length > MAX_LEVELS) {
      return NextResponse.json({ error: `Configure between 1 and ${MAX_LEVELS} approval levels.` }, { status: 400 });
    }

    const levels = [];
    let previousThreshold = 0;
    for (const [index, rawLevel] of body.levels.entries()) {
      const threshold = Number(rawLevel?.threshold);
      const approverEmployeeIds = Array.isArray(rawLevel?.approverEmployeeIds)
        ? Array.from(new Set(rawLevel.approverEmployeeIds.filter(id => typeof id === 'string' && id.trim())))
        : [];
      if (!Number.isFinite(threshold) || threshold <= previousThreshold) {
        return NextResponse.json({ error: `Level ${index + 1} must have an amount threshold greater than the previous level.` }, { status: 400 });
      }
      if (!approverEmployeeIds.length) {
        return NextResponse.json({ error: `Select at least one employee for level ${index + 1}.` }, { status: 400 });
      }
      levels.push({ threshold, approverEmployeeIds });
      previousThreshold = threshold;
    }

    const selectedEmployees = Array.from(new Set(levels.flatMap(level => level.approverEmployeeIds)));
    if (selectedEmployees.length) {
      const matchingEmployees = await prisma.employee.count({ where: { id: { in: selectedEmployees } } });
      if (matchingEmployees !== selectedEmployees.length) {
        return NextResponse.json({ error: 'One or more selected employees no longer exist.' }, { status: 400 });
      }
    }

    const config = {
      thresholdBasis: 'TOTAL_AMOUNT_INR',
      approverRule: 'ALL',
      sequential: true,
      levels,
    };
    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      create: { id: 1, purchaseWorkOrderApprovalConfig: config, updatedBy: session.id },
      update: { purchaseWorkOrderApprovalConfig: config, updatedBy: session.id },
      select: { purchaseWorkOrderApprovalConfig: true },
    });

    return NextResponse.json({ config: settings.purchaseWorkOrderApprovalConfig });
  } catch (error) {
    console.error('Error saving procurement approval workflow:', error);
    return NextResponse.json({ error: 'Failed to save approval workflow settings.' }, { status: 500 });
  }
}
