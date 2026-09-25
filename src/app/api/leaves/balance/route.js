export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    
    if (month && year) {
      const targetMonth = parseInt(month, 10);
      const targetYear = parseInt(year, 10);

      const targetMonthStr = String(targetMonth).padStart(2, '0');
      const targetYearStr = String(targetYear);
      const monthPrefix = `${targetYearStr}-${targetMonthStr}`;

      const approvedRequests = await prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          ...(employeeId ? { employeeId } : {})
        }
      });

      const presentAttendances = await prisma.attendance.findMany({
        where: {
          date: { startsWith: monthPrefix },
          status: 'Present',
          ...(employeeId ? { employeeId } : {})
        }
      });
      const presentSet = new Set(presentAttendances.map(a => `${a.employeeId}_${a.date}`));

      const usageByEmp = {};
      
      const allEmployees = employeeId 
        ? [{ id: employeeId }] 
        : await prisma.employee.findMany({ select: { id: true } });

      for (const emp of allEmployees) {
        usageByEmp[emp.id] = {
          employeeId: emp.id,
          casualLeaves: 0, 
          earnedLeaves: 0,
          leaveWithoutPay: 0,
          explicitLwp: 0,
          netDaysLwp: 0,
          compensatoryLeaves: 0
        };
      }

      for (const req of approvedRequests) {
        if (!usageByEmp[req.employeeId]) continue; 

        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        
        let overlapDays = 0;
        let curr = new Date(start);
        while (curr <= end) {
          if (curr.getMonth() + 1 === targetMonth && curr.getFullYear() === targetYear) {
            // Use local date string to match YYYY-MM-DD
            const dateStr = [
              curr.getFullYear(),
              String(curr.getMonth() + 1).padStart(2, '0'),
              String(curr.getDate()).padStart(2, '0')
            ].join('-');
            
            if (!presentSet.has(`${req.employeeId}_${dateStr}`)) {
              overlapDays += req.isHalfDay ? 0.5 : 1;
            }
          }
          curr.setDate(curr.getDate() + 1);
        }

        if (overlapDays > 0) {
          if (req.leaveType === 'Casual') {
            usageByEmp[req.employeeId].casualLeaves -= overlapDays;
            if (usageByEmp[req.employeeId].casualLeaves < 0) {
              const overflow = Math.abs(usageByEmp[req.employeeId].casualLeaves);
              usageByEmp[req.employeeId].leaveWithoutPay += overflow;
              usageByEmp[req.employeeId].netDaysLwp += overflow;
              usageByEmp[req.employeeId].casualLeaves = 0;
            }
          }
          if (req.leaveType === 'Earned') {
            usageByEmp[req.employeeId].earnedLeaves -= overlapDays;
            if (usageByEmp[req.employeeId].earnedLeaves < 0) {
              const overflow = Math.abs(usageByEmp[req.employeeId].earnedLeaves);
              usageByEmp[req.employeeId].leaveWithoutPay += overflow;
              usageByEmp[req.employeeId].netDaysLwp += overflow;
              usageByEmp[req.employeeId].earnedLeaves = 0;
            }
          }
          if (req.leaveType === 'Unpaid' || req.leaveType === 'Leave Without Pay' || req.leaveType === 'Sick') {
            usageByEmp[req.employeeId].leaveWithoutPay += overlapDays;
            usageByEmp[req.employeeId].explicitLwp += overlapDays;
            usageByEmp[req.employeeId].netDaysLwp += overlapDays;
          }
          if (req.leaveType === 'COFF') {
            usageByEmp[req.employeeId].compensatoryLeaves -= overlapDays;
            if (usageByEmp[req.employeeId].compensatoryLeaves < 0) {
              const overflow = Math.abs(usageByEmp[req.employeeId].compensatoryLeaves);
              usageByEmp[req.employeeId].leaveWithoutPay += overflow;
              usageByEmp[req.employeeId].netDaysLwp += overflow;
              usageByEmp[req.employeeId].compensatoryLeaves = 0;
            }
          }
        }
      }

      const results = Object.values(usageByEmp);
      if (employeeId) return NextResponse.json(results[0] || { casualLeaves: 0, leaveWithoutPay: 0, earnedLeaves: 0, compensatoryLeaves: 0 });
      return NextResponse.json(results);
    }
    
    if (employeeId) {
      const balance = await prisma.leaveBalance.findUnique({
        where: { employeeId: employeeId }
      });
      return NextResponse.json(balance || { casualLeaves: 0, leaveWithoutPay: 0, earnedLeaves: 0, compensatoryLeaves: 0 });
    }
    
    // Return all balances if no employeeId
    const all = await prisma.leaveBalance.findMany();
    return NextResponse.json(all);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { employeeId, casualLeaves, leaveWithoutPay, earnedLeaves } = data;
    
    const balance = await prisma.leaveBalance.upsert({
      where: { employeeId: employeeId },
      update: { casualLeaves, leaveWithoutPay, earnedLeaves },
      create: { employeeId: employeeId, casualLeaves, leaveWithoutPay, earnedLeaves }
    });
    
    return NextResponse.json(balance);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
