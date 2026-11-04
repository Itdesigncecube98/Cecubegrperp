export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(Array.isArray(announcements) ? announcements : []);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const isHoliday = data.isHoliday === true;
    const isWorkingDay = data.isWorkingDay === true;
    const date = typeof data.date === 'string' && data.date.trim() ? data.date.trim() : null;

    if (isHoliday && isWorkingDay) {
      return NextResponse.json({ error: 'An announcement cannot be both a holiday and a working day.' }, { status: 400 });
    }
    if ((isHoliday || isWorkingDay) && !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      return NextResponse.json({ error: 'A valid date is required for a holiday or working-day announcement.' }, { status: 400 });
    }

    const announcement = await prisma.$transaction(async transaction => {
      const created = await transaction.announcement.create({
        data: {
          subject: data.subject,
          message: data.message,
          isHoliday,
          isWorkingDay,
          date,
        },
      });

      if (isHoliday && date) {
        await transaction.holiday.upsert({
          where: { date },
          update: { name: data.subject },
          create: {
            name: data.subject,
            date,
            type: 'Public',
          },
        });
      }

      return created;
    });

    return NextResponse.json(announcement);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    await prisma.announcement.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
