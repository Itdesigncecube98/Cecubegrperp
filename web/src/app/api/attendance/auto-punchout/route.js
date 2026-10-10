export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

const AUTO_OUT_TIME = '19:00';
const TIME_ZONE = 'Asia/Kolkata';

function getIndiaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

// Invoked daily by Vercel Cron at 19:00 Asia/Kolkata (13:30 UTC).
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('Auto punch-out requires the CRON_SECRET environment variable.');
    return NextResponse.json({ error: 'Cron authentication is not configured' }, { status: 500 });
  }

  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const date = getIndiaDate();

    const records = await prisma.attendance.findMany({
      where: { date, isApproved: false },
      select: { id: true, employeeId: true, timeSlots: true, shiftType: true }
    });

    let punchedOut = 0;
    const affected = [];
    let skippedInvalid = 0;

    for (const record of records) {
      let slots = [];
      try {
        slots = JSON.parse(record.timeSlots || '[]');
        if (!Array.isArray(slots)) throw new Error('Time slots must be an array');
      } catch (error) {
        skippedInvalid++;
        console.error(`Skipping invalid time slots for attendance record ${record.id}:`, error);
        continue;
      }

      let changed = false;
      const updatedSlots = slots.map(slot => {
        if (slot?.in && !slot.out && slot.in < AUTO_OUT_TIME) {
          changed = true;
          return { ...slot, out: AUTO_OUT_TIME };
        }
        return slot;
      });

      if (!changed) continue;

      const wasUpdated = await prisma.$transaction(async transaction => {
        const result = await transaction.attendance.updateMany({
          where: {
            id: record.id,
            isApproved: false,
            timeSlots: record.timeSlots,
          },
          data: { timeSlots: JSON.stringify(updatedSlots) }
        });
        if (result.count === 0) return false;

        await transaction.punchRequest.create({
          data: {
            employeeId: record.employeeId,
            type: 'OUT',
            time: AUTO_OUT_TIME,
            date,
            shiftType: record.shiftType || 'Day',
            reason: 'Auto punch-out at 19:00 (end of day)',
            status: 'APPROVED'
          }
        });
        return true;
      });
      if (!wasUpdated) continue;

      punchedOut++;
      affected.push(record.employeeId);
    }

    return NextResponse.json({ success: true, date, time: AUTO_OUT_TIME, punchedOut, affected, skippedInvalid });
  } catch (error) {
    console.error('Auto punch-out error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
