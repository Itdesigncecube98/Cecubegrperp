export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { employeeHasProjectModuleTool } from '@/lib/projectAccess';
import { EMPLOYEE_WIDE_PROJECT_ID } from '@/lib/employeeToolCatalog';

async function checkCompanyLibraryAccess(request, toolName) {
  const session = readAuthSession(request);
  if (!session) return { allowed: false, status: 401, error: 'Sign in to access the Company Library.' };
  if (session.type === 'admin') return { allowed: true };
  if (session.type !== 'employee') {
    return { allowed: false, status: 403, error: 'Employee access is required for the Company Library.' };
  }

  const allowed = await employeeHasProjectModuleTool(
    prisma,
    session.id,
    EMPLOYEE_WIDE_PROJECT_ID,
    'Engineering',
    toolName
  );
  const legacyViewAllowed = toolName === 'Company Library View'
    && await employeeHasProjectModuleTool(
      prisma,
      session.id,
      EMPLOYEE_WIDE_PROJECT_ID,
      'Engineering',
      'Company Library Manage'
    );
  return allowed || legacyViewAllowed
    ? { allowed: true }
    : { allowed: false, status: 403, error: `Company Library ${toolName.replace('Company Library ', '').toLowerCase()} permission is required.` };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('source') === 'company-library') {
      const access = await checkCompanyLibraryAccess(request, 'Company Library View');
      if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const items = await prisma.company.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const access = await checkCompanyLibraryAccess(request, 'Company Library Create');
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const data = await request.json();
    const item = await prisma.company.create({ data });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const access = await checkCompanyLibraryAccess(request, 'Company Library Edit');
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const data = await request.json();
    const { id, ...updateData } = data;
    const item = await prisma.company.update({ where: { id }, data: updateData });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const access = await checkCompanyLibraryAccess(request, 'Company Library Delete');
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const { id } = await request.json();
    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

