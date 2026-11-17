import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function ltaIdsFromMessage(message) {
  try {
    const parsed = JSON.parse(message || '{}');
    return Array.isArray(parsed.ltaIds) ? parsed.ltaIds.filter(id => typeof id === 'string') : [];
  } catch {
    return null;
  }
}

const money = value => Math.round((Number(value) || 0) * 100) / 100;

export async function POST(request) {
  try {
    const { ltaId, cycleId } = await request.json();
    if (!ltaId || !cycleId) {
      return NextResponse.json({ error: 'LTA application and pay cycle are required.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async tx => {
      const [cycle, lta] = await Promise.all([
        tx.payCycle.findUnique({ where: { id: cycleId } }),
        tx.leaveTravelAllowance.findUnique({ where: { id: ltaId } }),
      ]);
      if (!cycle) return { error: 'Pay cycle not found.', status: 404 };
      if (cycle.status === 'COMPLETED') {
        return { error: 'LTA cannot be added to a completed pay cycle.', status: 409 };
      }
      if (!lta) return { error: 'LTA application not found.', status: 404 };
      if (!['Paid', 'Posted to Salary'].includes(lta.status)) {
        return { error: 'Approve and mark the LTA application Paid before pushing it to salary.', status: 409 };
      }

      const balance = money(Number(lta.amount) - Number(lta.advanceAmount) - Number(lta.amountPaid));
      if (balance <= 0 || Math.abs(balance - money(lta.balanceAmount)) > 0.01) {
        return { error: 'This LTA application has no valid balance available for salary.', status: 409 };
      }

      const record = await tx.payrollRecord.findFirst({
        where: { employeeId: lta.employeeId, payCycleId: cycleId },
      });
      if (!record) {
        return { error: 'No salary calculation exists for this employee in the selected cycle. Calculate payroll first.', status: 409 };
      }
      if (record.status !== 'PENDING') {
        return { error: 'LTA cannot be changed after the salary is approved or posted.', status: 409 };
      }

      const key = {
        employeeId_payCycleId_type: {
          employeeId: lta.employeeId,
          payCycleId: cycleId,
          type: 'lta',
        },
      };
      const current = await tx.bonusIncentive.findUnique({ where: key });
      const currentIds = current?.status === 'ADDED_TO_SALARY'
        ? ltaIdsFromMessage(current.message)
        : [];
      if (currentIds === null) {
        return { error: 'The current LTA salary item has invalid application details. Refresh the payslip and retry.', status: 409 };
      }
      const ltaIds = [...new Set([...currentIds, ltaId])];

      const otherCycleAdditions = await tx.bonusIncentive.findMany({
        where: {
          employeeId: lta.employeeId,
          type: 'lta',
          status: 'ADDED_TO_SALARY',
          payCycleId: { not: cycleId },
        },
        select: { message: true },
      });
      if (otherCycleAdditions.some(item => ltaIdsFromMessage(item.message)?.includes(ltaId))) {
        return { error: 'This LTA application is already linked to another salary cycle.', status: 409 };
      }

      const applications = await tx.leaveTravelAllowance.findMany({
        where: {
          id: { in: ltaIds },
          employeeId: lta.employeeId,
          status: { in: ['Paid', 'Posted to Salary'] },
        },
      });
      if (applications.length !== ltaIds.length) {
        return { error: 'One or more linked LTA applications are no longer available. Refresh and retry.', status: 409 };
      }

      let totalBalance = 0;
      for (const application of applications) {
        const applicationBalance = money(
          Number(application.amount) - Number(application.advanceAmount) - Number(application.amountPaid)
        );
        if (
          applicationBalance <= 0 ||
          Math.abs(applicationBalance - money(application.balanceAmount)) > 0.01
        ) {
          return { error: 'A linked LTA balance changed. Refresh the applications and retry.', status: 409 };
        }
        totalBalance += applicationBalance;
      }
      totalBalance = money(totalBalance);

      const previousAmount = current?.status === 'ADDED_TO_SALARY' ? money(current.amount) : 0;
      const delta = money(totalBalance - previousAmount);
      for (const application of applications) {
        if (application.status === 'Posted to Salary') continue;
        await tx.leaveTravelAllowance.update({
          where: { id: application.id },
          data: { status: 'Posted to Salary' },
        });
        await tx.ltaStatusHistory.create({
          data: {
            ltaId: application.id,
            fromStatus: application.status,
            toStatus: 'Posted to Salary',
            note: `Pushed to salary cycle ${cycle.name}`,
          },
        });
      }

      const item = await tx.bonusIncentive.upsert({
        where: key,
        update: {
          amount: totalBalance,
          message: JSON.stringify({
            ltaIds,
            applications: applications.map(application => application.applicationNo).filter(Boolean),
          }),
          status: 'ADDED_TO_SALARY',
        },
        create: {
          employeeId: lta.employeeId,
          payCycleId: cycleId,
          type: 'lta',
          amount: totalBalance,
          message: JSON.stringify({
            ltaIds,
            applications: applications.map(application => application.applicationNo).filter(Boolean),
          }),
          status: 'ADDED_TO_SALARY',
        },
      });

      const updatedRecord = delta === 0
        ? record
        : await tx.payrollRecord.update({
          where: { id: record.id },
          data: {
            grossPay: money(Number(record.grossPay) + delta),
            netPay: money(Number(record.netPay) + delta),
          },
        });

      return { item, record: updatedRecord };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error pushing LTA to salary:', error);
    return NextResponse.json({ error: error.message || 'Failed to push LTA to salary.' }, { status: 500 });
  }
}
