export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: decodedId },
          { empId: decodedId },
          { name: decodedId }
        ]
      },
      select: { id: true }
    });

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const revisions = await prisma.salaryRevision.findMany({
      where: { employeeId: employee.id },
      include: {
        components: {
          include: {
            salaryHead: {
              include: { headType: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(revisions);
  } catch (error) {
    console.error('Failed to fetch salary revisions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const body = await request.json();
    const { effectiveFrom, remark, components } = body;

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: decodedId },
          { empId: decodedId },
          { name: decodedId }
        ]
      },
      select: { id: true }
    });

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const newRevision = await prisma.salaryRevision.create({
      data: {
        employeeId: employee.id,
        effectiveFrom,
        remark: remark || null,
        components: {
          create: components.map(c => ({
            salaryHeadId: c.salaryHeadId,
            amount: parseFloat(c.amount) || 0,
            rule: c.rule || '(None)'
          }))
        }
      },
      include: {
        components: {
          include: {
            salaryHead: {
              include: { headType: true }
            }
          }
        }
      }
    });

    // Also update backward-compatible fields on the Employee table
    let basicSalary = 0, hra = 0, pfEmployee = 0, pfEmployer = 0, specialAllowance = 0;
    
    newRevision.components.forEach(c => {
      const headName = c.salaryHead.description.trim().toLowerCase();
      if (headName === 'basic' || headName === 'basic salary') basicSalary = c.amount;
      else if (headName === 'hra' || headName === 'house rent allowance') hra = c.amount;
      else if (headName === 'employee pf' || headName === 'pf employee' || headName === 'provident fund') pfEmployee = c.amount;
      else if (headName === 'employer pf' || headName === 'pf employer') pfEmployer = c.amount;
      else if (headName === 'special allowance') specialAllowance = c.amount;
    });

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        basicSalary: String(basicSalary),
        hra: String(hra),
        pfEmployee: String(pfEmployee),
        pfEmployer: String(pfEmployer),
        specialAllowance: String(specialAllowance)
      }
    });

    return NextResponse.json(newRevision);
  } catch (error) {
    console.error('Failed to create salary revision:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const { revisionId, effectiveFrom, remark, components } = body;

    if (!revisionId) return NextResponse.json({ error: 'revisionId is required' }, { status: 400 });

    // Delete old components and replace with new ones
    await prisma.salaryComponent.deleteMany({ where: { revisionId } });

    const updated = await prisma.salaryRevision.update({
      where: { id: revisionId },
      data: {
        effectiveFrom,
        remark: remark || null,
        components: {
          create: components.map(c => ({
            salaryHeadId: c.salaryHeadId,
            amount: parseFloat(c.amount) || 0,
            rule: c.rule || '(None)'
          }))
        }
      },
      include: {
        components: {
          include: {
            salaryHead: { include: { headType: true } }
          }
        }
      }
    });

    // Sync backward-compatible fields
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const employee = await prisma.employee.findFirst({
      where: { OR: [{ id: decodedId }, { empId: decodedId }, { name: decodedId }] },
      select: { id: true }
    });

    if (employee) {
      let basicSalary = 0, hra = 0, pfEmployee = 0, pfEmployer = 0, specialAllowance = 0;
      updated.components.forEach(c => {
        const n = c.salaryHead.description.trim().toLowerCase();
        if (n === 'basic' || n === 'basic salary') basicSalary = c.amount;
        else if (n === 'hra' || n === 'house rent allowance') hra = c.amount;
        else if (n === 'employee pf' || n === 'pf employee' || n === 'provident fund') pfEmployee = c.amount;
        else if (n === 'employer pf' || n === 'pf employer') pfEmployer = c.amount;
        else if (n === 'special allowance') specialAllowance = c.amount;
      });
      await prisma.employee.update({
        where: { id: employee.id },
        data: { basicSalary: String(basicSalary), hra: String(hra), pfEmployee: String(pfEmployee), pfEmployer: String(pfEmployer), specialAllowance: String(specialAllowance) }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update salary revision:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const revisionId = searchParams.get('revisionId');
    if (!revisionId) return NextResponse.json({ error: 'revisionId is required' }, { status: 400 });
    await prisma.salaryRevision.delete({ where: { id: revisionId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete salary revision:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
