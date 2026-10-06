import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

/**
 * GET /api/doc-workflow?hodId=<employeeId>
 *   Returns all DocWorkflowMappings where this employee is the HOD.
 *   Used by DocApprovalsPanel to know which employees this HOD covers.
 *
 * GET /api/doc-workflow?employeeId=<employeeId>
 *   Returns the DocWorkflowMapping for this specific employee.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const hodId = searchParams.get('hodId');
    const employeeId = searchParams.get('employeeId');

    if (hodId) {
      // All employees whose HOD is this person
      const mappings = await prisma.docWorkflowMapping.findMany({
        where: { hodId },
        select: { employeeId: true, hodId: true, hrId: true, accountsId: true },
      });
      return NextResponse.json(mappings);
    }

    if (employeeId) {
      // Single mapping for an employee
      const mapping = await prisma.docWorkflowMapping.findUnique({
        where: { employeeId },
        select: { employeeId: true, hodId: true, hrId: true, accountsId: true },
      });
      return NextResponse.json(mapping || {});
    }

    return NextResponse.json({ error: 'Provide hodId or employeeId param' }, { status: 400 });
  } catch (err) {
    console.error('[doc-workflow GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/doc-workflow
 * Body: { employeeId, hodId, hrId, accountsId }
 * Creates or updates the mapping for an employee.
 */
export async function POST(req) {
  try {
    const { employeeId, hodId, hrId, accountsId } = await req.json();
    if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 });

    const mapping = await prisma.docWorkflowMapping.upsert({
      where: { employeeId },
      update: { hodId: hodId || null, hrId: hrId || null, accountsId: accountsId || null },
      create: { employeeId, hodId: hodId || null, hrId: hrId || null, accountsId: accountsId || null },
    });

    return NextResponse.json(mapping);
  } catch (err) {
    console.error('[doc-workflow POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
