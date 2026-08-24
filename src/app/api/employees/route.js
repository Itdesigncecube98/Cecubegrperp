import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const checkSupervisor = searchParams.get('checkSupervisor');

    // Lightweight: is this employee a supervisor of anyone?
    if (checkSupervisor) {
      const count = await prisma.employee.count({
        where: { supervisorId: checkSupervisor }
      });
      return NextResponse.json({ isSupervisor: count > 0 });
    }

    const whereClause = role ? { role } : {};
    const employees = await prisma.employee.findMany({ where: whereClause });
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const newEmployee = await prisma.employee.create({
      data: {
        empId: data.empId || null,
        name: data.name,
        email: data.email,
        password: data.password,
        department: data.department,
        supervisorId: data.supervisorId || null,
        role: data.role || 'EMPLOYEE',
        leaveBalance: {
          create: {
            casualLeaves: 1,
            leaveWithoutPay: 0,
            earnedLeaves: 2
          }
        }
      }
    });
    return NextResponse.json(newEmployee);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    // Only set role if it's explicitly provided
    if (updateData.role === undefined) {
      delete updateData.role;
    }
    if (updateData.supervisorId === '') {
      updateData.supervisorId = null;
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(updatedEmployee);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await prisma.employee.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
