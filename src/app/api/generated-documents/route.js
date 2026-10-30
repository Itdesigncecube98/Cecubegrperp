export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';

const APPROVAL_ROLES = {
  SUPERVISOR: { from: 'PENDING_SUPERVISOR', to: 'PENDING_HR', mapping: 'supervisorId' },
  HR: { from: 'PENDING_HR', to: 'PENDING_ACCOUNTS', mapping: 'hrId' },
  ACCOUNTS: { from: 'PENDING_ACCOUNTS', to: 'PENDING_HOD', mapping: 'accountsId' },
  HOD: { from: 'PENDING_HOD', to: 'APPROVED', mapping: 'hodId' },
};

function parseFormData(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function serializeDocument(document) {
  const formData = parseFormData(document.formData);
  return {
    ...formData,
    id: String(document.id),
    databaseRecord: true,
    employeeId: document.employeeId,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function storedFormData(data) {
  const { id, employeeId, status, createdAt, updatedAt, ...formData } = data;
  return formData;
}

async function canApprove(session, role, employeeId) {
  if (session.type === 'admin') return true;
  const approval = APPROVAL_ROLES[role];
  if (!approval) return false;
  if (role === 'HR') {
    const employee = await prisma.employee.findUnique({
      where: { id: session.id },
      select: { role: true },
    });
    if (employee?.role?.trim().toUpperCase() === 'HR') return true;
  }
  if (role === 'SUPERVISOR') {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { supervisorId: true },
    });
    return employee?.supervisorId === session.id;
  }
  const mapping = await prisma.docWorkflowMapping.findUnique({
    where: { employeeId },
    select: { [approval.mapping]: true },
  });
  return mapping?.[approval.mapping] === session.id;
}

export async function GET(request) {
  const session = readAuthSession(request);
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const role = String(searchParams.get('role') || '').trim().toUpperCase();
    let employeeIds;

    if (session.type === 'admin') {
      employeeIds = undefined;
    } else if (!role) {
      employeeIds = [session.id];
    } else if (role === 'SUPERVISOR') {
      const employees = await prisma.employee.findMany({
        where: { supervisorId: session.id },
        select: { id: true },
      });
      employeeIds = employees.map(employee => employee.id);
    } else if (APPROVAL_ROLES[role]) {
      const actor = await prisma.employee.findUnique({
        where: { id: session.id },
        select: { role: true },
      });
      if (role === 'HR' && actor?.role?.trim().toUpperCase() === 'HR') {
        employeeIds = undefined;
      } else {
      const mappings = await prisma.docWorkflowMapping.findMany({
        where: { [APPROVAL_ROLES[role].mapping]: session.id },
        select: { employeeId: true },
      });
      if (mappings.length === 0 && actor?.role?.trim().toUpperCase() !== role) {
        return NextResponse.json({ error: 'You are not assigned to this document role.' }, { status: 403 });
      }
      employeeIds = mappings.map(mapping => mapping.employeeId);
      }
    } else {
      return NextResponse.json({ error: 'Invalid document access role.' }, { status: 400 });
    }

    const documents = await prisma.generatedDocument.findMany({
      where: employeeIds ? { employeeId: { in: employeeIds } } : {},
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(documents.map(serializeDocument));
  } catch (error) {
    console.error('[GET /api/generated-documents]', error);
    return NextResponse.json({ error: 'Failed to load generated documents.' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = readAuthSession(request);
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  try {
    const data = await request.json();
    const requestedEmployeeId = String(data.employeeId || '');
    let employeeId = session.type === 'admin' ? requestedEmployeeId : session.id;
    const templateId = String(data.templateId || data.formType || '').toUpperCase();
    const status = String(data.status || 'DRAFT').toUpperCase();
    if (!employeeId || !['ACCOMMODATION', 'FOOD'].includes(templateId)) {
      return NextResponse.json({ error: 'Employee and a valid document template are required.' }, { status: 400 });
    }
    if (!['DRAFT', 'PENDING_SUPERVISOR'].includes(status)) {
      return NextResponse.json({ error: 'Invalid initial document status.' }, { status: 400 });
    }
    if (status === 'PENDING_SUPERVISOR' && !data.certified) {
      return NextResponse.json({ error: 'Employee declaration is required before submission.' }, { status: 400 });
    }
    if (session.type === 'employee' && requestedEmployeeId && requestedEmployeeId !== session.id) {
      const [actor, workflow] = await Promise.all([
        prisma.employee.findUnique({ where: { id: session.id }, select: { role: true } }),
        prisma.docWorkflowMapping.findUnique({
          where: { employeeId: requestedEmployeeId },
          select: { hrId: true },
        }),
      ]);
      if (actor?.role?.trim().toUpperCase() !== 'HR' && workflow?.hrId !== session.id) {
        return NextResponse.json({ error: 'You are not allowed to create documents for this employee.' }, { status: 403 });
      }
      employeeId = requestedEmployeeId;
    }
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

    const formData = storedFormData(data);
    formData.templateId = templateId;
    if (data.clientId) {
      const existing = await prisma.generatedDocument.findMany({
        where: { employeeId, formType: templateId },
        orderBy: { createdAt: 'desc' },
      });
      const match = existing.find(document => parseFormData(document.formData).clientId === String(data.clientId));
      if (match) {
        return NextResponse.json(serializeDocument(match));
      }
      formData.clientId = String(data.clientId);
    }

    const document = await prisma.generatedDocument.create({
      data: { employeeId, formType: templateId, formData: JSON.stringify(formData), status },
    });
    return NextResponse.json(serializeDocument(document), { status: 201 });
  } catch (error) {
    console.error('[POST /api/generated-documents]', error);
    return NextResponse.json({ error: 'Failed to save generated document.' }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = readAuthSession(request);
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  try {
    const data = await request.json();
    const id = Number(data.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'A valid document ID is required.' }, { status: 400 });
    }
    const document = await prisma.generatedDocument.findUnique({ where: { id } });
    if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    const formData = parseFormData(document.formData);

    if (data.action === 'approve' || data.action === 'reject') {
      const role = String(data.role || '').toUpperCase();
      const approval = APPROVAL_ROLES[role];
      if (!approval || (document.status !== approval.from && session.type !== 'admin')) {
        return NextResponse.json({ error: 'This document is not awaiting your approval.' }, { status: 409 });
      }
      if (!(await canApprove(session, role, document.employeeId))) {
        return NextResponse.json({ error: 'You are not assigned to approve this document.' }, { status: 403 });
      }
      const approved = data.action === 'approve';
      const employee = session.type === 'employee'
        ? await prisma.employee.findUnique({ where: { id: session.id }, select: { name: true } })
        : null;
      formData[`${role.toLowerCase()}Approval`] = {
        ...(formData[`${role.toLowerCase()}Approval`] || {}),
        ...(data.approvalData && typeof data.approvalData === 'object' ? data.approvalData : {}),
        approved,
        approvedBy: employee?.name || 'Administrator',
        date: new Date().toLocaleDateString(),
      };
      const updated = await prisma.generatedDocument.update({
        where: { id },
        data: {
          formData: JSON.stringify(formData),
          status: approved ? approval.to : 'REJECTED',
        },
      });
      return NextResponse.json(serializeDocument(updated));
    }

    if (session.type !== 'admin' && document.employeeId !== session.id) {
      return NextResponse.json({ error: 'You can only update your own documents.' }, { status: 403 });
    }
    if (session.type !== 'admin' && document.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only drafts can be edited.' }, { status: 409 });
    }
    const status = String(data.status || document.status).toUpperCase();
    if (!['DRAFT', 'PENDING_SUPERVISOR'].includes(status)) {
      return NextResponse.json({ error: 'Invalid document status.' }, { status: 400 });
    }
    if (status === 'PENDING_SUPERVISOR' && !data.certified) {
      return NextResponse.json({ error: 'Employee declaration is required before submission.' }, { status: 400 });
    }
    const updated = await prisma.generatedDocument.update({
      where: { id },
      data: {
        formType: String(data.templateId || document.formType).toUpperCase(),
        formData: JSON.stringify(storedFormData(data)),
        status,
      },
    });
    return NextResponse.json(serializeDocument(updated));
  } catch (error) {
    console.error('[PUT /api/generated-documents]', error);
    return NextResponse.json({ error: 'Failed to update generated document.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = readAuthSession(request);
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  try {
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'A valid document ID is required.' }, { status: 400 });
    }
    const document = await prisma.generatedDocument.findUnique({ where: { id } });
    if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    if (session.type !== 'admin' && (document.employeeId !== session.id || document.status !== 'DRAFT')) {
      return NextResponse.json({ error: 'Only your own drafts can be deleted.' }, { status: 403 });
    }
    await prisma.generatedDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/generated-documents]', error);
    return NextResponse.json({ error: 'Failed to delete generated document.' }, { status: 500 });
  }
}
