import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    // Bypass DB completely for default employee credentials
    // This allows login on Vercel even if database is not connected
    const EMP_EMAIL = process.env.EMP_EMAIL || 'employee@cecube.com';
    const EMP_PASSWORD = process.env.EMP_PASSWORD || 'password123';

    if (email === EMP_EMAIL && password === EMP_PASSWORD) {
      return NextResponse.json({ 
        success: true, 
        employee: {
          id: 1,
          empId: 'EMP-001',
          name: 'Demo Employee',
          email: EMP_EMAIL,
          department: 'Engineering'
        }
      });
    }

    // Check if employee exists in DB
    const employee = await prisma.employee.findUnique({ where: { email } });
    
    if (!employee) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    if (employee.password === password) {
      return NextResponse.json({ 
        success: true, 
        employee: {
          id: employee.id,
          empId: employee.empId,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          role: employee.role
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
