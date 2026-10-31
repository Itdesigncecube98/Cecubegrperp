export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { isHrEmployee } from '@/lib/positionIndentApproval';

const normalizeIds = value => Array.isArray(value)
  ? [...new Set(value.filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()))]
  : [];

async function getEligibleApproverIds(raisedByEmployeeId) {
  const employees = await prisma.employee.findMany({
    select: { id: true, role: true, department: true, designation: true },
  });
  const eligible = new Set(
    employees
      .filter(isHrEmployee)
      .map(employee => employee.id)
  );
  if (!raisedByEmployeeId) return eligible;

  const nodes = await prisma.orgChartNode.findMany({
    select: { id: true, employeeId: true, parentId: true },
  });
  const nodesById = new Map(nodes.map(node => [node.id, node]));
  let node = nodes.find(item => item.employeeId === raisedByEmployeeId);
  const visited = new Set();
  while (node?.parentId && !visited.has(node.parentId)) {
    visited.add(node.parentId);
    node = nodesById.get(node.parentId);
    if (node?.employeeId) eligible.add(node.employeeId);
  }
  return eligible;
}

async function validateAssignments({ raisedByEmployeeId, approverIds, handlerIds }) {
  const eligibleApproverIds = await getEligibleApproverIds(raisedByEmployeeId);
  if (approverIds.length === 0 || approverIds.some(id => !eligibleApproverIds.has(id))) {
    return 'Select at least one approver from HR or the requester’s senior org-chart chain.';
  }
  const handlerCount = await prisma.employee.count({ where: { id: { in: handlerIds } } });
  if (handlerCount !== handlerIds.length) return 'One or more selected handlers are invalid.';
  return null;
}

const includeAssignments = {
  approvals: { include: { employee: { select: { id: true, name: true, department: true, designation: true } } } },
  handlerAssignments: { include: { employee: { select: { id: true, name: true, department: true, designation: true } } } },
};

function presentIndent(indent) {
  return {
    ...indent,
    approvedBy: indent.approvals.length
      ? indent.approvals.map(approval => approval.employee.name).join(', ')
      : indent.approvedBy,
    handledBy: [
      ...(indent.handledByHr ? ['HR'] : []),
      ...indent.handlerAssignments.map(assignment => assignment.employee.name),
    ].join(', ') || indent.handledBy,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = readAuthSession(request);
    const company = searchParams.get('company');
    const branch = searchParams.get('branch');
    const position = searchParams.get('position');
    const status = searchParams.get('status');
    const raiseBy = searchParams.get('raiseBy');
    const approverId = searchParams.get('approverId');
    if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    if (approverId) {
      if (session?.type !== 'employee' || session.id !== approverId) {
        return NextResponse.json({ error: 'Employee access required.' }, { status: 403 });
      }
    } else if (session.type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }
    // Add additional filters if needed

    const where = {};
    if (company && company !== 'All' && company !== 'Select All' && company !== '10 all selected!') where.company = company;
    if (branch && branch !== 'All' && branch !== 'Select All' && branch !== '5 all selected!') where.branch = branch;
    if (position && position !== 'All' && position !== 'Select') where.positionName = { contains: position, mode: 'insensitive' };
    if (status && status !== 'All') where.status = status;
    if (approverId) {
      where.OR = [
        { raisedByEmployeeId: approverId },
        { approvals: { some: { employeeId: approverId } } },
      ];
      if (raiseBy && raiseBy !== 'Select') where.OR.push({ raisedBy });
    } else if (raiseBy && raiseBy !== 'Select') {
      where.raisedBy = raiseBy;
    }

    const indents = await prisma.positionIndent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: includeAssignments,
    });

    return NextResponse.json(indents.map(presentIndent));
  } catch (error) {
    console.error('Error fetching position indents:', error);
    return NextResponse.json({ error: 'Failed to fetch position indents' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const session = readAuthSession(request);
    const raisedByEmployeeId = typeof data.raisedByEmployeeId === 'string' ? data.raisedByEmployeeId : null;
    const approverIds = normalizeIds(data.approverIds);
    const handlerIds = normalizeIds(data.handlerIds);

    if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    if (!data.positionName || !data.department || !data.raisedBy) {
      return NextResponse.json({ error: 'Position, Department, and Raised By are required' }, { status: 400 });
    }
    if (session.type === 'employee' && session.id !== raisedByEmployeeId) {
      return NextResponse.json({ error: 'Employees can only raise requirements for themselves.' }, { status: 403 });
    }
    if (raisedByEmployeeId && !(await prisma.employee.findUnique({ where: { id: raisedByEmployeeId }, select: { id: true } }))) {
      return NextResponse.json({ error: 'The selected requester is invalid.' }, { status: 400 });
    }
    if (approverIds.length || handlerIds.length || data.handledByHr) {
      if (session.type !== 'admin') {
        return NextResponse.json({ error: 'Admin access is required to assign approvers or handlers.' }, { status: 403 });
      }
    }
    if (approverIds.length || handlerIds.length || data.handledByHr) {
      const assignmentError = await validateAssignments({ raisedByEmployeeId, approverIds, handlerIds });
      if (assignmentError) return NextResponse.json({ error: assignmentError }, { status: 400 });
    }

    const newIndent = await prisma.$transaction(async transaction => {
      const created = await transaction.positionIndent.create({
        data: {
        positionName: data.positionName,
        department: data.department,
        raisedBy: data.raisedBy,
        raisedByEmployeeId,
        raisedDate: data.raisedDate || new Date().toISOString().split('T')[0],
        empType: data.empType || 'Full-time',
        indentType: data.indentType || 'New Requirement',
        replacementFor: data.indentType === 'Replacement' && data.replacementFor !== 'Select' ? data.replacementFor : null,
        reqFromDate: data.reqFromDate || null,
        status: 'pending',
        company: data.company || null,
        branch: data.branch || null,
        handledByHr: Boolean(data.handledByHr),
        approvals: { create: approverIds.map(employeeId => ({ employeeId })) },
        handlerAssignments: { create: handlerIds.map(employeeId => ({ employeeId })) },
        },
        include: includeAssignments,
      });
      return created;
    });

    return NextResponse.json(presentIndent(newIndent), { status: 201 });
  } catch (error) {
    console.error('Error creating position indent:', error);
    return NextResponse.json({ error: 'Failed to create position indent' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const session = readAuthSession(request);
    if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

    if (updateData.approvalAction !== undefined) {
      const approverId = updateData.approverId;
      const action = String(updateData.approvalAction).toLowerCase();
      if (session?.type !== 'employee' || session.id !== approverId) {
        return NextResponse.json({ error: 'Employee access required.' }, { status: 403 });
      }
      if (!approverId || !['approved', 'rejected'].includes(action)) {
        return NextResponse.json({ error: 'A valid approver and approval decision are required.' }, { status: 400 });
      }
      const result = await prisma.$transaction(async transaction => {
        const approval = await transaction.positionIndentApproval.findUnique({
          where: { positionIndentId_employeeId: { positionIndentId: id, employeeId: approverId } },
          include: { positionIndent: true },
        });
        if (!approval) return { kind: 'not-assigned' };
        if (['approved', 'rejected'].includes(String(approval.positionIndent.status).toLowerCase())) {
          return { kind: 'closed' };
        }
        if (approval.status !== 'pending') return { kind: 'already-decided' };

        await transaction.positionIndentApproval.update({
          where: { id: approval.id },
          data: { status: action, actedAt: new Date() },
        });
        const approvals = await transaction.positionIndentApproval.findMany({
          where: { positionIndentId: id },
          select: { status: true },
        });
        const status = approvals.some(item => item.status === 'rejected')
          ? 'rejected'
          : approvals.every(item => item.status === 'approved')
            ? 'approved'
            : approvals.some(item => item.status === 'approved') ? 'in progress' : 'pending';
        const indent = await transaction.positionIndent.update({
          where: { id },
          data: { status },
          include: includeAssignments,
        });
        return { kind: 'updated', indent };
      });
      if (result.kind === 'not-assigned') return NextResponse.json({ error: 'You are not assigned to approve this requirement.' }, { status: 403 });
      if (result.kind === 'closed') return NextResponse.json({ error: 'This requirement is already closed.' }, { status: 409 });
      if (result.kind === 'already-decided') return NextResponse.json({ error: 'Your approval decision has already been recorded.' }, { status: 409 });
      return NextResponse.json(presentIndent(result.indent));
    }

    let updateFields;
    if (updateData.status !== undefined) {
      return NextResponse.json({ error: 'Requirement status is controlled by its assigned approvers.' }, { status: 400 });
    } else {
      updateFields = {
        positionName: updateData.positionName,
        department: updateData.department,
        raisedBy: updateData.raisedBy,
        raisedDate: updateData.raisedDate,
        empType: updateData.empType,
        indentType: updateData.indentType,
        replacementFor: updateData.indentType === 'Replacement' && updateData.replacementFor !== 'Select' ? updateData.replacementFor : null,
        reqFromDate: updateData.reqFromDate,
      };
      if (updateData.raisedByEmployeeId !== undefined) updateFields.raisedByEmployeeId = updateData.raisedByEmployeeId || null;
    }

    if (session.type === 'employee') {
      const [employee, currentIndent] = await Promise.all([
        prisma.employee.findUnique({ where: { id: session.id }, select: { id: true, name: true } }),
        prisma.positionIndent.findUnique({ where: { id }, select: { raisedBy: true, raisedByEmployeeId: true } }),
      ]);
      const isOwner = employee && currentIndent && (
        currentIndent.raisedByEmployeeId
          ? currentIndent.raisedByEmployeeId === session.id
          : currentIndent.raisedBy === employee.name
      );
      if (!isOwner) return NextResponse.json({ error: 'You can only edit requirements you raised.' }, { status: 403 });
      updateFields.raisedBy = employee.name;
      updateFields.raisedByEmployeeId = employee.id;
    }

    const updatesAssignments = updateData.approverIds !== undefined ||
      updateData.handlerIds !== undefined || updateData.handledByHr !== undefined;
    if (updatesAssignments && session.type !== 'admin') {
      return NextResponse.json({ error: 'Admin access is required to assign approvers or handlers.' }, { status: 403 });
    }
    const approverIds = updateData.approverIds === undefined ? null : normalizeIds(updateData.approverIds);
    const handlerIds = updateData.handlerIds === undefined ? null : normalizeIds(updateData.handlerIds);
    if (updatesAssignments) {
      const currentIndent = await prisma.positionIndent.findUnique({ where: { id } });
      if (!currentIndent) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
      const assignmentError = await validateAssignments({
        raisedByEmployeeId: updateFields.raisedByEmployeeId ?? currentIndent.raisedByEmployeeId,
        approverIds: approverIds ?? (await prisma.positionIndentApproval.findMany({
          where: { positionIndentId: id }, select: { employeeId: true },
        })).map(item => item.employeeId),
        handlerIds: handlerIds ?? (await prisma.positionIndentHandler.findMany({
          where: { positionIndentId: id }, select: { employeeId: true },
        })).map(item => item.employeeId),
      });
      if (assignmentError) return NextResponse.json({ error: assignmentError }, { status: 400 });
    }

    const outcome = await prisma.$transaction(async transaction => {
      const current = await transaction.positionIndent.findUnique({ where: { id } });
      if (!current) return { kind: 'not-found' };
      if (String(current.status).trim().toLowerCase() === 'approved') return { kind: 'approved' };

      if (updatesAssignments && updateData.handledByHr !== undefined) {
        updateFields.handledByHr = Boolean(updateData.handledByHr);
      }
      if (approverIds !== null) updateFields.status = 'pending';

      const result = await transaction.positionIndent.updateMany({
        where: { id, status: current.status },
        data: updateFields,
      });
      if (result.count !== 1) {
        const latest = await transaction.positionIndent.findUnique({ where: { id } });
        return {
          kind: latest && String(latest.status).trim().toLowerCase() === 'approved' ? 'approved' : 'conflict',
        };
      }
      if (approverIds !== null) {
        await transaction.positionIndentApproval.deleteMany({ where: { positionIndentId: id } });
        await transaction.positionIndentApproval.createMany({
          data: approverIds.map(employeeId => ({ positionIndentId: id, employeeId })),
        });
      }
      if (handlerIds !== null) {
        await transaction.positionIndentHandler.deleteMany({ where: { positionIndentId: id } });
        await transaction.positionIndentHandler.createMany({
          data: handlerIds.map(employeeId => ({ positionIndentId: id, employeeId })),
        });
      }

      return {
        kind: 'updated',
        indent: await transaction.positionIndent.findUnique({ where: { id }, include: includeAssignments }),
      };
    });

    if (outcome.kind === 'not-found') return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    if (outcome.kind === 'approved') return NextResponse.json({ error: 'Approved requirements cannot be changed' }, { status: 409 });
    if (outcome.kind === 'conflict') return NextResponse.json({ error: 'Requirement changed while saving. Refresh and try again.' }, { status: 409 });
    return NextResponse.json(presentIndent(outcome.indent));
  } catch (error) {
    console.error('Error updating position indent:', error);
    return NextResponse.json({ error: 'Failed to update position indent' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = readAuthSession(request);
    if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    if (session.type === 'employee') {
      const [employee, currentIndent] = await Promise.all([
        prisma.employee.findUnique({ where: { id: session.id }, select: { name: true } }),
        prisma.positionIndent.findUnique({ where: { id }, select: { raisedBy: true, raisedByEmployeeId: true } }),
      ]);
      const isOwner = employee && currentIndent && (
        currentIndent.raisedByEmployeeId
          ? currentIndent.raisedByEmployeeId === session.id
          : currentIndent.raisedBy === employee.name
      );
      if (!isOwner) return NextResponse.json({ error: 'You can only delete requirements you raised.' }, { status: 403 });
    }

    const outcome = await prisma.$transaction(async transaction => {
      const current = await transaction.positionIndent.findUnique({ where: { id } });
      if (!current) return 'not-found';
      if (String(current.status).trim().toLowerCase() === 'approved') return 'approved';

      const result = await transaction.positionIndent.deleteMany({
        where: { id, status: current.status },
      });
      if (result.count === 1) return 'deleted';

      const latest = await transaction.positionIndent.findUnique({ where: { id } });
      return latest && String(latest.status).trim().toLowerCase() === 'approved' ? 'approved' : 'conflict';
    });

    if (outcome === 'not-found') return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    if (outcome === 'approved') return NextResponse.json({ error: 'Approved requirements cannot be deleted' }, { status: 409 });
    if (outcome === 'conflict') return NextResponse.json({ error: 'Requirement changed while deleting. Refresh and try again.' }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting position indent:', error);
    return NextResponse.json({ error: 'Failed to delete position indent' }, { status: 500 });
  }
}
