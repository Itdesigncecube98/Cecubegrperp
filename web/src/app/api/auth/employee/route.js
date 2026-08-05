import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    // Check if employee exists
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
          department: employee.department
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
