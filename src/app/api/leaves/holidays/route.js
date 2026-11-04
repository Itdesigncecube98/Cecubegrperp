export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const [holidays, holidayAnnouncements] = await Promise.all([
      prisma.holiday.findMany(),
      prisma.announcement.findMany({
        where: { isHoliday: true, date: { not: null } },
        select: { id: true, subject: true, date: true },
      }),
    ]);
    const holidaysByDate = new Map(holidays.map(holiday => [holiday.date, holiday]));
    for (const announcement of holidayAnnouncements) {
      const existing = holidaysByDate.get(announcement.date);
      holidaysByDate.set(announcement.date, {
        ...(existing || {}),
        id: existing?.id ?? `announcement-${announcement.id}`,
        name: announcement.subject,
        date: announcement.date,
        type: existing?.type || 'Public',
      });
    }
    return NextResponse.json([...holidaysByDate.values()].sort((a, b) => a.date.localeCompare(b.date)));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const newHoliday = await prisma.holiday.create({
      data: {
        name: data.name,
        date: data.date,
        type: data.type || 'Public'
      }
    });
    return NextResponse.json(newHoliday);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (id.startsWith('announcement-')) {
      const announcementId = Number(id.slice('announcement-'.length));
      if (!Number.isInteger(announcementId) || announcementId <= 0) {
        return NextResponse.json({ error: 'Valid holiday announcement ID is required.' }, { status: 400 });
      }
      await prisma.announcement.delete({
        where: { id: announcementId },
      });
      return NextResponse.json({ success: true });
    }

    const holidayId = Number(id);
    if (!Number.isInteger(holidayId) || holidayId <= 0) {
      return NextResponse.json({ error: 'Valid holiday ID is required.' }, { status: 400 });
    }
    await prisma.holiday.delete({
      where: { id: holidayId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
