export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    // Vercel Cron sends an Authorization header with your CRON_SECRET (if configured in Vercel)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get all employees
    const employees = await prisma.employee.findMany();
    let updatedCount = 0;

    // Loop through all employees and assign +1 CL and +1.5 EL
    for (const emp of employees) {
      const currentBalance = await prisma.leaveBalance.findUnique({
        where: { employeeId: emp.id }
      });

      if (currentBalance) {
        // Refreshes every month, no carry forward
        const newCL = 1;
        const newEL = 2;

        await prisma.leaveBalance.update({
          where: { employeeId: emp.id },
          data: {
            casualLeaves: newCL,
            earnedLeaves: newEL
          }
        });
      } else {
        await prisma.leaveBalance.create({
          data: {
            employeeId: emp.id,
            casualLeaves: 1,
            leaveWithoutPay: 0,
            earnedLeaves: 2
          }
        });
      }
      updatedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Monthly leaves accrued successfully for ${updatedCount} employees.` 
    });
  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
