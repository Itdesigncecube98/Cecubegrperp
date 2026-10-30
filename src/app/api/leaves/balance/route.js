export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getEarnedLeaveEligibilityDate } from '../../../../lib/leaveEntitlements';

const EARNED_LEAVES_PER_YEAR = 18;

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const normalizeLeaveType = (value) => String(value || '').trim().toLowerCase();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (month && year) {
      const targetMonth = parseInt(month, 10);
      const targetYear = parseInt(year, 10);
      if (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12 ||
          !Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 9999) {
        return NextResponse.json({ error: 'A valid month and year are required.' }, { status: 400 });
      }
      const monthPrefix = `${targetYear}-${pad(targetMonth)}`;
      const yearStart = `${targetYear}-01-01`;
      const monthEnd = toKey(new Date(targetYear, targetMonth, 0)); // last day of target month

      const approvedRequests = await prisma.leaveRequest.findMany({
        where: { status: 'APPROVED', ...(employeeId ? { employeeId } : {}) }
      });

      // Present days from Jan 1 to end of target month (needed for the yearly earned pool)
      const presentAttendances = await prisma.attendance.findMany({
        where: {
          date: { gte: yearStart, lte: monthEnd },
          status: 'Present',
          ...(employeeId ? { employeeId } : {})
        }
      });
      const presentSet = new Set(presentAttendances.map(a => `${a.employeeId}_${a.date}`));

      // No `select`, so this works whatever the joining-date field is called
      const allEmployees = employeeId
        ? await prisma.employee.findMany({ where: { id: employeeId } })
        : await prisma.employee.findMany();

      const usageByEmp = {};
      const eligibleFromByEmp = {};
      const earnedDaysByEmp = {};
      const savedBalances = await prisma.leaveBalance.findMany({
        where: employeeId ? { employeeId } : {}
      });
      const compOffByEmp = new Map(savedBalances.map((balance) => [balance.employeeId, balance.compensatoryLeaves]));

      for (const emp of allEmployees) {
        usageByEmp[emp.id] = {
          employeeId: emp.id,
          casualLeaves: 1,
          earnedLeaves: 0,        // remaining earned balance at end of month
          earnedEntitlement: 0,   // 18 once eligible, else 0
          earnedUsed: 0,          // earned days used in the target month
          leaveWithoutPay: 0,
          explicitLwp: 0,
          netDaysLwp: 0,
          compensatoryLeaves: compOffByEmp.get(emp.id) || 0,
          joiningDateMissing: false
        };
        const eligibleFrom = getEarnedLeaveEligibilityDate(emp);
        eligibleFromByEmp[emp.id] = eligibleFrom;
        if (!eligibleFrom) usageByEmp[emp.id].joiningDateMissing = true;
        earnedDaysByEmp[emp.id] = [];
      }

      const addLwp = (u, days, explicit = false) => {
        u.leaveWithoutPay += days;
        u.netDaysLwp += days;
        if (explicit) u.explicitLwp += days;
      };

      for (const req of approvedRequests) {
        const u = usageByEmp[req.employeeId];
        if (!u) continue;

        const end = new Date(req.endDate);
        const dayValue = req.isHalfDay ? 0.5 : 1;
        let curr = new Date(req.startDate);

        while (curr <= end) {
          const dateStr = toKey(curr);
          const inYearSoFar = dateStr >= yearStart && dateStr <= monthEnd;
          const inTargetMonth = dateStr.startsWith(monthPrefix);
          const type = normalizeLeaveType(req.leaveType);

          if (inYearSoFar && !presentSet.has(`${req.employeeId}_${dateStr}`)) {
            if (type.includes('earned') || type === 'paid leave') {
              // Collected now, applied against the yearly pool below
              earnedDaysByEmp[req.employeeId].push({ dateStr, days: dayValue });
            } else if (inTargetMonth) {
              if (type.includes('casual')) {
                u.casualLeaves -= dayValue;
                if (u.casualLeaves < 0) {
                  addLwp(u, Math.abs(u.casualLeaves));
                  u.casualLeaves = 0;
                }
              } else if (type === 'coff' || type.includes('compensatory')) {
                u.compensatoryLeaves -= dayValue;
                if (u.compensatoryLeaves < 0) {
                  addLwp(u, Math.abs(u.compensatoryLeaves));
                  u.compensatoryLeaves = 0;
                }
              } else if (
                type === 'unpaid' ||
                type.includes('leave without pay') ||
                type === 'sick'
              ) {
                addLwp(u, dayValue, true);
              }
            }
          }
          curr.setDate(curr.getDate() + 1);
        }
      }

      // Earned leave: 18/year for employees past the 8-month mark
      for (const emp of allEmployees) {
        const u = usageByEmp[emp.id];
        const eligibleFrom = eligibleFromByEmp[emp.id];
        let pool = EARNED_LEAVES_PER_YEAR;

        const days = earnedDaysByEmp[emp.id].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
        for (const { dateStr, days: d } of days) {
          const inTargetMonth = dateStr.startsWith(monthPrefix);

          if (!eligibleFrom || dateStr < eligibleFrom) {
            if (inTargetMonth) addLwp(u, d); // not yet eligible
            continue;
          }
          const fromPool = Math.min(d, pool);
          pool -= fromPool;
          if (inTargetMonth) {
            u.earnedUsed += fromPool;
            if (d > fromPool) addLwp(u, d - fromPool); // pool exhausted
          }
        }

        const eligibleByMonthEnd = eligibleFrom && eligibleFrom <= monthEnd;
        u.earnedEntitlement = eligibleByMonthEnd ? EARNED_LEAVES_PER_YEAR : 0;
        u.earnedLeaves = eligibleByMonthEnd ? pool : 0;
      }

      const results = Object.values(usageByEmp);
      if (employeeId) {
        return NextResponse.json(
          results[0] || { casualLeaves: 0, leaveWithoutPay: 0, earnedLeaves: 0, compensatoryLeaves: 0 }
        );
      }
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