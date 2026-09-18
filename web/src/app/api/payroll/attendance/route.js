import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId');
    const department = searchParams.get('department');
    const branch = searchParams.get('branch');
    const location = searchParams.get('location');
    
    if (!cycleId) {
      return NextResponse.json({ error: 'cycleId is required' }, { status: 400 });
    }

    const cycle = await prisma.payCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      return NextResponse.json({ error: 'Pay cycle not found' }, { status: 404 });
    }

    // Build employee filter
    const empWhere = {};
    if (department) empWhere.department = department;
    if (branch) empWhere.branch = branch;
    if (location) empWhere.siteOffice = location;
    
    // If cycle has selectedEmployees, filter by them
    if (cycle.selectedEmployees && cycle.selectedEmployees.length > 0) {
      empWhere.id = { in: cycle.selectedEmployees };
    }

    // Fetch employees with their attendance records within the cycle's date range
    const employees = await prisma.employee.findMany({
      where: empWhere,
      select: {
        id: true,
        empId: true,
        name: true,
        designation: true,
        attendances: {
          where: {
            date: {
              gte: cycle.startDate,
              lte: cycle.endDate
            }
          }
        }
      }
    });

    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: cycle.startDate,
          lte: cycle.endDate
        }
      }
    });

    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: cycle.endDate },
        endDate: { gte: cycle.startDate }
      }
    });

    return NextResponse.json({ cycle, employees, holidays, approvedLeaves });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Check if it's a bulk update or single update
    const updates = Array.isArray(body) ? body : [body];
    
    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }

    // Use a transaction for bulk upsert
    const results = await prisma.$transaction(
      updates.map(update => {
        return prisma.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: update.employeeId,
              date: update.date
            }
          },
          update: {
            status: update.status
          },
          create: {
            employeeId: update.employeeId,
            date: update.date,
            status: update.status
          }
        });
      })
    );
    
    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
