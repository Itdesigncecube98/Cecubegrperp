import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const nodes = await prisma.orgChartNode.findMany({
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
            department: true,
          }
        },
        candidates: true
      }
    });
    return NextResponse.json(nodes);
  } catch (error) {
    console.error('Failed to fetch org chart:', error);
    return NextResponse.json({ error: 'Failed to fetch org chart' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { employeeId, parentId, isVacant, positionTitle, department, jobDescription } = body;

    if (!isVacant && !employeeId) {
      return NextResponse.json({ error: 'employeeId is required for occupied positions' }, { status: 400 });
    }
    if (isVacant && !positionTitle) {
      return NextResponse.json({ error: 'positionTitle is required for vacant positions' }, { status: 400 });
    }

    let actualParentId = null;
    if (parentId) {
      // The frontend passes an Employee ID as parentId. We need to find or create its OrgChartNode.
      let parentNode = await prisma.orgChartNode.findUnique({
        where: { employeeId: parentId }
      });
      if (!parentNode) {
        parentNode = await prisma.orgChartNode.create({
          data: {
            employeeId: parentId,
            isVacant: false
          }
        });
      }
      actualParentId = parentNode.id;
    }

    const data = {
      parentId: actualParentId
    };

    if (isVacant) {
      data.isVacant = true;
      data.positionTitle = positionTitle;
      data.department = department;
      data.jobDescription = jobDescription;
    } else {
      data.employeeId = employeeId;
      data.isVacant = false;
    }

    const node = await prisma.orgChartNode.create({
      data,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
            department: true,
          }
        }
      }
    });

    return NextResponse.json(node);
  } catch (error) {
    console.error('Failed to add to org chart:', error);
    return NextResponse.json({ error: 'Failed to add to org chart' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.orgChartNode.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove from org chart:', error);
    return NextResponse.json({ error: 'Failed to remove from org chart' }, { status: 500 });
  }
}

  export async function PUT(request) {
    try {
      const body = await request.json();
      const { id, parentId, employeeId, candidateId, isVacant, positionTitle, department, jobDescription } = body;
  
      if (!id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 });
      }
  
      const dataToUpdate = {};
      if (parentId !== undefined) {
        if (parentId) {
          let parentNode = await prisma.orgChartNode.findUnique({
            where: { employeeId: parentId }
          });
          if (!parentNode) {
            parentNode = await prisma.orgChartNode.create({
              data: { employeeId: parentId, isVacant: false }
            });
          }
          dataToUpdate.parentId = parentNode.id;
        } else {
          dataToUpdate.parentId = null;
        }
      }
  
      if (employeeId !== undefined) {
        // Assigning an employee to a vacant node
        dataToUpdate.employeeId = employeeId;
        dataToUpdate.isVacant = false;
        dataToUpdate.candidates = { set: [] };
        // Optional: clear vacant fields once occupied
        dataToUpdate.positionTitle = null;
        dataToUpdate.department = null;
        dataToUpdate.jobDescription = null;
      } else if (candidateId !== undefined) {
        dataToUpdate.candidates = { connect: { id: candidateId } };
      } else if (isVacant !== undefined) {
        dataToUpdate.isVacant = isVacant;
        if (positionTitle !== undefined) dataToUpdate.positionTitle = positionTitle;
        if (department !== undefined) dataToUpdate.department = department;
        if (jobDescription !== undefined) dataToUpdate.jobDescription = jobDescription;
      }

    const node = await prisma.orgChartNode.update({
      where: { id },
      data: dataToUpdate,
      include: {
        employee: true
      }
    });

    return NextResponse.json(node);
  } catch (error) {
    console.error('Failed to update org chart node:', error);
    return NextResponse.json({ error: 'Failed to update org chart node' }, { status: 500 });
  }
}
