import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const live = await prisma.punchLiveLocation.findMany();
    
    let history = [];
    try {
      history = await prisma.$queryRaw`SELECT * FROM "PunchLocationHistory" ORDER BY timestamp DESC LIMIT 10`;
    } catch (e) {
      history = e.message;
    }
    
    return NextResponse.json({ live, history });
  } catch (error) {
    return NextResponse.json({ error: error.message });
  }
}
