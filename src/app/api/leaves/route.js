import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getEarnedLeaveEligibilityDate, toDateKey } from '../../../lib/leaveEntitlements';
import {
  calculateLeaveDays,
  getLeaveCategory,
  isFemaleEmployee,
  isMaternityLeave,
  isPaternityLeave,
  isWithinSixMonthMaternityLimit,
  supportsHalfDayLeave,
} from '../../../lib/leavePolicy';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const supervisorId = searchParams.get('supervisorId');
    const employeeId = searchParams.get('employeeId');
    const role = searchParams.get('role'); // 'SUPERVISOR' or 'ADMIN'
    const userId = searchParams.get('userId'); // ID of supervisor or admin

    const where = {};
    
    if (role === 'SUPERVISOR' && userId) {
      where.OR = [
        { targetSupervisorId: userId },
        { targetSupervisorId: null, employee: { supervisorId: userId } }
      ];
    } else if (role === 'ADMIN' && userId) {
      where.status = { in: ['PENDING_SUPERVISOR', 'PENDING_ADMIN'] };
    } else if (supervisorId) {
      where.OR = [
        { targetSupervisorId: supervisorId },
        { targetSupervisorId: null, employee: { supervisorId: supervisorId } }
      ];
    }
    
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: true
      },
      orderBy: { appliedOn: 'desc' }
    });

    const enrichedRequests = await Promise.all(requests.map(async (req) => {
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: req.employeeId,
          date: {
            gte: req.startDate,
            lte: req.endDate
          }
        }
      });
      
      const wasPresent = attendances.some(a => a.status === 'Present' || a.status === 'Late');
      
      return {
        ...req,
        actualAttendance: wasPresent ? 'Present' : 'Absent / No Punch'
      };
    }));

    return NextResponse.json(enrichedRequests);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const attachment = typeof data.attachment === 'string' ? data.attachment : '';
    const allowedAttachment = /^data:(application\/pdf|image\/png|image\/jpeg|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,[A-Za-z0-9+/]+={0,2}$/i;
    if (attachment.length > 7_000_000) {
      return NextResponse.json({ error: 'Supporting documents must be 5 MB or smaller.' }, { status: 413 });
    }
    if (attachment && !allowedAttachment.test(attachment)) {
      return NextResponse.json({ error: 'Supporting document must be a PDF, PNG, JPG, JPEG, or DOCX file.' }, { status: 400 });
    }
    
    // Get employee to check if they have a supervisor, and get demographics for validation
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { supervisorId: true, gender: true, joinedDate: true }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // --- Validation Logic ---
    const diffDays = calculateLeaveDays(data.startDate, data.endDate, Boolean(data.isHalfDay));
    if (diffDays === null) {
      return NextResponse.json({ error: 'Please enter a valid leave date range.' }, { status: 400 });
    }
    if (data.isHalfDay && toDateKey(data.startDate) !== toDateKey(data.endDate)) {
      return NextResponse.json({ error: 'A half-day leave request must be for a single date.' }, { status: 400 });
    }
    const halfDayPeriod = data.isHalfDay ? data.halfDayPeriod : null;
    if (data.isHalfDay && !['FIRST_HALF', 'SECOND_HALF'].includes(halfDayPeriod)) {
      return NextResponse.json({ error: 'Choose whether the leave is for the first half or second half of the day.' }, { status: 400 });
    }
    const type = data.leaveType;
    const category = getLeaveCategory(type);
    if (data.isHalfDay && !supportsHalfDayLeave(type)) {
      return NextResponse.json({ error: 'Half-day leave is available only for Casual Leave, Earned Leave, and COFF.' }, { status: 400 });
    }
    if (isPaternityLeave(type)) {
      return NextResponse.json({ error: 'Paternity Leave is not available.' }, { status: 400 });
    }

    if (category === 'CL') {
      if (diffDays > 4) {
        return NextResponse.json({ error: 'Maximum 4 days of Casual Leave can be taken at a time.' }, { status: 400 });
      }
    } else if (category === 'EL') {
      const eligibleFrom = getEarnedLeaveEligibilityDate(employee);
      const leaveStart = toDateKey(data.startDate);
      if (employee.joinedDate && !eligibleFrom) {
        return NextResponse.json({ error: 'Employee joining date is invalid. Please contact HR.' }, { status: 400 });
      }
      if (eligibleFrom && leaveStart && leaveStart < eligibleFrom) {
        return NextResponse.json({ error: `Earned Leave can only be availed from ${eligibleFrom}, after completion of 8 months of service.` }, { status: 400 });
      }
    } else if (isMaternityLeave(type)) {
      if (!isFemaleEmployee(employee.gender)) {
        return NextResponse.json({ error: 'Maternity Leave is only applicable for female employees.' }, { status: 400 });
      }
      if (!isWithinSixMonthMaternityLimit(data.startDate, data.endDate)) {
        return NextResponse.json({ error: 'Maximum 6 months of Maternity Leave can be taken.' }, { status: 400 });
      }
    }
    // --- End Validation ---

    // Determine initial status based on whether employee has a supervisor
    const initialStatus = employee?.supervisorId ? 'PENDING_SUPERVISOR' : 'PENDING_ADMIN';
    
    // Determine the target supervisor for the request
    let targetSupervisorId = employee?.supervisorId || null;
    if (data.routeTo === 'NEXT_SENIOR' && employee?.supervisorId) {
      const immediateSupervisor = await prisma.employee.findUnique({
        where: { id: employee.supervisorId },
        select: { supervisorId: true }
      });
      if (immediateSupervisor && immediateSupervisor.supervisorId) {
        targetSupervisorId = immediateSupervisor.supervisorId;
      }
    }
    
    const newRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: data.employeeId,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        attachment: attachment || null,
        isHalfDay: data.isHalfDay || false,
        halfDayPeriod,
        status: initialStatus,
        targetSupervisorId: targetSupervisorId
      }
    });
    return NextResponse.json(newRequest);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, status, approvedBy, role } = data;
    
    let updateData = { status };
    
    // Supervisor approves → directly APPROVED (final)
    if (role === 'SUPERVISOR' && status === 'APPROVED') {
      updateData.supervisorApproved = true;
      updateData.supervisorApprovedAt = new Date();
      updateData.supervisorApprovedBy = approvedBy;
      updateData.status = 'APPROVED';
    }
    // Supervisor rejects
    else if (role === 'SUPERVISOR' && status === 'REJECTED') {
      updateData.supervisorApproved = false;
      updateData.supervisorApprovedAt = new Date();
      updateData.supervisorApprovedBy = approvedBy;
      updateData.status = 'REJECTED';
    }
    // Admin approves → directly APPROVED (final)
    else if (role === 'ADMIN' && status === 'APPROVED') {
      updateData.adminApproved = true;
      updateData.adminApprovedAt = new Date();
      updateData.adminApprovedBy = approvedBy;
      updateData.status = 'APPROVED';
    }
    // Admin rejects
    else if (role === 'ADMIN' && status === 'REJECTED') {
      updateData.adminApproved = false;
      updateData.adminApprovedAt = new Date();
      updateData.adminApprovedBy = approvedBy;
      updateData.status = 'REJECTED';
    }

    const requestId = Number.parseInt(id, 10);
    if (!Number.isInteger(requestId)) {
      return NextResponse.json({ error: 'Invalid leave request ID.' }, { status: 400 });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const previousRequest = await tx.leaveRequest.findUnique({ where: { id: requestId } });
      if (!previousRequest) return null;

      const updated = await tx.leaveRequest.update({
        where: { id: requestId },
        data: updateData
      });

      const newlyApproved = previousRequest.status !== 'APPROVED'
        && updated.status === 'APPROVED'
        && (role === 'ADMIN' || role === 'SUPERVISOR');
      if (!newlyApproved) return updated;

      const { employeeId, leaveType, startDate, endDate, isHalfDay } = updated;
      const days = calculateLeaveDays(startDate, endDate, isHalfDay);
      if (days === null) throw new Error('The saved leave request has an invalid date range.');

      const balance = await tx.leaveBalance.findUnique({ where: { employeeId } });
      if (!balance) return updated;

      const category = getLeaveCategory(leaveType);
      const balanceUpdateData = category === 'CL'
        ? { casualLeaves: { decrement: days } }
        : category === 'EL'
          ? { earnedLeaves: { decrement: days } }
          : category === 'COFF'
            ? { compensatoryLeaves: { decrement: days } }
            : category === 'LWP' || category === 'SL'
              ? { leaveWithoutPay: { increment: days } }
              : null;

      if (balanceUpdateData) {
        await tx.leaveBalance.update({ where: { employeeId }, data: balanceUpdateData });
      }

      return updated;
    });

    if (!updatedRequest) {
      return NextResponse.json({ error: 'Leave request not found.' }, { status: 404 });
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
