import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request) {
  const { email, password } = await request.json();

  // Hardcoded super admin bypass (always works regardless of DB)
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cecube.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return NextResponse.json({ success: true, email: ADMIN_EMAIL, name: 'Super Admin' });
  }

  try {
    // Look up any admin added via the Admin panel
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (admin && admin.password === password) {
      return NextResponse.json({
        success: true,
        email: admin.email,
        name: admin.name,
        adminId: admin.adminId,
        department: admin.department
      });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Service unavailable. Please try again.' }, { status: 503 });
  }
}
