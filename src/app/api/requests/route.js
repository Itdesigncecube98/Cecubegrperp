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

    const newRequest = await prisma.punchRequest.create({
      data: {
        employeeId: data.employeeId,
        type: data.type,
        time: data.time || '',
        date: data.date,
        shiftType: data.shiftType || 'Day',
        reason: data.reason || null,
        status: 'PENDING',
        latitude,
        longitude
      }
    });

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
    const { id, status } = data;

    const updatedRequest = await prisma.punchRequest.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    const { employeeId, date, time, type, shiftType } = updatedRequest;

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
