import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch team members for a project
export async function GET(request, { params }) {
  try {
    const { id } = params;

    // TODO: Query from ProjectTeam table when schema is ready
    // For now, return empty array
    return NextResponse.json([]);

  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Assign team member to project
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const { employeeId, role, permission, startDate, endDate } = body;

    // TODO: Create ProjectTeam entry when schema is ready
    // For now, return mock data with employee info
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        empId: true,
        name: true,
        email: true,
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const teamMember = {
      id: `team-${Date.now()}`,
      projectId: id,
      employeeId,
      role,
      permission,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || null,
      employee: {
        firstName: employee.name.split(' ')[0] || employee.name,
        lastName: employee.name.split(' ').slice(1).join(' ') || '',
        employeeId: employee.empId || employee.id,
        email: employee.email
      }
    };

    console.log('Team member assigned:', teamMember);

    return NextResponse.json(teamMember);

  } catch (error) {
    console.error('Error assigning team member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove team member from project
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    // TODO: Delete from ProjectTeam when schema is ready
    console.log('Removing team member:', memberId, 'from project:', id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
