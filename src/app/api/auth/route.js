export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { attachAuthSession } from '@/lib/authSession';
import { writeSessionAudit } from '@/lib/serverAudit';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPassword = (password || '').trim();

    const adminCandidates = [
      { email: process.env.ADMIN_EMAIL || 'admin@cecube.com', password: process.env.ADMIN_PASSWORD || 'password123' },
      { email: 'admin@cecubeindia.com', password: 'password123' },
      { email: 'hr@cecubeindia.com', password: 'hr@123Cecube' }
    ];

    const directMatch = adminCandidates.find(candidate =>
      candidate.email.toLowerCase() === normalizedEmail && candidate.password === normalizedPassword
    );

    if (directMatch) {
      await writeSessionAudit(prisma, request, { type: 'admin', id: directMatch.email }, { module: 'AUTH', subModule: 'Admin Portal', action: 'LOGIN' });
      return attachAuthSession(NextResponse.json({ success: true, email: directMatch.email, name: 'Super Admin' }), { type: 'admin', id: directMatch.email });
    }

    const admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: 'insensitive' } },
          { adminId: { equals: normalizedEmail, mode: 'insensitive' } }
        ]
      }
    });

    if (admin && admin.password === normalizedPassword) {
      await writeSessionAudit(prisma, request, { type: 'admin', id: admin.id }, { module: 'AUTH', subModule: 'Admin Portal', action: 'LOGIN' });
      return attachAuthSession(NextResponse.json({
        success: true,
        email: admin.email,
        name: admin.name,
        adminId: admin.adminId,
        department: admin.department
      }), { type: 'admin', id: admin.id });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Service unavailable. Please try again.' }, { status: 503 });
  }
}
