import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const indiaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getIndiaDate(date = new Date()) {
  const parts = Object.fromEntries(
    indiaDateFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function hasOpenPunch(timeSlots) {
  try {
    const slots = JSON.parse(timeSlots || '[]');
    return Array.isArray(slots) && slots.some(slot => slot?.in && !slot.out);
  } catch (error) {
    console.error('Could not parse attendance slots while checking live location:', error);
    return false;
  }
}

async function canViewAllLocations(session) {
  if (!session) return false;
  if (session.type === 'admin') return true;
  if (session.type !== 'employee') return false;

  const employee = await prisma.employee.findUnique({
    where: { id: session.id },
    select: { role: true, assignedModules: true },
  });
  if (!employee) return false;

  const role = String(employee.role || '').toUpperCase();
  const modules = Array.isArray(employee.assignedModules)
    ? employee.assignedModules.map(module => String(module).toUpperCase())
    : [];
  return role.includes('HR') || role.includes('ADMIN') ||
    modules.some(module => module === 'HR' || module.startsWith('HR:') || module === 'ADMIN');
}

export async function GET(request) {
  const session = readAuthSession(request);
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');

  const finalEmployeeId = session?.id || employeeId;

  if (!finalEmployeeId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const historyDate = searchParams.get('historyDate');
  const filterEmployeeId = searchParams.get('filterEmployeeId');
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');

  try {
    const canViewAll = session ? await canViewAllLocations(session) : false;
    
    // If they explicitly want history for a date
    if (historyDate) {
      if (!canViewAll && finalEmployeeId !== filterEmployeeId && finalEmployeeId !== employeeId) {
        // Fallback to their own ID if they can't view all
      }
      
      const queryEmpId = canViewAll ? filterEmployeeId || null : finalEmployeeId;
      
      const { Prisma } = require('@prisma/client');
      let histories = [];
      
      try {
        if (queryEmpId) {
          const ids = queryEmpId.split(',');
          histories = await prisma.$queryRaw`
            SELECT "employeeId", "latitude", "longitude", "timestamp"
            FROM "PunchLocationHistory"
            WHERE "date" = ${historyDate} AND "employeeId" IN (${Prisma.join(ids)})
            ORDER BY "timestamp" ASC
          `;
        } else {
          histories = await prisma.$queryRaw`
            SELECT "employeeId", "latitude", "longitude", "timestamp"
            FROM "PunchLocationHistory"
            WHERE "date" = ${historyDate}
            ORDER BY "timestamp" ASC
          `;
        }
      } catch (err) {
        console.error('Failed to query history via queryRaw', err);
      }
      
      // Filter by time if provided
      if (startTime || endTime) {
        histories = histories.filter(h => {
          const timeStr = new Date(h.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
          if (startTime && timeStr < startTime) return false;
          if (endTime && timeStr > endTime) return false;
          return true;
        });
      }

      // Group by employeeId to match the frontend format
      const employees = await prisma.employee.findMany({
        where: queryEmpId ? { id: queryEmpId } : {},
        select: { id: true, name: true, empId: true, department: true }
      });
      
      const employeeMap = new Map(employees.map(e => [e.id, e]));
      
      const grouped = {};
      histories.forEach(h => {
        if (!grouped[h.employeeId]) {
          grouped[h.employeeId] = {
            employeeId: h.employeeId,
            date: historyDate,
            latitude: h.latitude,
            longitude: h.longitude,
            updatedAt: h.timestamp,
            employee: employeeMap.get(h.employeeId) || null,
            path: []
          };
        }
        grouped[h.employeeId].latitude = h.latitude;
        grouped[h.employeeId].longitude = h.longitude;
        grouped[h.employeeId].updatedAt = h.timestamp;
        grouped[h.employeeId].path.push({ lat: h.latitude, lng: h.longitude, time: h.timestamp });
      });

      return NextResponse.json({ locations: Object.values(grouped) });
    }

    // Default Live View
    const targetDate = getIndiaDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    
    // Also respect filterEmployeeId in live view
    const queryEmpId = canViewAll ? filterEmployeeId || null : finalEmployeeId;

    const locations = await prisma.punchLiveLocation.findMany({
      where: {
        ...(queryEmpId ? { employeeId: { in: queryEmpId.split(',') } } : {}),
        date: { gte: targetDate },
        updatedAt: { gte: new Date(Date.now() - 16 * 60 * 60 * 1000) },
      },
      select: {
        employeeId: true,
        date: true,
        latitude: true,
        longitude: true,
        accuracy: true,
        updatedAt: true,
        employee: { select: { name: true, empId: true, department: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const activeEmployeeIds = locations.map(l => l.employeeId);
    
    let histories = [];
    if (activeEmployeeIds.length > 0) {
      const { Prisma } = require('@prisma/client');
      try {
        histories = await prisma.$queryRaw`
          SELECT "employeeId", "latitude", "longitude", "timestamp" 
          FROM "PunchLocationHistory" 
          WHERE "employeeId" IN (${Prisma.join(activeEmployeeIds)}) 
            AND "date" >= ${targetDate} 
            AND "timestamp" >= ${new Date(Date.now() - 16 * 60 * 60 * 1000)} 
          ORDER BY "timestamp" ASC
        `;
      } catch (err) {
        console.error('Failed to query history via queryRaw', err);
      }
    }

    // Attach history path to each location
    const locationsWithHistory = locations.map(loc => {
      let path = histories.filter(h => h.employeeId === loc.employeeId).map(h => ({
        lat: h.latitude,
        lng: h.longitude,
        time: h.timestamp
      }));
      
      if (startTime || endTime) {
        path = path.filter(h => {
          const timeStr = new Date(h.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
          if (startTime && timeStr < startTime) return false;
          if (endTime && timeStr > endTime) return false;
          return true;
        });
      }
      
      return { ...loc, path };
    });

    return NextResponse.json({ locations: locationsWithHistory });
  } catch (error) {
    console.error('Could not load punch live locations:', error);
    return NextResponse.json({ error: 'Could not load live locations' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = readAuthSession(request);
  
  try {
    const body = await request.json();
    const employeeId = session?.type === 'employee' ? session.id : body.employeeId;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee authentication required' }, { status: 401 });
    }

    if (body.latitude == null || body.longitude == null) {
      return NextResponse.json({ error: 'Valid location coordinates are required' }, { status: 400 });
    }
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const accuracy = body.accuracy == null ? null : Number(body.accuracy);
    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0))
    ) {
      return NextResponse.json({ error: 'Valid location coordinates are required' }, { status: 400 });
    }

    const today = getIndiaDate();
    const yesterday = getIndiaDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const attendance = await prisma.attendance.findMany({
      where: { employeeId: employeeId, date: { gte: yesterday, lte: today } },
      select: { date: true, timeSlots: true },
      orderBy: { date: 'desc' },
    });
    const activeAttendance = attendance.find(record => hasOpenPunch(record.timeSlots));
    if (!activeAttendance) {
      await prisma.punchLiveLocation.deleteMany({ where: { employeeId: employeeId } });
      return NextResponse.json({ error: 'There is no active punch-in to track' }, { status: 409 });
    }

    const location = await prisma.$transaction(async (tx) => {
      const live = await tx.punchLiveLocation.upsert({
        where: { employeeId: employeeId },
        create: {
          employeeId: employeeId,
          date: activeAttendance.date,
          latitude,
          longitude,
          accuracy,
          updatedAt: new Date(),
        },
        update: {
          date: activeAttendance.date,
          latitude,
          longitude,
          accuracy,
          updatedAt: new Date(),
        },
        select: { employeeId: true, date: true, latitude: true, longitude: true, accuracy: true, updatedAt: true },
      });
      
      try {
        const cuid = require('crypto').randomBytes(12).toString('hex');
        await tx.$executeRaw`
          INSERT INTO "PunchLocationHistory" ("id", "employeeId", "date", "latitude", "longitude", "accuracy", "timestamp")
          VALUES (${cuid}, ${employeeId}, ${activeAttendance.date}, ${latitude}, ${longitude}, ${accuracy == null ? null : accuracy}, ${new Date()})
        `;
      } catch (err) {
        console.error('Failed to insert history via executeRaw', err);
      }
      
      return live;
    });
    
    return NextResponse.json({ active: true, location });
  } catch (error) {
    console.error('Could not save punch live location:', error);
    return NextResponse.json({ error: 'Could not save live location' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = readAuthSession(request);
  const { searchParams } = new URL(request.url);
  const employeeId = session?.type === 'employee' ? session.id : searchParams.get('employeeId');

  if (!employeeId) {
    return NextResponse.json({ error: 'Employee authentication required' }, { status: 401 });
  }

  try {
    await prisma.punchLiveLocation.deleteMany({ where: { employeeId: employeeId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Could not stop punch live location:', error);
    return NextResponse.json({ error: 'Could not stop live location' }, { status: 500 });
  }
}
