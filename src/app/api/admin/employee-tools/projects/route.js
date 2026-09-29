import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = readAuthSession(request);
  if (!session || session.type !== 'admin') {
    return NextResponse.json({ error: 'Admin sign-in is required to assign employee project access.' }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to load employee access projects:', error);
    return NextResponse.json({ error: 'Failed to load projects.' }, { status: 500 });
  }
}
