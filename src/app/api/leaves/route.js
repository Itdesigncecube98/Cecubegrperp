import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

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
    
    // Get employee to check if they have a supervisor, and get demographics for validation
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { supervisorId: true, gender: true, joinedDate: true }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // --- Validation Logic ---
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffTime = Math.abs(end - start);
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (data.isHalfDay) diffDays = 0.5;

    let tenureMonths = 0;
    if (employee.joinedDate) {
      const joinDate = new Date(employee.joinedDate);
      if (!isNaN(joinDate)) {
        tenureMonths = (new Date().getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      }
    }

    const type = data.leaveType;
    if (type === 'Casual Leave') {
      if (diffDays > 4) {
        return NextResponse.json({ error: 'Maximum 4 days of Casual Leave can be taken at a time.' }, { status: 400 });
      }
    } else if (type === 'Paid leave' || type === 'Earned Leave') {
      if (data.isHalfDay) {
        return NextResponse.json({ error: 'Half day is not allowed for Earned Leave.' }, { status: 400 });
      }
      if (employee.joinedDate && tenureMonths < 8) {
        return NextResponse.json({ error: 'Earned Leave can only be availed after completion of 8 months of service (240 days).' }, { status: 400 });
      }
    } else if (type === 'Maternity Leave') {
      if (employee.gender && employee.gender.toLowerCase() !== 'female') {
        return NextResponse.json({ error: 'Maternity Leave is only applicable for female employees.' }, { status: 400 });
      }
      if (employee.joinedDate && tenureMonths < 24) {
        return NextResponse.json({ error: 'Maternity Leave can only be availed after completion of 2 years of service.' }, { status: 400 });
      }
      if (diffDays > 183) { // approx 6 months
        return NextResponse.json({ error: 'Maximum 6 months of Maternity Leave can be taken.' }, { status: 400 });
      }
    } else if (type === 'Paternity Leave') {
      if (employee.gender && employee.gender.toLowerCase() !== 'male') {
        return NextResponse.json({ error: 'Paternity Leave is only applicable for male employees.' }, { status: 400 });
      }
      if (diffDays > 4) {
         return NextResponse.json({ error: 'Maximum 4 days of Paternity Leave can be taken.' }, { status: 400 });
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
        attachment: data.attachment || null,
        isHalfDay: data.isHalfDay || false,
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

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // If leave is approved (by supervisor OR admin), deduct from balance
    if (status === 'APPROVED' && (role === 'ADMIN' || role === 'SUPERVISOR')) {
      const { employeeId, leaveType, startDate, endDate, isHalfDay } = updatedRequest;
      // Calculate days
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (isHalfDay) {
        diffDays = Math.max(0, diffDays - 0.5);
      }

      // Update balance
      const balance = await prisma.leaveBalance.findUnique({
        where: { employeeId }
      });
      
      if (balance) {
        let balanceUpdateData = {};
        let currentLwp = balance.leaveWithoutPay || 0;

        if (leaveType === 'Casual') {
          balanceUpdateData.casualLeaves = balance.casualLeaves - diffDays;
        } else if (leaveType === 'Leave Without Pay' || leaveType === 'Sick' || leaveType === 'Unpaid') {
          currentLwp += diffDays;
          balanceUpdateData.leaveWithoutPay = currentLwp;
        } else if (leaveType === 'Earned' || leaveType === 'Paid leave') {
          balanceUpdateData.earnedLeaves = balance.earnedLeaves - diffDays;
        } else if (leaveType === 'COFF') {
          balanceUpdateData.compensatoryLeaves = balance.compensatoryLeaves - diffDays;
        }
        
        await prisma.leaveBalance.update({
          where: { employeeId },
          data: balanceUpdateData
        });
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
