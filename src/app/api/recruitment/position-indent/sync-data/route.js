export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [organizations, branches, positions, departments, employees, grades] = await Promise.all([
      prisma.organization.findMany({ select: { name: true } }),
      prisma.branch.findMany({ select: { name: true } }),
      prisma.designation.findMany({ select: { name: true } }), // Fetch from Designation table
      prisma.department.findMany({ select: { name: true } }),
      prisma.employee.findMany({ select: { name: true } }),
      prisma.grade.findMany({ select: { name: true } }),
    ]);

    return NextResponse.json({
      organizations: organizations.map(o => o.name),
      branches: branches.map(b => b.name),
      positions: positions.map(p => p.name),
      departments: departments.map(d => d.name),
      employees: employees.map(e => e.name),
      grades: grades.map(g => g.name),
    });
  } catch (error) {
    console.error('Error fetching sync data:', error);
    return NextResponse.json({ error: 'Failed to fetch sync data' }, { status: 500 });
  }
}
