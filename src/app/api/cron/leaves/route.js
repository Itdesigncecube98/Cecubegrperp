export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return NextResponse.json({
    success: true,
    updatedCount: 0,
    message: 'Fixed monthly leave credits are disabled. Balances are calculated using the April-based CL and EL policy.',
  });
}
