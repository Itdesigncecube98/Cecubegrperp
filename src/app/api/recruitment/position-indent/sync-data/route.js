export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { isHrEmployee } from '@/lib/positionIndentApproval';

export async function GET(request) {
  try {
    if (!readAuthSession(request)) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const raisedByEmployeeId = searchParams.get('raisedByEmployeeId');
    const [organizations, branches, positions, departments, employees, grades] = await Promise.all([
      prisma.organization.findMany({ select: { name: true } }),
      prisma.branch.findMany({ select: { name: true } }),
      prisma.designation.findMany({ select: { name: true } }), // Fetch from Designation table
      prisma.department.findMany({ select: { name: true } }),
      prisma.employee.findMany({
        select: { id: true, name: true, designation: true, department: true, role: true },
        orderBy: { name: 'asc' },
      }),
      prisma.grade.findMany({ select: { name: true } }),
    ]);

    const hrEmployees = employees.filter(isHrEmployee);
    const approverMap = new Map(hrEmployees.map(employee => [employee.id, employee]));

    if (raisedByEmployeeId) {
      const nodes = await prisma.orgChartNode.findMany({
        select: { id: true, employeeId: true, parentId: true },
      });
      const nodesById = new Map(nodes.map(node => [node.id, node]));
      let node = nodes.find(item => item.employeeId === raisedByEmployeeId);
      const visited = new Set();
      while (node?.parentId && !visited.has(node.parentId)) {
        visited.add(node.parentId);
        node = nodesById.get(node.parentId);
        if (node?.employeeId) {
          const senior = employees.find(employee => employee.id === node.employeeId);
          if (senior) approverMap.set(senior.id, senior);
        }
      }
    }

    return NextResponse.json({
      organizations: organizations.map(o => o.name),
      branches: branches.map(b => b.name),
      positions: positions.map(p => p.name),
      departments: departments.map(d => d.name),
      employees,
      grades: grades.map(g => g.name),
      approvers: [...approverMap.values()],
    });
  } catch (error) {
    console.error('Error fetching sync data:', error);
    return NextResponse.json({ error: 'Failed to fetch sync data' }, { status: 500 });
  }
}
