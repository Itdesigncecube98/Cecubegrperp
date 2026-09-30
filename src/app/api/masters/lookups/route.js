import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { readAuthSession } from '@/lib/authSession';
import { getEmployeeGrantedProjectIds } from '@/lib/projectAccess';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const session = readAuthSession(request);
  if (!session) return NextResponse.json({ error: 'Please sign in to load project lookups.' }, { status: 401 });
  
  // As requested, we filter by companyId if provided. 
  // Note: we had to adjust contractor to use 'companyName' instead of 'name' as per the existing schema.
  let contractorWhere = companyId ? { companyId } : {};
  let projectWhere = companyId ? { companyId } : {};
  let policyTypeWhere = companyId ? { companyId } : {};

  try {
    if (session.type === 'employee') {
      const projectIds = await getEmployeeGrantedProjectIds(prisma, session.id);
      projectWhere = { ...projectWhere, id: { in: projectIds } };
    }
    const [contractors, projects, policyTypes] = await Promise.all([
      prisma.contractor.findMany({ where: contractorWhere, orderBy: { companyName: "asc" } }),
      prisma.project.findMany({ where: projectWhere, orderBy: { name: "asc" } }),
      prisma.policyType.findMany({ where: policyTypeWhere, orderBy: { name: "asc" } }),
    ]);

    return NextResponse.json({ data: { contractors, projects, policyTypes } });
  } catch (error) {
    console.error("Error fetching lookups:", error);
    return NextResponse.json({ error: "Failed to fetch lookups" }, { status: 500 });
  }
}
