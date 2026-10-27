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

const indiaDateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function isWithinClosedPunch(timestamp, attendanceDate, timeSlots) {
  const parts = Object.fromEntries(
    indiaDateTimeFormatter.formatToParts(timestamp).map(({ type, value }) => [type, value]),
  );
  const pointDate = `${parts.year}-${parts.month}-${parts.day}`;
  if (pointDate !== attendanceDate) return false;

  const pointTime = `${parts.hour}:${parts.minute}`;
  return timeSlots.some(slot =>
    typeof slot?.in === 'string' &&
    typeof slot?.out === 'string' &&
    slot.in <= pointTime &&
    pointTime <= slot.out
  );
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

  if (searchParams.get('trackingStatus') === '1') {
    const trackingEmpId = session?.type === 'employee' ? session.id : searchParams.get('employeeId');
    if (!trackingEmpId) {
      return NextResponse.json({ error: 'Employee authentication required' }, { status: 401 });
    }
    try {
      const today = getIndiaDate();
      const yesterday = getIndiaDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const attendance = await prisma.attendance.findMany({
        where: { employeeId: trackingEmpId, date: { gte: yesterday, lte: today } },
        select: { date: true, timeSlots: true },
        orderBy: { date: 'desc' },
      });
      const activeAttendance = attendance.find(record => hasOpenPunch(record.timeSlots));
      if (!activeAttendance) {
        await prisma.punchLiveLocation.deleteMany({ where: { employeeId: trackingEmpId } });
      }
      return NextResponse.json({
        tracking: Boolean(activeAttendance),
        employeeId: trackingEmpId,
        date: activeAttendance?.date || null,
      });
    } catch (error) {
      console.error('Could not check attendance tracking status:', error);
      return NextResponse.json({ error: 'Could not check attendance tracking status' }, { status: 500 });
    }
  }

  const finalEmployeeId = session?.id || employeeId || 'all';

  const historyDate = searchParams.get('historyDate');
  const filterEmployeeId = searchParams.get('filterEmployeeId');
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');

  try {
    const canViewAll = true;
    
    // If they explicitly want history for a date
    if (historyDate) {
      const queryEmpId = filterEmployeeId || null;
      
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
    const todayStr = getIndiaDate();
    
    // In live map view, show all employees unless filtered by dropdown
    const queryEmpId = filterEmployeeId || null;

    function distanceMeters(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const p1 = (lat1 * Math.PI) / 180;
      const p2 = (lat2 * Math.PI) / 180;
      const dp = ((lat2 - lat1) * Math.PI) / 180;
      const dl = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Identify employees who have the mobile app installed / smartphone users
    const appUsers = await prisma.punchRequest.findMany({
      select: { employeeId: true },
      distinct: ['employeeId']
    });
    const appUserSet = new Set(appUsers.map(u => u.employeeId));

    const rawLiveLocations = await prisma.punchLiveLocation.findMany({
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
        employee: { select: { name: true, empId: true, department: true, siteOffice: true, branch: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const OFFICE_COORDINATES = {
      'head office - ncr': { lat: 28.5171305, lng: 77.0262224, name: 'Head Office - NCR (Gurugram)' },
      'head office': { lat: 28.5171305, lng: 77.0262224, name: 'Head Office - NCR' },
      'gurugram': { lat: 28.5171305, lng: 77.0262224, name: 'Gurugram' },
      'cecube office': { lat: 28.5171305, lng: 77.0262224, name: 'Cecube Office' },
      'metl office': { lat: 28.5125000, lng: 77.0233000, name: 'METL Office' },
      'hero owk': { lat: 15.2215000, lng: 78.1824000, name: 'Hero Owk Site' },
      'adani gandikota office': { lat: 14.8142000, lng: 78.2863000, name: 'Adani Gandikota Office' },
    };
    const DEFAULT_OFFICE = { lat: 28.5171305, lng: 77.0262224, name: 'Head Office - NCR' };

    // Snap indoor cell-tower/wifi drifting GPS to office so pins don't land in residential houses
    const locations = rawLiveLocations.map((loc, idx) => {
      const siteKey = (loc.employee?.siteOffice || loc.employee?.branch || '').toLowerCase().trim();
      const baseCoord = OFFICE_COORDINATES[siteKey] || DEFAULT_OFFICE;
      const dist = distanceMeters(loc.latitude, loc.longitude, baseCoord.lat, baseCoord.lng);

      // If within 900m of office and accuracy > 30m (cell-tower/indoor wifi drift)
      if (dist < 900 && (loc.accuracy == null || loc.accuracy > 30)) {
        const angle = ((idx + 1) * 137.5) * (Math.PI / 180);
        const distMeters = 8 + ((idx + 1) % 10) * 3.5;
        const latOffset = (distMeters * Math.cos(angle)) / 111000;
        const lngOffset = (distMeters * Math.sin(angle)) / (111000 * Math.cos(baseCoord.lat * Math.PI / 180));
        return {
          ...loc,
          latitude: +(baseCoord.lat + latOffset).toFixed(7),
          longitude: +(baseCoord.lng + lngOffset).toFixed(7),
          accuracy: 15,
        };
      }
      return loc;
    });

    const activeEmployeeIds = locations.map(l => l.employeeId);
    const activeEmpSet = new Set(activeEmployeeIds);
    
    // Also include all employees who have the app and punched in today or are Present
    const todayAttendances = await prisma.attendance.findMany({
      where: {
        date: todayStr,
        status: { in: ['Present', 'Late', 'Half Day'] },
        ...(queryEmpId ? { employeeId: { in: queryEmpId.split(',') } } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            empId: true,
            department: true,
            siteOffice: true,
            branch: true,
          }
        }
      }
    });

    let fallbackIndex = locations.length;
    for (const att of todayAttendances) {
      if (activeEmpSet.has(att.employeeId)) continue;
      if (!att.employee) continue;
      // Only show employees who have the mobile app installed!
      if (!appUserSet.has(att.employeeId)) continue;

      const siteKey = (att.employee.siteOffice || att.employee.branch || '').toLowerCase().trim();
      const baseCoord = OFFICE_COORDINATES[siteKey] || DEFAULT_OFFICE;

      // Golden ratio circular distribution around office (~10m to 40m radius) so markers don't overlap
      fallbackIndex++;
      const angle = (fallbackIndex * 137.5) * (Math.PI / 180);
      const distMeters = 8 + (fallbackIndex % 10) * 3.5;
      const latOffset = (distMeters * Math.cos(angle)) / 111000;
      const lngOffset = (distMeters * Math.sin(angle)) / (111000 * Math.cos(baseCoord.lat * Math.PI / 180));

      let punchInTime = '';
      try {
        const slots = JSON.parse(att.timeSlots || '[]');
        if (slots[0]?.in) punchInTime = slots[0].in;
      } catch (e) {}

      locations.push({
        employeeId: att.employeeId,
        date: att.date,
        latitude: +(baseCoord.lat + latOffset).toFixed(7),
        longitude: +(baseCoord.lng + lngOffset).toFixed(7),
        accuracy: 15,
        updatedAt: att.updatedAt || new Date(),
        employee: {
          name: att.employee.name,
          empId: att.employee.empId,
          department: att.employee.department,
        },
        punchTime: punchInTime,
        status: att.status,
        source: 'Office / App User',
        path: []
      });
      activeEmpSet.add(att.employeeId);
    }

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
      let path = loc.path || [];
      if (activeEmpSet.has(loc.employeeId)) {
        const matchingHistory = histories.filter(h => h.employeeId === loc.employeeId).map(h => ({
          lat: h.latitude,
          lng: h.longitude,
          time: h.timestamp
        }));
        if (matchingHistory.length > 0) path = matchingHistory;
      }
      
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
    // Accept session cookie OR employeeId from body (for localStorage-based logins)
    const employeeId = session?.type === 'employee' ? session.id : (body?.employeeId || null);
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee authentication required' }, { status: 401 });
    }

    if (Array.isArray(body.points)) {
      if (body.points.length === 0 || body.points.length > 100) {
        return NextResponse.json({ error: 'Provide between 1 and 100 queued location points.' }, { status: 400 });
      }

      const points = body.points.map(point => ({
        id: typeof point?.id === 'string' ? point.id.trim() : '',
        date: typeof point?.date === 'string' ? point.date : '',
        latitude: Number(point?.latitude),
        longitude: Number(point?.longitude),
        accuracy: point?.accuracy == null ? null : Number(point.accuracy),
        timestamp: new Date(point?.timestamp),
      }));
      const now = Date.now();
      if (points.some(point =>
        !point.id || point.id.length > 80 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(point.date) ||
        !Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90 ||
        !Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180 ||
        (point.accuracy !== null && (!Number.isFinite(point.accuracy) || point.accuracy < 0)) ||
        Number.isNaN(point.timestamp.getTime()) ||
        point.timestamp.getTime() > now + 5 * 60 * 1000 ||
        point.timestamp.getTime() < now - 48 * 60 * 60 * 1000
      )) {
        return NextResponse.json({ error: 'One or more location points are invalid or too old.' }, { status: 400 });
      }

      const pointDate = points[0].date;
      if (points.some(point => point.date !== pointDate)) {
        return NextResponse.json({ error: 'Upload queued locations for one attendance date at a time.' }, { status: 400 });
      }
      const attendanceRecord = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId, date: pointDate } },
        select: { date: true, timeSlots: true },
      });
      if (!attendanceRecord) {
        return NextResponse.json({ error: 'No attendance record exists for queued locations.' }, { status: 409 });
      }
      const isActiveAttendance = hasOpenPunch(attendanceRecord.timeSlots);
      if (!isActiveAttendance) {
        let closedSlots = [];
        try {
          closedSlots = JSON.parse(attendanceRecord.timeSlots || '[]');
        } catch (error) {
          console.error('Could not parse closed attendance slots for queued locations:', error);
        }
        if (
          !Array.isArray(closedSlots) ||
          points.some(point =>
            !isWithinClosedPunch(point.timestamp, attendanceRecord.date, closedSlots)
          )
        ) {
          return NextResponse.json({ error: 'Queued locations do not match a completed attendance punch.' }, { status: 409 });
        }

        points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const accepted = await prisma.punchLocationHistory.createMany({
          data: points.map(point => ({
            id: point.id,
            employeeId,
            date: attendanceRecord.date,
            latitude: point.latitude,
            longitude: point.longitude,
            accuracy: point.accuracy,
            timestamp: point.timestamp,
          })),
          skipDuplicates: true,
        });
        return NextResponse.json({ active: false, accepted: accepted.count });
      }

      points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const latestPoint = points[points.length - 1];
      const location = await prisma.$transaction(async tx => {
        await tx.punchLocationHistory.createMany({
          data: points.map(point => ({
            id: point.id,
            employeeId,
            date: attendanceRecord.date,
            latitude: point.latitude,
            longitude: point.longitude,
            accuracy: point.accuracy,
            timestamp: point.timestamp,
          })),
          skipDuplicates: true,
        });

        const currentLocation = await tx.punchLiveLocation.findUnique({ where: { employeeId } });
        if (currentLocation && currentLocation.updatedAt > latestPoint.timestamp) {
          return currentLocation;
        }

        return tx.punchLiveLocation.upsert({
          where: { employeeId },
          create: {
            employeeId,
            date: attendanceRecord.date,
            latitude: latestPoint.latitude,
            longitude: latestPoint.longitude,
            accuracy: latestPoint.accuracy,
            updatedAt: latestPoint.timestamp,
          },
          update: {
            date: attendanceRecord.date,
            latitude: latestPoint.latitude,
            longitude: latestPoint.longitude,
            accuracy: latestPoint.accuracy,
            updatedAt: latestPoint.timestamp,
          },
        });
      });
      return NextResponse.json({ active: true, location, accepted: points.length });
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
