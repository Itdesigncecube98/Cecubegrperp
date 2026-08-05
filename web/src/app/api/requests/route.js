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
    const newRequest = await prisma.punchRequest.create({
      data: {
        employeeId: data.employeeId,
        type: data.type,
        time: data.time,
        date: data.date,
        shiftType: data.shiftType || 'Day',
        status: 'PENDING'
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
    const { id, status } = data;
    
    // Update the request status
    const updatedRequest = await prisma.punchRequest.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    // If approved, we need to update the actual attendance
    if (status === 'APPROVED') {
      const { employeeId, date, time, type, shiftType } = updatedRequest;
      
      // Get existing attendance
      let attendance = await prisma.attendance.findUnique({
        where: {
          employeeId_date: { employeeId, date }
        }
      });

      let timeSlots = attendance && attendance.timeSlots ? JSON.parse(attendance.timeSlots) : [];

      if (type === 'IN') {
        timeSlots.push({ in: time, out: '' });
      } else if (type === 'OUT') {
        if (timeSlots.length > 0) {
          timeSlots[timeSlots.length - 1].out = time;
        } else {
          timeSlots.push({ in: '', out: time });
        }
      }

      await prisma.attendance.upsert({
        where: {
          employeeId_date: { employeeId, date }
        },
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

    return NextResponse.json(updatedRequest);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
