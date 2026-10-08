import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "../../../../lib/prisma";
import { getEffectiveEmployeeShift, resolveDayShiftAttendanceSlots } from "../../../../lib/attendanceShiftPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingPunch = {
  deviceLogId: number;
  deviceId: string | null;
  userId?: string | null;
  employeeCode?: string | null;
  employeeName?: string | null;
  designation?: string | null;
  direction?: string | null;
  punchTime: string;
  location?: string | null;
};

function keyMatches(provided: string | null): boolean {
  const expected = process.env.ATTENDANCE_API_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const indiaTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getIndiaDateAndTime(value: Date) {
  const parts = Object.fromEntries(
    indiaTimeFormatter.formatToParts(value).map(({ type, value: part }) => [type, part]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export async function POST(request: Request) {
  if (!keyMatches(request.headers.get("x-api-key"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { source?: string; punches?: IncomingPunch[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const punches = body?.punches;
  if (!Array.isArray(punches)) {
    return NextResponse.json({ error: "punches must be an array" }, { status: 400 });
  }
  if (punches.length > 2000) {
    return NextResponse.json({ error: "too many punches in one request" }, { status: 413 });
  }

  const source = typeof body.source === "string" && body.source.trim()
    ? body.source.trim().slice(0, 100)
    : "etimetracklite";
  const indiaNow = getIndiaDateAndTime(new Date());
  const rows: Array<{
    deviceLogId: number;
    deviceId: string;
    userId: string | null;
    employeeCode: string | null;
    employeeName: string | null;
    designation: string | null;
    direction: string | null;
    punchTime: Date;
    location: string | null;
    source: string;
  }> = [];
  let invalid = 0;

  for (const punch of punches) {
    const punchTime = new Date(punch?.punchTime);
    if (
      !punch ||
      !Number.isSafeInteger(punch.deviceLogId) ||
      punch.deviceLogId < 0 ||
      typeof punch.deviceId !== "string" ||
      !punch.deviceId.trim() ||
      Number.isNaN(punchTime.getTime())
    ) {
      invalid++;
      continue;
    }

    rows.push({
      deviceLogId: punch.deviceLogId,
      deviceId: punch.deviceId.trim().slice(0, 100),
      userId: typeof punch.userId === "string" ? punch.userId.slice(0, 100) : null,
      employeeCode: typeof punch.employeeCode === "string" ? punch.employeeCode.slice(0, 100) : null,
      employeeName: typeof punch.employeeName === "string" ? punch.employeeName.slice(0, 200) : null,
      designation: typeof punch.designation === "string" ? punch.designation.slice(0, 200) : null,
      direction: typeof punch.direction === "string" ? punch.direction.slice(0, 50) : null,
      punchTime,
      location: typeof punch.location === "string" ? punch.location.slice(0, 200) : null,
      source,
    });
  }

  const result = await prisma.attendancePunch.createMany({ data: rows, skipDuplicates: true });

  // Device user IDs and HR employee codes often differ. Prefer a persisted
  // device/user mapping, then an exact HR-code alias, then an unambiguous
  // employee-name + optional designation match. Save first-time matches so
  // future attendance runs resolve by device ID instead of relying on names.
  const identityForPunch = (punch: { deviceId: string; userId: string | null; employeeCode: string | null }) =>
    punch.userId ? `${punch.deviceId}|${punch.userId}` : `${punch.deviceId}|code:${punch.employeeCode || ""}`;
  const affectedDays = new Set<string>();
  const employeeCodes = [...new Set(rows.map((row) => row.employeeCode).filter((code): code is string => Boolean(code)))];
  for (const row of rows) {
    if (!row.employeeCode && !row.userId) continue;
    const identity = identityForPunch(row);
    affectedDays.add(`${identity}|${getIndiaDateAndTime(row.punchTime).date}`);
  }

  let attendanceUpdated = 0;
  let attendanceSkippedApproved = 0;
  let attendanceSkippedNonDayShift = 0;
  let deviceUsersMapped = 0;
  let unmatchedEmployeeCodes: string[] = [];

  if (affectedDays.size > 0) {
    const employees = await prisma.employee.findMany({
      select: { id: true, empId: true, name: true, designation: true },
    });
    const employeeByKey = new Map<string, { id: string; ambiguous: boolean }>();
    const addKey = (key: string, id: string) => {
      const normalized = key.trim().toLowerCase();
      if (!normalized) return;
      const existing = employeeByKey.get(normalized);
      employeeByKey.set(normalized, existing && existing.id !== id
        ? { id: "", ambiguous: true }
        : { id, ambiguous: false });
    };
    const employeeByName = new Map<string, Array<{ id: string; designation: string | null }>>();
    for (const employee of employees) {
      const raw = employee.empId?.trim().toLowerCase();
      if (raw) {
        addKey(raw, employee.id);
        const ceipl = raw.match(/^ceipl0*(\d+)$/);
        if (ceipl) addKey(ceipl[1], employee.id);
        const ftc = raw.match(/^ftc0*(\d+)$/);
        if (ftc) addKey(ftc[1], employee.id);
        const cgepl = raw.match(/^cgepl(\d+)$/);
        if (cgepl) addKey(`990${cgepl[1].padStart(3, "0")}`, employee.id);
      }
      const normalizedName = employee.name.trim().replace(/\s+/g, " ").toLowerCase();
      if (normalizedName) {
        const matches = employeeByName.get(normalizedName) || [];
        matches.push({ id: employee.id, designation: employee.designation });
        employeeByName.set(normalizedName, matches);
      }
    }

    const incomingDeviceIds = [...new Set(rows.map(row => row.deviceId))];
    const savedMappings = await prisma.attendanceDeviceEmployeeMap.findMany({
      where: { deviceId: { in: incomingDeviceIds } },
      select: { deviceId: true, userId: true, employeeId: true },
    });
    const employeeByIdentity = new Map<string, string>();
    for (const mapping of savedMappings) employeeByIdentity.set(`${mapping.deviceId}|${mapping.userId}`, mapping.employeeId);

    const newMappings = new Map<string, { deviceId: string; userId: string; employeeId: string }>();
    for (const row of rows) {
      const identity = identityForPunch(row);
      if (employeeByIdentity.has(identity)) continue;

      const codeMatch = row.employeeCode ? employeeByKey.get(row.employeeCode.trim().toLowerCase()) : null;
      let employeeId = codeMatch && !codeMatch.ambiguous ? codeMatch.id : null;
      if (!employeeId && row.employeeName) {
        const normalizedName = row.employeeName.trim().replace(/\s+/g, " ").toLowerCase();
        const nameMatches = employeeByName.get(normalizedName) || [];
        let candidates = nameMatches;
        if (candidates.length > 1 && row.designation) {
          const normalizedDesignation = row.designation.trim().replace(/\s+/g, " ").toLowerCase();
          candidates = candidates.filter(employee => employee.designation?.trim().replace(/\s+/g, " ").toLowerCase() === normalizedDesignation);
        }
        if (candidates.length === 1) employeeId = candidates[0].id;
      }
      if (!employeeId) continue;

      employeeByIdentity.set(identity, employeeId);
      if (row.userId) {
        newMappings.set(identity, { deviceId: row.deviceId, userId: row.userId, employeeId });
      }
    }

    if (newMappings.size > 0) {
      await prisma.attendanceDeviceEmployeeMap.createMany({
        data: [...newMappings.values()],
        skipDuplicates: true,
      });
      deviceUsersMapped = newMappings.size;
    }
    unmatchedEmployeeCodes = employeeCodes.filter(code => !rows.some(row =>
      row.employeeCode === code && employeeByIdentity.has(identityForPunch(row))));

    const dayKeys = [...affectedDays].map((key) => {
      const separator = key.lastIndexOf("|");
      return { identity: key.slice(0, separator), date: key.slice(separator + 1) };
    });
    const dates = dayKeys.map(({ date }) => date).sort();
    const rangeStart = new Date(`${dates[0]}T00:00:00+05:30`);
    const rangeEnd = new Date(`${dates[dates.length - 1]}T00:00:00+05:30`);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

    const storedPunches = await prisma.attendancePunch.findMany({
      where: { deviceId: { in: incomingDeviceIds }, punchTime: { gte: rangeStart, lt: rangeEnd } },
      orderBy: { punchTime: "asc" },
    });
    const attendanceEmployeeIds = [...new Set(
      [...employeeByIdentity.values()]
    )];
    const employeeShifts = attendanceEmployeeIds.length > 0
      ? await prisma.employeeShift.findMany({
        where: { employeeId: { in: attendanceEmployeeIds } },
        include: { shift: true },
        orderBy: { effectiveFrom: "desc" },
      })
      : [];
    const punchesByEmployeeDay = new Map<string, typeof storedPunches>();
    for (const punch of storedPunches) {
      const identity = identityForPunch(punch);
      const date = getIndiaDateAndTime(punch.punchTime).date;
      if (!affectedDays.has(`${identity}|${date}`)) continue;
      const employeeId = employeeByIdentity.get(identity);
      if (!employeeId) continue;
      const key = `${employeeId}|${date}`;
      const grouped = punchesByEmployeeDay.get(key) || [];
      grouped.push(punch);
      punchesByEmployeeDay.set(key, grouped);
    }

    for (const [key, dayPunches] of punchesByEmployeeDay) {
      const separator = key.lastIndexOf("|");
      const employeeId = key.slice(0, separator);
      const date = key.slice(separator + 1);
      if (dayPunches.length === 0) continue;

      const assignment = getEffectiveEmployeeShift(employeeShifts, employeeId, date);
      const existing = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId, date } },
        select: { isApproved: true, shiftType: true },
      });
      const shift = assignment?.shift || (existing?.shiftType === "Night" ? null : { shiftName: "Day Shift" });
      const timeSlots = resolveDayShiftAttendanceSlots({
        shift,
        machinePunchTimes: dayPunches.map((punch) => getIndiaDateAndTime(punch.punchTime).time),
        attendanceDate: date,
        today: indiaNow.date,
        currentTime: indiaNow.time,
        existingSlots: [],
      });
      if (!timeSlots) {
        attendanceSkippedNonDayShift++;
        continue;
      }

      if (existing?.isApproved) {
        attendanceSkippedApproved++;
        continue;
      }

      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId, date } },
        update: { status: "Present", shiftType: "Day", timeSlots: JSON.stringify(timeSlots) },
        create: { employeeId, date, status: "Present", shiftType: "Day", timeSlots: JSON.stringify(timeSlots) },
      });
      attendanceUpdated++;
    }
  }

  return NextResponse.json({
    received: punches.length,
    inserted: result.count,
    duplicatesOrSkipped: punches.length - result.count,
    invalid,
    attendanceUpdated,
    attendanceSkippedApproved,
    attendanceSkippedNonDayShift,
    deviceUsersMapped,
    unmatchedEmployeeCodes,
  });
}
