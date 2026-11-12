export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';

export async function GET(request, { params }) {
  try {
    const session = readAuthSession(request);
    const { id: employeeId } = await params;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.type !== 'admin' && session.id !== employeeId) {
      return NextResponse.json({ error: 'You can only view your own payroll history.' }, { status: 403 });
    }

    const [items, encashments] = await Promise.all([
      prisma.bonusIncentive.findMany({
        where: { employeeId, type: { in: ['bonus', 'incentive', 'gratuity'] } },
        include: { payCycle: { select: { id: true, name: true, startDate: true, endDate: true, status: true } } },
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.leaveEncashment.findMany({
        where: { employeeId },
        include: { payCycle: { select: { id: true, name: true, startDate: true, endDate: true, status: true } } },
        orderBy: [{ createdAt: 'desc' }],
      }),
    ]);

    return NextResponse.json({ items, encashments });
  } catch (error) {
    console.error('Failed to fetch employee payroll history:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch payroll history.' }, { status: 500 });
  }
}
