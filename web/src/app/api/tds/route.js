export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const department = searchParams.get('department');
    const year = searchParams.get('year') || '2026-2027';
    const adminView = searchParams.get('adminView') === 'true';

    let whereClause = {};
    if (year) whereClause.year = year;
    if (employeeId) whereClause.employeeId = employeeId;
    if (department) {
      whereClause.employee = { department: { contains: department, mode: 'insensitive' } };
    }

    if (adminView) {
      // In admin view, we want ALL employees matching department/employeeId filter
      let empWhere = {};
      if (employeeId) {
        empWhere.OR = [
          { empId: { contains: employeeId, mode: 'insensitive' } },
          { id: employeeId }
        ];
      }
      if (department) empWhere.department = { contains: department, mode: 'insensitive' };
      
      const employees = await prisma.employee.findMany({
        where: empWhere,
        select: {
          id: true,
          empId: true,
          name: true,
          department: true,
          position: true,
          tdsFilings: {
            where: { year },
            select: {
              id: true,
              month: true,
              amount: true,
              status: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(employees);
    } else {
      // Employee view
      const filings = await prisma.tdsFiling.findMany({
        where: whereClause,
        include: {
          employee: {
            select: { name: true, department: true, position: true, empId: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json(filings);
    }
  } catch (error) {
    console.error('Error fetching TDS filings:', error);
    return NextResponse.json({ error: 'Failed to fetch TDS filings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    if (!data.employeeId || !data.month || !data.year || data.amount === undefined) {
      return NextResponse.json({ error: 'Employee ID, Month, Year, and Amount are required' }, { status: 400 });
    }

    const newFiling = await prisma.tdsFiling.create({
      data: {
        employeeId: data.employeeId,
        month: data.month,
        year: data.year,
        amount: parseFloat(data.amount),
        fileUrl: data.fileUrl || null,
        status: data.status || 'PENDING',
      },
    });

    return NextResponse.json(newFiling, { status: 201 });
  } catch (error) {
    console.error('Error creating TDS filing:', error);
    return NextResponse.json({ error: 'Failed to create TDS filing' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();

    if (!data.id || data.amount === undefined) {
      return NextResponse.json({ error: 'Filing ID and Amount are required' }, { status: 400 });
    }

    const updatedFiling = await prisma.tdsFiling.update({
      where: { id: data.id },
      data: {
        amount: parseFloat(data.amount),
        status: data.status || 'PENDING',
      },
    });

    return NextResponse.json(updatedFiling, { status: 200 });
  } catch (error) {
    console.error('Error updating TDS filing:', error);
    return NextResponse.json({ error: 'Failed to update TDS filing' }, { status: 500 });
  }
}

