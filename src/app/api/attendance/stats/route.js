import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { calculateAttendanceStatus } from '../../../../lib/attendanceCalculator';
import { getEffectiveEmployeeShift, resolveDayShiftAttendanceSlots } from '../../../../lib/attendanceShiftPolicy';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ error: 'employee not found' }, { status: 404 });
    }

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        // Last 6 months only — keeps employee dashboard fast
        date: { gte: (() => {
          const d = new Date();
          d.setMonth(d.getMonth() - 6);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        })() }
      }
    });

    const [holidays, workWeeks, approvedLeaves, employeeShifts] = await Promise.all([
      prisma.holiday.findMany(),
      prisma.workWeek.findMany(),
      prisma.leaveRequest.findMany({
        where: { employeeId, status: 'APPROVED' }
      }),
      prisma.employeeShift.findMany({
        where: { employeeId },
        include: { shift: true },
        orderBy: { effectiveFrom: 'desc' }
      })
    ]);
    
    // Convert to easy lookups
    const holidayDates = new Set(holidays.map(h => h.date));
    let nonWorkingDays = new Set(workWeeks.filter(w => !w.isWorking).map(w => w.day));
    
    // Default fallback: if no work week settings exist, assume Sunday is an off day
    if (workWeeks.length === 0) {
      nonWorkingDays.add('Sunday');
    }
    
    // Calculate leave dates
    const leaveDates = new Set();
    approvedLeaves.forEach(l => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      let curr = new Date(start);
      while (curr <= end) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        leaveDates.add(`${y}-${m}-${d}`);
        curr.setDate(curr.getDate() + 1);
      }
    });

    const today = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', { 
      timeZone: 'Asia/Kolkata', 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(today);
    const p = {};
    parts.forEach(part => p[part.type] = part.value);
    const todayStr = `${p.year}-${p.month}-${p.day}`;
    let currentHour = parseInt(p.hour, 10);
    if (currentHour === 24) currentHour = 0;
    const currentTime = `${String(currentHour).padStart(2, '0')}:${p.minute || '00'}`;

    const isNightTime = (t) => t ? (t > '19:00' || t <= '08:00') : false;
    const dayCountsAsNightShift = (slots, shiftType, effStatus) => {
      const withIn = slots.filter(s => s.in);
      if (withIn.length > 0) {
        const firstIn = withIn.reduce((min, s) => (!min || s.in < min) ? s.in : min, null);
        return isNightTime(firstIn);
      }
      
      const hasOnlyOut = slots.length > 0 && slots.every(s => !s.in && s.out);
      if (hasOnlyOut) {
        return false;
      }
      
      return shiftType === 'Night' || shiftType === 'Night Shift' || effStatus === 'Night Shift';
    };

    // Group by month
    const statsByMonth = {};
    const recordMap = new Map();

    records.forEach(record => {
      let parsedSlots = [];
      try {
        parsedSlots = record.timeSlots ? JSON.parse(record.timeSlots) : [];
      } catch {
        parsedSlots = [];
      }
      const effectiveShift = getEffectiveEmployeeShift(employeeShifts, record.employeeId, record.date);
      const updatedSlots = resolveDayShiftAttendanceSlots({
        shift: effectiveShift?.shift,
        existingSlots: parsedSlots,
        attendanceDate: record.date,
        today: todayStr,
        currentTime,
        isApproved: record.isApproved,
      });
      if (updatedSlots) {
        parsedSlots = updatedSlots;
        prisma.attendance.update({
          where: { id: record.id },
          data: { timeSlots: JSON.stringify(parsedSlots) }
        }).catch(() => {});
        record.timeSlots = JSON.stringify(parsedSlots); // update in memory
      }
      recordMap.set(record.date, record);
    });

    // Start from 6 months ago, 1st of month
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    startDate.setDate(1);
    
    let iterDate = new Date(startDate);
    iterDate.setHours(0, 0, 0, 0); // Reset time to midnight local time

    while (true) {
      const year = iterDate.getFullYear();
      const month = String(iterDate.getMonth() + 1).padStart(2, '0');
      const day = String(iterDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      if (dateStr > todayStr) {
        break; // stop when we've processed up to todayStr
      }
      
      const monthPrefix = `${year}-${month}`;
      const dayName = iterDate.toLocaleDateString('en-US', { weekday: 'long' });

      if (!statsByMonth[monthPrefix]) {
        statsByMonth[monthPrefix] = {
          month: monthPrefix,
          TotalDays: 0,
          TotalWorkingDays: 0,
          OffDays: 0,
          Holidays: 0,
          Leave: 0,
          Present: 0,
          Absent: 0,
          COFF: 0,
          'Night Shift': 0,
          Late: 0,
          details: []
        };
      }

      const mStat = statsByMonth[monthPrefix];
      mStat.TotalDays++;

      const isHoliday = holidayDates.has(dateStr);
      const isOffDay = nonWorkingDays.has(dayName);
      const isLeave = leaveDates.has(dateStr);
      const record = recordMap.get(dateStr);

      if (isHoliday) mStat.Holidays++;
      else if (isOffDay) mStat.OffDays++;
      else mStat.TotalWorkingDays++;

      let statusToPush = '';

      if (record) {
        let effStatus = record.status;
        const slots = record.timeSlots ? JSON.parse(record.timeSlots) : [];
        const completedSlot = slots.filter(s => s?.in && s?.out).slice(-1)[0];
        const effectiveShift = getEffectiveEmployeeShift(employeeShifts, employeeId, dateStr);
        const calculateTotalMins = (arr) => {
          if (!Array.isArray(arr)) return 0;
          let mins = 0;
          arr.forEach(slot => {
            if (slot?.in && slot?.out) {
              const [inH, inM] = slot.in.split(':').map(Number);
              const [outH, outM] = slot.out.split(':').map(Number);
              const inTotal = (inH || 0) * 60 + (inM || 0);
              let outTotal = (outH || 0) * 60 + (outM || 0);
              if (outTotal < inTotal) {
                const adjustedOut = outTotal + 12 * 60;
                outTotal = adjustedOut >= inTotal ? adjustedOut : outTotal + 24 * 60;
              }
              mins += (outTotal - inTotal);
            }
          });
          return mins;
        };

        const totalMins = calculateTotalMins(slots);

        if (totalMins >= 350) {
          effStatus = 'Present';
        } else if (completedSlot && effectiveShift?.shift) {
          effStatus = calculateAttendanceStatus(effectiveShift.shift, completedSlot.in, completedSlot.out).status;
        }
        if (dateStr < todayStr && effStatus !== 'Present' && effStatus !== 'Late' && effStatus !== 'Night Shift' && effStatus !== 'COFF') {
          if (slots.length === 0 || slots.some(s => !s.out || !s.in)) {
            effStatus = 'Absent';
          }
        }
        
        if (isLeave && (slots.length === 0 || effStatus === 'Absent' || effStatus === 'No Punch')) {
          effStatus = 'On Leave';
        }
        
        statusToPush = effStatus;
        if (effStatus === 'Present' || effStatus === 'Late') mStat.Present++;
        else if (effStatus === 'Absent') mStat.Absent++;
        else if (effStatus === 'COFF') mStat.COFF++;
        else if (effStatus === 'On Leave') mStat.Leave++;
        
        if (effStatus === 'Late') mStat.Late++;
        if (dayCountsAsNightShift(slots, record.shiftType, effStatus)) mStat['Night Shift']++;

      } else {
        if (isLeave) {
          statusToPush = 'On Leave';
          mStat.Leave++;
        } else if (isHoliday) {
          statusToPush = 'Holiday';
        } else if (isOffDay) {
          statusToPush = 'Off';
        } else if (dateStr < todayStr) {
          statusToPush = 'Absent';
          mStat.Absent++;
        } else {
          statusToPush = 'No Punch';
        }
      }

      if (statusToPush) {
        mStat.details.push({
          date: dateStr,
          status: statusToPush,
          shiftType: record ? (record.shiftType || 'Day') : '-',
          timeSlots: record && record.timeSlots ? JSON.parse(record.timeSlots) : []
        });
      }

      iterDate.setDate(iterDate.getDate() + 1);
    }

    // Convert to sorted array and sort details by date
    const result = Object.values(statsByMonth).sort((a, b) => b.month.localeCompare(a.month));
    result.forEach(month => {
        month.details.sort((a, b) => b.date.localeCompare(a.date));
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
