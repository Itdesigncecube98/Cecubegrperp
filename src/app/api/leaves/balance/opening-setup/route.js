export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { readAuthSession } from '../../../../../lib/authSession';

const SETUP_ID = 'EL_OPENING_BALANCE_V1';
const employeeSetupId = employeeId => `${SETUP_ID}:${employeeId}`;

export async function GET(request) {
  if (readAuthSession(request)?.type !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const [globalSetup, setupRecords, employees] = await Promise.all([
      prisma.leaveBalanceSetup.findUnique({ where: { id: SETUP_ID } }),
      prisma.leaveBalanceSetup.findMany({
        where: { id: { startsWith: `${SETUP_ID}:` } },
        select: { id: true, completedAt: true },
      }),
      prisma.employee.findMany({
        where: { role: { not: 'SUPER_ADMIN' } },
        select: {
          id: true,
          name: true,
          empId: true,
          department: true,
          leaveBalance: { select: { earnedLeaves: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const setupsByEmployee = new Map(
      setupRecords.map(setup => [setup.id.slice(`${SETUP_ID}:`.length), setup])
    );
    return NextResponse.json({
      locked: Boolean(globalSetup),
      employees: employees.map(({ leaveBalance, ...employee }) => {
        const setup = setupsByEmployee.get(employee.id);
        return {
          ...employee,
          earnedLeaves: leaveBalance?.earnedLeaves ?? null,
          setupLocked: Boolean(globalSetup || setup),
          setupCompletedAt: setup?.completedAt || globalSetup?.completedAt || null,
        };
      }),
    });
  } catch (error) {
    console.error('Failed to load one-time leave setup:', error);
    return NextResponse.json({ error: 'Failed to load one-time leave setup.' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = readAuthSession(request);
  if (session?.type !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { employeeId, eligibleLeaves } = body || {};
    const balance = Number(eligibleLeaves);
    if (typeof employeeId !== 'string' || !employeeId ||
        eligibleLeaves === null || String(eligibleLeaves ?? '').trim() === '' ||
        !Number.isFinite(balance) || balance < 0) {
      return NextResponse.json({ error: 'Enter one valid, non-negative Eligible EL balance.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async transaction => {
      const markerId = employeeSetupId(employeeId);
      const [globalSetup, employee, setup] = await Promise.all([
        transaction.leaveBalanceSetup.findUnique({ where: { id: SETUP_ID } }),
        transaction.employee.findUnique({
          where: { id: employeeId },
          select: { id: true, role: true, name: true },
        }),
        transaction.leaveBalanceSetup.findUnique({ where: { id: markerId } }),
      ]);
      if (globalSetup || setup) {
        return { error: 'This employee’s one-time Eligible EL correction is already locked.', status: 409 };
      }
      if (!employee || employee.role === 'SUPER_ADMIN') {
        return { error: 'Employee not found.', status: 404 };
      }

      const openingDate = new Date().toISOString().slice(0, 10);
      const oldBalance = await transaction.leaveBalance.findUnique({
        where: { employeeId },
        select: {
          earnedLeaves: true,
          earnedLeaveOpeningBalance: true,
          earnedLeaveOpeningDate: true,
        },
      });
      await transaction.leaveBalance.upsert({
        where: { employeeId },
        create: {
          employeeId,
          earnedLeaves: balance,
          earnedLeaveOpeningBalance: balance,
          earnedLeaveOpeningDate: openingDate,
        },
        update: {
          earnedLeaves: balance,
          earnedLeaveOpeningBalance: balance,
          earnedLeaveOpeningDate: openingDate,
        },
      });

      const completedAt = new Date();
      await transaction.leaveBalanceSetup.create({
        data: {
          id: markerId,
          completedAt,
          completedBy: String(session.id),
          employeeCount: 1,
        },
      });
      await transaction.auditLog.create({
        data: {
          module: 'LEAVE',
          subModule: 'EL Eligible Balance Correction',
          action: 'ONE_TIME_EMPLOYEE_EL_CORRECTION',
          entityType: 'Employee',
          entityId: employeeId,
          oldValues: JSON.stringify(oldBalance),
          newValues: JSON.stringify({ eligibleLeaves: balance, openingDate }),
          remarks: `Eligible EL corrected once for ${employee.name} by admin session ${session.id}`,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            null,
        },
      });
      return { success: true, locked: true, completedAt, employeeId, eligibleLeaves: balance };
    }, { isolationLevel: 'Serializable' });

    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to save one-time Eligible EL correction:', error);
    if (error.code === 'P2002' || error.code === 'P2034') {
      return NextResponse.json({ error: 'This employee’s EL was corrected already or another update is in progress. Refresh the page.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to save Eligible EL correction.' }, { status: 500 });
  }
}
