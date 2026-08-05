import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    // Bypass DB completely for default admin credentials
    // This allows login on Vercel even if database is not connected
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cecube.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true, email: ADMIN_EMAIL, name: 'Super Admin' });
    }
    
    // Check if admin exists in DB for other accounts
    let admin = await prisma.admin.findUnique({ where: { email } });
    
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    if (admin.password === password) {
      return NextResponse.json({ success: true, email: admin.email, name: admin.name });
    } else {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
