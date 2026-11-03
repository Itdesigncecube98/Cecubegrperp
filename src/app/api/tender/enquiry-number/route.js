export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNextTenderEnquiryNumber, getNextTenderNumber } from '@/lib/tenderEnquiryNumber';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedYear = searchParams.get('year');
    const year = requestedYear === null ? new Date().getFullYear() : Number(requestedYear);
    if (!Number.isInteger(year) || year < 1000 || year > 9999) {
      return NextResponse.json({ error: 'A valid tender year is required.' }, { status: 400 });
    }

    const [enquiryNo, tenderNo] = await Promise.all([
      getNextTenderEnquiryNumber(prisma, year),
      getNextTenderNumber(prisma, year),
    ]);
    return NextResponse.json({ enquiryNo, tenderNo });
  } catch (error) {
    console.error('Error generating tender enquiry number:', error);
    return NextResponse.json({ error: 'Failed to generate tender enquiry number.' }, { status: 500 });
  }
}
