import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const supervisorId = searchParams.get('supervisorId');
    const employeeId = searchParams.get('employeeId');

    const where = {};
    if (supervisorId) {
      where.employee = { supervisorId: supervisorId };
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate
      };
    } else if (startDate) {
      where.date = { gte: startDate };
    } else if (endDate) {
      where.date = { lte: endDate };
    }

    const requests = await prisma.punchRequest.findMany({
      where,
      include: {
        employee: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    const latitude = data.latitude !== undefined && data.latitude !== null ? parseFloat(data.latitude) : null;
    const longitude = data.longitude !== undefined && data.longitude !== null ? parseFloat(data.longitude) : null;

    if (data.type === 'IN' && (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180
    )) {
      return NextResponse.json(
        { error: 'Location is required to punch in.' },
        { status: 400 }
      );
    }

    let finalDate = data.date;
    const timeStr = data.time || '';
    
    let shiftType = data.shiftType || 'Day';
    let isOvertime = false;
    let overtimeHours = 0;

    // If it's an early morning punch out for a night shift, the shift actually belongs to the previous calendar day
    if (data.type === 'OUT' && shiftType === 'Night' && timeStr < '12:00') {
      const d = new Date(`${data.date}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      finalDate = d.toISOString().split('T')[0];
    }

    // Overtime logic if needed
    if (data.type === 'OUT' && timeStr > '08:00' && shiftType === 'Night') {
      const [otH, otM] = timeStr.split(':').map(Number);
      overtimeHours = (otH - 8) + (otM / 60);
      if (overtimeHours > 0) {
        isOvertime = true;
      }
    }

    const newRequest = await prisma.punchRequest.create({
      data: {
        employeeId: data.employeeId,
        type: data.type,
        time: timeStr,
        date: finalDate,
        shiftType: shiftType,
        reason: data.reason || null,
        status: 'PENDING',
        latitude,
        longitude,
        locationName: data.locationName || null
      }
    });

    if (isOvertime) {
      await prisma.overtimeAssignment.create({
        data: {
          employeeId: data.employeeId,
          date: finalDate, // associate OT with the shift date
          hours: overtimeHours.toFixed(2),
          reason: `Auto-generated for late night shift punch out at ${timeStr}`,
          status: 'PENDING',
        }
      });
    }

    return NextResponse.json(newRequest);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { employeeId, date, type, latitude, longitude } = await request.json();
    // Find the most recent punch of this type for this employee+date and update its location
    const punch = await prisma.punchRequest.findFirst({
      where: { employeeId, date, type },
      orderBy: { createdAt: 'desc' }
    });
    if (!punch) return NextResponse.json({ error: 'Punch not found' }, { status: 404 });
    const updated = await prisma.punchRequest.update({
      where: { id: punch.id },
      data: {
        latitude: latitude !== undefined && latitude !== null ? parseFloat(latitude) : null,
        longitude: longitude !== undefined && longitude !== null ? parseFloat(longitude) : null
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, status, grantCoff } = data;

    const updatedRequest = await prisma.punchRequest.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    const { employeeId, date, time, type, shiftType } = updatedRequest;

    if (status === 'APPROVED') {
      const holiday = await prisma.holiday.findUnique({ where: { date } });
      const isHoliday = !!holiday;
      
      // Grant COFF if explicitly requested or if it's an approved IN/REGULARIZE punch on a holiday
      const shouldGrantCoff = grantCoff || (isHoliday && (type === 'IN' || type === 'REGULARIZE'));

      if (shouldGrantCoff) {
        // Find balance first
        const balance = await prisma.leaveBalance.findUnique({ where: { employeeId } });
        if (balance) {
          await prisma.leaveBalance.update({
            where: { employeeId },
            data: { compensatoryLeaves: { increment: 1 } }
          });
        }
      }

      if (type === 'COFF_CONVERSION') {
        const coffsRequested = parseInt(time) || 0;
        if (coffsRequested > 0) {
          const balance = await prisma.leaveBalance.findUnique({ where: { employeeId } });
          if (balance) {
            await prisma.leaveBalance.update({
              where: { employeeId },
              data: { compensatoryLeaves: { increment: coffsRequested } }
            });
          }
        }
      }
    }

    // IN/OUT punches already write attendance immediately on punch.
    // APPROVED → keep attendance as-is (confirm only).
    // REJECTED → cancel/revert that punch from attendance.
    // PENDING → leave attendance waiting for approval (no change).
    // REGULARIZE → attendance is only applied on approve (not on submit).

    if (status === 'APPROVED' && type === 'REGULARIZE') {
      let attendance = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId, date } }
      });

      let timeSlots = attendance && attendance.timeSlots ? JSON.parse(attendance.timeSlots) : [];

      try {
        const reqTime = JSON.parse(time);
        if (timeSlots.length === 0) {
          timeSlots.push({ in: reqTime.in || '', out: reqTime.out || '' });
        } else if (reqTime.in && reqTime.out) {
          timeSlots.push({ in: reqTime.in, out: reqTime.out });
        } else {
          let targetSlot = timeSlots.find(s => !s.in || !s.out);
          if (targetSlot) {
            if (reqTime.in) targetSlot.in = reqTime.in;
            if (reqTime.out) targetSlot.out = reqTime.out;
          } else {
            timeSlots.push({ in: reqTime.in || '', out: reqTime.out || '' });
          }
        }

        timeSlots.sort((a, b) => {
          if (!a.in) return 1;
          if (!b.in) return -1;
          return a.in.localeCompare(b.in);
        });
      } catch (e) {
        if (timeSlots.length === 0) {
          timeSlots.push({ in: '09:30', out: '18:30' });
        }
      }

      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId, date } },
        update: {
          timeSlots: JSON.stringify(timeSlots),
          status: 'Present',
          shiftType: shiftType
        },
        create: {
          employeeId,
          date,
          status: 'Present',
          shiftType: shiftType,
          timeSlots: JSON.stringify(timeSlots)
        }
      });
    }

    if (status === 'REJECTED' && (type === 'IN' || type === 'OUT')) {
      const attendance = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId, date } }
      });

      if (attendance) {
        let timeSlots = attendance.timeSlots ? JSON.parse(attendance.timeSlots) : [];

        if (type === 'IN') {
          // Remove the slot that matches this punch-in time
          const idx = timeSlots.findIndex(s => s.in === time);
          if (idx !== -1) {
            timeSlots.splice(idx, 1);
          } else if (timeSlots.length > 0) {
            // Fallback: remove last open or last slot
            const openIdx = timeSlots.findIndex(s => s.in && !s.out);
            timeSlots.splice(openIdx !== -1 ? openIdx : timeSlots.length - 1, 1);
          }
        } else if (type === 'OUT') {
          // Clear the out time that matches this punch-out
          const idx = timeSlots.findIndex(s => s.out === time);
          if (idx !== -1) {
            timeSlots[idx].out = '';
            // If slot has no in either, drop it
            if (!timeSlots[idx].in) timeSlots.splice(idx, 1);
          } else if (timeSlots.length > 0) {
            timeSlots[timeSlots.length - 1].out = '';
            if (!timeSlots[timeSlots.length - 1].in) {
              timeSlots.pop();
            }
          }
        }

        const hasValidPunch = timeSlots.some(s => s.in || s.out);

        if (!hasValidPunch) {
          // No punches left — cancel attendance for the day
          await prisma.attendance.update({
            where: { employeeId_date: { employeeId, date } },
            data: {
              timeSlots: JSON.stringify([]),
              status: 'Absent'
            }
          });
        } else {
          await prisma.attendance.update({
            where: { employeeId_date: { employeeId, date } },
            data: {
              timeSlots: JSON.stringify(timeSlots),
              status: 'Present'
            }
          });
        }
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
