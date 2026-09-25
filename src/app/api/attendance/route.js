export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { calculateAttendanceStatus } from '../../../lib/attendanceCalculator';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const employees = await prisma.employee.findMany();
    const attendanceRecords = await prisma.attendance.findMany({
      where: { date }
    });

    const employeeShifts = await prisma.employeeShift.findMany({
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' }
    });

    const holidays = await prisma.holiday.findMany({ where: { date } });
    const holidayAnns = await prisma.announcement.findMany({ where: { date, isHoliday: true } });
    const isGlobalHoliday = holidays.length > 0 || holidayAnns.length > 0;

    const workingAnns = await prisma.announcement.findMany({ where: { date, isWorkingDay: true } });
    const isWorkingAnn = workingAnns.length > 0;

    const workWeeks = await prisma.workWeek.findMany();
    const weekoffTypes = await prisma.weekoffType.findMany();
    // Use fixed offset parsing so UTC issues don't shift the day
    const dObj = new Date(`${date}T12:00:00Z`);
    const dayName = dObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const offDays = workWeeks.filter(w => !w.isWorking).map(w => w.day);
    const isSunday = offDays.includes(dayName) || (workWeeks.length === 0 && dayName === 'Sunday');
    const isWoff = isSunday && !isWorkingAnn;

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: date },
        endDate: { gte: date }
      }
    });

    // Auto-punch out logic based on dynamic shift end time + 1 hour buffer
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', { 
      timeZone: 'Asia/Kolkata', 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', hour12: false 
    }).formatToParts(now);
    const p = {};
    parts.forEach(part => p[part.type] = part.value);
    const currentDateStr = `${p.year}-${p.month}-${p.day}`;
    // handle 24:00 which sometimes Intl returns for midnight
    let currentHour = parseInt(p.hour, 10);
    if (currentHour === 24) currentHour = 0;
    let currentMinute = parseInt(p.minute || 0, 10);

    for (let record of attendanceRecords) {
      if (record.timeSlots) {
        try {
          let slots = JSON.parse(record.timeSlots);
          let updated = false;

          const empShift = employeeShifts.find(es =>
            es.employeeId === record.employeeId &&
            es.effectiveFrom <= record.date &&
            (!es.validTill || es.validTill >= record.date)
          );
          let bufferEndHour = 19;
          let bufferEndMin = 0;
          let outTimeStr = '19:00';
          
          if (empShift && empShift.shift && empShift.shift.endTime) {
            const parts = empShift.shift.endTime.split(':');
            const sh = Number(parts[0]) || 0;
            const sm = Number(parts[1]) || 0;
            bufferEndHour = sh + 1;
            bufferEndMin = sm;
            outTimeStr = `${String(bufferEndHour).padStart(2, '0')}:${String(bufferEndMin).padStart(2, '0')}`;
          }

          slots.forEach(slot => {
            if (slot.in && !slot.out) {
              const isPastBuffer = currentHour > bufferEndHour || (currentHour === bufferEndHour && currentMinute >= bufferEndMin);
              if (record.date < currentDateStr || (record.date === currentDateStr && isPastBuffer)) {
                if (slot.in < outTimeStr) {
                  slot.out = outTimeStr;
                  updated = true;
                } else if (record.date < currentDateStr) {
                  // If it's the next day and they punched in after the shift buffer, close at 23:59
                  slot.out = '23:59';
                  updated = true;
                }
              }
            }
          });

          if (updated) {
            record.timeSlots = JSON.stringify(slots);
            // Fire and forget update to persist the auto punch-out
            prisma.attendance.update({
              where: { id: record.id },
              data: { timeSlots: record.timeSlots }
            }).catch(console.error);

            // Create a pending OUT request for Team Regularisation
            prisma.punchRequest.create({
              data: {
                employeeId: record.employeeId,
                type: 'OUT',
                time: outTimeStr,
                date: record.date,
                shiftType: record.shiftType || 'Day',
                reason: 'Auto-punched out (missing manual punch-out). Needs Regularization.',
                status: 'PENDING'
              }
            }).catch(console.error);
          }
        } catch (e) {}
      }
    }

    // Reconcile stored statuses with completed punches so older records saved
    // as Present are corrected when half-day thresholds are configured later.
    const calculatedStatuses = new Map();
    for (const record of attendanceRecords) {
      let slots = [];
      try {
        slots = JSON.parse(record.timeSlots || '[]');
      } catch {
        slots = [];
      }
      const completedSlot = slots.filter(slot => slot?.in && slot?.out).slice(-1)[0];
      if (!completedSlot) continue;

      const effectiveShift = employeeShifts.find(es =>
        es.employeeId === record.employeeId &&
        es.effectiveFrom <= record.date &&
        (!es.validTill || es.validTill >= record.date)
      );
      if (!effectiveShift?.shift) continue;

      const calculated = calculateAttendanceStatus(effectiveShift.shift, completedSlot.in, completedSlot.out);
      calculatedStatuses.set(record.id, calculated.status);
      if (record.status !== calculated.status) {
        record.status = calculated.status;
        prisma.attendance.update({
          where: { id: record.id },
          data: { status: calculated.status }
        }).catch(console.error);
      }
    }

    const result = employees.map(emp => {
      const record = attendanceRecords.find(a => a.employeeId === emp.id);
      
      let finalStatus = record ? (calculatedStatuses.get(record.id) || record.status) : 'Not Marked';
      if (finalStatus === 'P') finalStatus = 'Present';
      if (finalStatus === 'A') finalStatus = 'Absent';
      
      if (!record || record.status === 'Not Marked') {
        const empLeave = leaves.find(l => l.employeeId === emp.id);
        
        let isEmpWoff = isWoff;
        let hasCeCubeHolidaysTemplate = false;
        if (emp.offDaysTemplates && emp.offDaysTemplates.length > 0) {
          let empOffDays = [];
          for (const templateName of emp.offDaysTemplates) {
            if (templateName.toLowerCase().includes('cecube group holidays') || templateName.toLowerCase().includes('cecube holidays')) {
              hasCeCubeHolidaysTemplate = true;
            }
            const type = weekoffTypes.find(t => t.name === templateName);
            if (type && type.days) {
              empOffDays = empOffDays.concat(type.days);
            }
          }
          isEmpWoff = empOffDays.includes(dayName) && !isWorkingAnn;
        }

        const isEmpHoliday = isGlobalHoliday && hasCeCubeHolidaysTemplate;

        if (empLeave) {
          finalStatus = empLeave.leaveType === 'Casual' ? 'CL' : empLeave.leaveType === 'Sick' ? 'SL' : empLeave.leaveType === 'Earned' ? 'EL' : empLeave.leaveType === 'Unpaid' ? 'LWP' : 'Leave';
        } else if (isEmpHoliday) {
          finalStatus = 'Holiday';
        } else if (isEmpWoff) {
          finalStatus = 'Weekly Off';
        }
      }

      return {
        employee: emp,
        status: finalStatus,
        shiftType: record ? record.shiftType : 'Day',
        timeSlots: record ? record.timeSlots : '[]',
        date: date
      };
    });

    return NextResponse.json(Array.isArray(result) ? result : []);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const { employeeId, date, status, shiftType = 'Day', timeSlots } = await request.json();

    let calculatedStatus = status === 'HD' ? 'Half Day' : status;
    let parsedSlots = [];
    try {
      parsedSlots = typeof timeSlots === 'string' ? JSON.parse(timeSlots || '[]') : (timeSlots || []);
    } catch {
      parsedSlots = [];
    }

    const latestSlot = parsedSlots.filter(slot => slot?.in && slot?.out).slice(-1)[0];
    if (latestSlot) {
      const employeeShift = await prisma.employeeShift.findFirst({
        where: { employeeId, effectiveFrom: { lte: date }, OR: [{ validTill: null }, { validTill: { gte: date } }] },
        include: { shift: true },
        orderBy: { effectiveFrom: 'desc' }
      });
      if (employeeShift?.shift) {
        const attendanceStatus = calculateAttendanceStatus(employeeShift.shift, latestSlot.in, latestSlot.out);
        calculatedStatus = attendanceStatus.status;
      }
    }

    // Ensure timeSlots is a string before saving
    const timeSlotsString = typeof timeSlots === 'string' ? timeSlots : JSON.stringify(timeSlots || []);

    // Get the existing record before upserting (to detect status change)
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date } }
    });

    // Upsert attendance record
    const record = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date
        }
      },
      update: { status: calculatedStatus, shiftType, timeSlots: timeSlotsString },
      create: { employeeId, date, status: calculatedStatus, shiftType, timeSlots: timeSlotsString }
    });

    // Leave refund logic:
    // If this date is being marked Present and was NOT already Present,
    // check if there's an approved leave covering this date and refund 1 day.
    const isNowPresent = status === 'Present';
    const wasAlreadyPresent = existing?.status === 'Present';

    if (isNowPresent && !wasAlreadyPresent) {
      // Find any APPROVED leave for this employee that covers this date
      const overlappingLeave = await prisma.leaveRequest.findFirst({
        where: {
          employeeId,
          status: 'APPROVED',
          startDate: { lte: date },
          endDate: { gte: date }
        }
      });

      if (overlappingLeave) {
        const balance = await prisma.leaveBalance.findUnique({
          where: { employeeId }
        });

        if (balance) {
          const refundDays = overlappingLeave.isHalfDay ? 0.5 : 1;
          let balanceUpdateData = {};
          const { leaveType } = overlappingLeave;

          if (leaveType === 'Casual') {
            balanceUpdateData.casualLeaves = balance.casualLeaves + refundDays;
          } else if (leaveType === 'Earned' || leaveType === 'Paid leave') {
            balanceUpdateData.earnedLeaves = balance.earnedLeaves + refundDays;
          } else if (leaveType === 'Leave Without Pay' || leaveType === 'Sick' || leaveType === 'Unpaid') {
            balanceUpdateData.leaveWithoutPay = Math.max(0, balance.leaveWithoutPay - refundDays);
          } else if (leaveType === 'COFF') {
            balanceUpdateData.compensatoryLeaves = balance.compensatoryLeaves + refundDays;
          }

          if (Object.keys(balanceUpdateData).length > 0) {
            await prisma.leaveBalance.update({
              where: { employeeId },
              data: balanceUpdateData
            });
          }
        }
      }
    }

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
