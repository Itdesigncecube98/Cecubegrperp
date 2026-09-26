import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/contracting/enquiry — list all enquiries
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const enquiry = await prisma.contractingEnquiry.findUnique({
        where: { id },
        include: { tasks: true, contractors: true, quotations: { include: { items: true } } }
      });
      if (!enquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(enquiry);
    }

    const enquiries = await prisma.contractingEnquiry.findMany({
      orderBy: { createdAt: 'desc' },
      include: { tasks: true, contractors: true, quotations: true }
    });
    return NextResponse.json(enquiries);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/contracting/enquiry — create enquiry
export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId, projectName, enquiryDate, dueDate, expiryDate, paymentTerms, deliveryTerms, specialCond, tasks, contractors } = body;

    // Auto-generate enquiry number
    const count = await prisma.contractingEnquiry.count();
    const enquiryNo = `CE-ENQ-${String(count + 1).padStart(4, '0')}`;

    const enquiry = await prisma.contractingEnquiry.create({
      data: {
        enquiryNo,
        projectId,
        projectName: projectName || '',
        enquiryDate: enquiryDate ? new Date(enquiryDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        paymentTerms: paymentTerms || null,
        deliveryTerms: deliveryTerms || null,
        specialCond: specialCond || null,
        tasks: {
          create: (tasks || []).map(t => ({
            taskName: t.taskName,
            unit: t.unit || null,
            qty: parseFloat(t.qty) || 1,
            description: t.description || null,
          }))
        },
        contractors: {
          create: (contractors || []).map(c => ({
            contractorId: c.id,
            contractorName: c.companyName,
          }))
        }
      },
      include: { tasks: true, contractors: true }
    });

    return NextResponse.json(enquiry);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/contracting/enquiry
export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await prisma.contractingEnquiry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
