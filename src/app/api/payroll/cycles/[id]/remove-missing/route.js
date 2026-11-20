import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';

const NO_EMPLOYEES_SENTINEL = '__NO_EMPLOYEES_SELECTED__';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const employeeIds = [...new Set(
      (Array.isArray(body.employeeIds) ? body.employeeIds : [])
        .filter(employeeId => typeof employeeId === 'string' && employeeId && employeeId !== NO_EMPLOYEES_SENTINEL)
    )];
    if (employeeIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one missing employee to remove.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async tx => {
      const cycle = await tx.payCycle.findUnique({ where: { id } });
      if (!cycle) return { error: 'Pay cycle not found.', status: 404 };
      if (cycle.status === 'COMPLETED') return { error: 'Completed pay cycles cannot be changed.', status: 409 };
      if (!cycle.selectedEmployees?.length || cycle.selectedEmployees.includes(NO_EMPLOYEES_SENTINEL)) {
        return { error: 'This pay cycle is not using a manual employee selection.', status: 409 };
      }

      const selectedIds = new Set(cycle.selectedEmployees);
      const notSelectedIds = employeeIds.filter(employeeId => !selectedIds.has(employeeId));
      if (notSelectedIds.length > 0) {
        return { error: 'One or more employees are no longer selected in this pay cycle. Refresh and retry.', status: 409 };
      }

      const existingRecords = await tx.payrollRecord.findMany({
        where: { payCycleId: id, employeeId: { in: employeeIds } },
        select: { employeeId: true },
      });
      if (existingRecords.length > 0) {
        return { error: 'Only employees without a saved salary calculation can be removed here.', status: 409 };
      }

      const remainingIds = cycle.selectedEmployees.filter(employeeId => !employeeIds.includes(employeeId));
      await tx.payCycle.update({
        where: { id },
        data: { selectedEmployees: remainingIds.length > 0 ? remainingIds : [NO_EMPLOYEES_SENTINEL] },
      });
      return { removedCount: employeeIds.length, remainingEmployeeCount: remainingIds.length };
    }, { maxWait: 10000, timeout: 15000 });

    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error removing missing pay-cycle employees:', error);
    return NextResponse.json({ error: error.message || 'Could not remove missing employees.' }, { status: 500 });
  }
}
