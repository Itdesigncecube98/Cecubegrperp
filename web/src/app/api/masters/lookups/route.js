import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  
  // As requested, we filter by companyId if provided. 
  // Note: we had to adjust contractor to use 'companyName' instead of 'name' as per the existing schema.
  let contractorWhere = companyId ? { companyId } : {};
  let projectWhere = companyId ? { companyId } : {};
  let policyTypeWhere = companyId ? { companyId } : {};

  try {
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
