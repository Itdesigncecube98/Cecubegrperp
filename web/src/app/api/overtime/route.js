import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../../../lib/mailer';

import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const data = await request.json();
    const { employeeIds, date, hours, reason } = data;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: 'No employees selected' }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Assign overtime to all selected employees
    const createdAssignments = [];
    
    for (const empId of employeeIds) {
      const assignment = await prisma.overtimeAssignment.create({
        data: {
          employeeId: empId,
          date,
          hours: hours || null,
          reason: reason || null,
          status: 'ASSIGNED',
        },
        include: {
          employee: true
        }
      });
      createdAssignments.push(assignment);

      // Send email notification to employee
      const targetEmail = assignment.employee.email || assignment.employee.otherEmail;
      if (targetEmail) {
        const subject = `Overtime Assignment Notification - ${date}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="background: #0284c7; padding: 24px 30px; text-align: center;">
              <div style="display: inline-block; background: #ffffff; border-radius: 10px; padding: 10px 20px;">
                <img src="cid:cecubelogo" alt="Cecube Engineering India" style="max-height: 48px; max-width: 200px; display: block;" />
              </div>
            </div>
            <div style="padding: 30px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #0284c7; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Overtime Assignment</h2>
              <div style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                <p style="margin-top: 0;">Dear ${assignment.employee.name},</p>
                <p>You have been assigned to work overtime on <strong>${date}</strong>.</p>
                ${hours ? `<p style="margin: 8px 0;"><strong>Expected Hours:</strong> ${hours}</p>` : ''}
                ${reason ? `<p style="margin: 8px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
                <p style="margin-top: 24px;">Please ensure you are present as required. If you have any concerns, please contact your supervisor immediately.</p>
                <p style="margin-top: 24px; margin-bottom: 0;">Regards,<br/><strong>HR Department</strong><br/>Cecube Engineering India Pvt Ltd</p>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 16px 0;" />
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">This email was sent from the Cecube HR portal. Please do not reply to this email.</p>
            </div>
          </div>
        `;
        
        // Fire and forget email
        sendEmail({ to: targetEmail, subject, html }).catch(err => {
          console.error(`Failed to send overtime email to ${targetEmail}:`, err);
        });
      }
    }

    return NextResponse.json({ success: true, count: createdAssignments.length });
  } catch (error) {
    console.error('Overtime Assignment Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');

    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (date) where.date = date;

    const assignments = await prisma.overtimeAssignment.findMany({
      where,
      include: { employee: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, status } = data; // status can be 'APPROVED' or 'REJECTED'

    const updated = await prisma.overtimeAssignment.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    // If approved, add proportional COFF. Assuming 8 hours = 1 day of COFF.
    if (status === 'APPROVED' && updated.hours) {
      const hours = parseFloat(updated.hours);
      if (!isNaN(hours) && hours > 0) {
        const coffDays = hours / 8; // e.g. 2 hours = 0.25 days

        const balance = await prisma.leaveBalance.findUnique({
          where: { employeeId: updated.employeeId }
        });

        if (balance) {
          await prisma.leaveBalance.update({
            where: { employeeId: updated.employeeId },
            data: { compensatoryLeaves: balance.compensatoryLeaves + coffDays }
          });
        } else {
          await prisma.leaveBalance.create({
            data: {
              employeeId: updated.employeeId,
              compensatoryLeaves: coffDays
            }
          });
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
