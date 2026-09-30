import { NextResponse } from 'next/server';
import { clearAuthSession } from '@/lib/authSession';

export async function POST() {
  return clearAuthSession(NextResponse.json({ success: true }));
}
