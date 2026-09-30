export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { employeeHasProjectModuleTool } from '@/lib/projectAccess';

export async function GET(request) {
  const session = readAuthSession(request);
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    let where = {};
    if (session.type === 'employee') {
      const grants = await prisma.employeeProjectToolAccess.findMany({
        where: { employeeId: String(session.id), granted: true, tool: { is: { module: 'Marketing', name: 'Project Enquiry View' } } },
        select: { projectId: true }, distinct: ['projectId'],
      });
      const grantedIds = grants.map(grant => grant.projectId);
      const projects = await prisma.project.findMany({ where: { id: { in: grantedIds } }, select: { id: true, name: true } });
      where = { OR: [{ projectId: { in: projects.map(project => project.id) } }, { projectId: null, projectName: { in: projects.map(project => project.name) } }] };
    }
    const rows = await prisma.marketingLead.findMany({ where, include: { leadOwner: { select: { id: true, name: true } }, client: true, opportunities: true }, orderBy: { createdAt: 'desc' } });
    const projectIds = [...new Set(rows.filter(row => !row.projectId).map(row => row.projectName).filter(Boolean))];
    const projects = projectIds.length ? await prisma.project.findMany({ where: { name: { in: projectIds } }, select: { id: true, name: true } }) : [];
    const projectByName = new Map(projects.map(project => [project.name, project.id]));
    const visible = [];
    for (const row of rows) {
      const projectId = row.projectId || projectByName.get(row.projectName) || null;
      if (session.type === 'employee' && (!projectId || !await employeeHasProjectModuleTool(prisma, session.id, projectId, 'Marketing', 'Project Enquiry View'))) continue;
      visible.push({ ...row, projectId });
    }
    return NextResponse.json(visible);
  } catch (error) {
    console.error('Failed to load project enquiries:', error);
    return NextResponse.json({ error: 'Failed to load project enquiries.' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = readAuthSession(request);
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    const body = await request.json();
    const project = body.projectId && await prisma.project.findUnique({ where: { id: String(body.projectId) }, select: { id: true, name: true, state: true } });
    if (!project) return NextResponse.json({ error: 'Choose an existing project.' }, { status: 400 });
    if (session.type === 'employee' && !await employeeHasProjectModuleTool(prisma, session.id, project.id, 'Marketing', 'Project Enquiry Create')) return NextResponse.json({ error: 'You do not have create permission for this project.' }, { status: 403 });
    let client = body.clientId ? await prisma.marketingClient.findUnique({ where: { id: body.clientId } }) : null;
    if (!client && body.companyName) client = await prisma.marketingClient.upsert({ where: { companyName: body.companyName }, update: {}, create: { companyName: body.companyName, contactPerson: body.contactPerson, mobile: body.mobile, email: body.email, address: body.location, industry: body.industry, gstNo: body.gstNo } });
    const count = await prisma.marketingLead.count();
    const lead = await prisma.marketingLead.create({ data: {
      leadId: `L-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
      leadDate: body.leadDate ? new Date(body.leadDate) : new Date(), leadSource: body.leadSource || 'Other', leadType: body.leadType || 'Cold',
      leadOwnerId: body.leadOwnerId, leadStatus: body.leadStatus || 'New', clientId: client?.id || null, companyName: body.companyName,
      contactPerson: body.contactPerson, mobile: body.mobile, email: body.email, location: body.location, industry: body.industry,
      gstNo: body.gstNo, projectId: project.id, projectName: project.name, projectLocation: body.projectLocation || project.state,
      projectType: body.projectType, requirement: body.requirement, estimatedProjectValue: body.estimatedProjectValue ? Number(body.estimatedProjectValue) : null,
      expectedStartDate: body.expectedStartDate ? new Date(body.expectedStartDate) : null, expectedClosingDate: body.expectedClosingDate ? new Date(body.expectedClosingDate) : null,
      competitor: body.competitor, remarks: body.remarks, documents: body.documents || null,
    } });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('Failed to create project enquiry:', error);
    return NextResponse.json({ error: error.message || 'Failed to create project enquiry.' }, { status: 500 });
  }
}
