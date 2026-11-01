import { prisma } from './prisma';

function indiaMidnight(date) {
  return new Date(`${date}T00:00:00+05:30`);
}

function indiaDateTime(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function normalizedKey(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function getBiometricPunchesByEmployeeDay(employees, startDate, endDate) {
  const result = new Map();
  if (!employees.length) return result;

  const endExclusive = indiaMidnight(endDate);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const punches = await prisma.attendancePunch.findMany({
    where: {
      punchTime: {
        gte: indiaMidnight(startDate),
        lt: endExclusive,
      },
    },
    orderBy: { punchTime: 'asc' },
    select: {
      deviceId: true,
      userId: true,
      employeeCode: true,
      employeeName: true,
      punchTime: true,
      direction: true,
    },
  });
  if (!punches.length) return result;

  const employeeByCode = new Map();
  const employeeByName = new Map();
  const addCode = (code, employeeId) => {
    const key = normalizedKey(code);
    if (!key) return;
    const existing = employeeByCode.get(key);
    employeeByCode.set(key, existing && existing !== employeeId ? null : employeeId);
  };

  for (const employee of employees) {
    const empCode = normalizedKey(employee.empId);
    if (empCode) {
      addCode(empCode, employee.id);
      const ceipl = empCode.match(/^ceipl0*(\d+)$/);
      if (ceipl) addCode(ceipl[1], employee.id);
      const ftc = empCode.match(/^ftc0*(\d+)$/);
      if (ftc) addCode(ftc[1], employee.id);
      const cgepl = empCode.match(/^cgepl(\d+)$/);
      if (cgepl) addCode(`990${cgepl[1].padStart(3, '0')}`, employee.id);
    }

    const name = normalizedKey(employee.name).replace(/\s+/g, ' ');
    if (name) {
      const matches = employeeByName.get(name) || [];
      matches.push(employee.id);
      employeeByName.set(name, matches);
    }
  }

  const deviceIds = [...new Set(punches.map(punch => punch.deviceId))];
  const mappings = await prisma.attendanceDeviceEmployeeMap.findMany({
    where: { deviceId: { in: deviceIds } },
    select: { deviceId: true, userId: true, employeeId: true },
  });
  const employeeByDeviceUser = new Map(
    mappings.map(mapping => [`${mapping.deviceId}|${mapping.userId}`, mapping.employeeId]),
  );
  const allowedEmployeeIds = new Set(employees.map(employee => employee.id));

  for (const punch of punches) {
    const mappedEmployeeId = employeeByDeviceUser.get(`${punch.deviceId}|${punch.userId}`);
    const codeEmployeeId =
      employeeByCode.get(normalizedKey(punch.employeeCode)) ||
      employeeByCode.get(normalizedKey(punch.userId));
    const name = normalizedKey(punch.employeeName).replace(/\s+/g, ' ');
    const nameMatches = employeeByName.get(name) || [];
    const employeeId = mappedEmployeeId ||
      codeEmployeeId ||
      (nameMatches.length === 1 ? nameMatches[0] : null);

    if (!employeeId || !allowedEmployeeIds.has(employeeId)) continue;

    const { date, time } = indiaDateTime(punch.punchTime);
    const key = `${employeeId}|${date}`;
    const dayPunches = result.get(key) || new Map();
    dayPunches.set(`${time}|${punch.direction || ''}`, {
      time,
      direction: punch.direction || null,
    });
    result.set(key, dayPunches);
  }

  for (const [key, dayPunches] of result) {
    result.set(key, [...dayPunches.values()].sort((a, b) => a.time.localeCompare(b.time)));
  }
  return result;
}
