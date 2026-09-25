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

    // Create the announcement
    const announcement = await prisma.announcement.create({
      data: {
        subject: data.subject,
        message: data.message,
        isHoliday: data.isHoliday || false,
        isWorkingDay: data.isWorkingDay || false,
        date: data.date || null
      }
    });

    // If it's a holiday, also create a holiday record
    if (data.isHoliday && data.date) {
      // Upsert so we don't crash if holiday already exists on this date
      await prisma.holiday.upsert({
        where: { date: data.date },
        update: { name: data.subject },
        create: {
          name: data.subject,
          date: data.date,
          type: 'Public'
        }
      });
    }

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
