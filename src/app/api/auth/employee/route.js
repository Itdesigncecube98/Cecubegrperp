export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { attachAuthSession } from '@/lib/authSession';
import { writeSessionAudit } from '@/lib/serverAudit';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Normalize so leading/trailing spaces and email casing never break login.
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPassword = (password || '').trim();
    
    // Extract IP address from request headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Bypass DB completely for default employee credentials
    // This allows login on Vercel even if database is not connected
    const EMP_EMAIL = process.env.EMP_EMAIL || 'employee@cecube.com';
    const EMP_PASSWORD = process.env.EMP_PASSWORD || 'password123';

    if (normalizedEmail === EMP_EMAIL.toLowerCase() && normalizedPassword === EMP_PASSWORD) {
      await writeSessionAudit(prisma, request, { type: 'employee', id: '1' }, { module: 'AUTH', subModule: 'Employee Portal', action: 'LOGIN' });
      return attachAuthSession(NextResponse.json({
        success: true, 
        employee: {
          id: 1,
          empId: 'EMP-001',
          name: 'Demo Employee',
          email: EMP_EMAIL,
          department: 'Engineering'
        }
      }), { type: 'employee', id: '1' });
    }

    // Check if employee exists in DB (email match is case-insensitive)
    const employee = await prisma.employee.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
    });
    
    if (!employee) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    if ((employee.password || '').trim() === normalizedPassword) {

      // Log successful login
      await writeSessionAudit(prisma, request, { type: 'employee', id: employee.id }, { module: 'AUTH', subModule: 'Employee Portal', action: 'LOGIN' });

      return attachAuthSession(NextResponse.json({
        success: true, 
        employee: {
          id: employee.id,
          empId: employee.empId,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          role: employee.role,
          password: employee.password,
          supervisorId: employee.supervisorId
        }
      }), { type: 'employee', id: employee.id });
    } else {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
