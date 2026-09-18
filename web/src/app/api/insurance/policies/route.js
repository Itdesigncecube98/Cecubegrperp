import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const mode = searchParams.get("mode") || "start"; 
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const policyStatus = searchParams.get("policyStatus") || "All";
  const contractorWorkingStatus = searchParams.get("contractorWorkingStatus") || "All";

  const dateField = mode === "end" ? "endDate" : "startDate";

  let whereClause = {};
  if (companyId) whereClause.companyId = companyId;
  if (contractorWorkingStatus !== "All") whereClause.contractorWorkingStatus = contractorWorkingStatus;
  
  if (fromDate && toDate) {
    whereClause[dateField] = { gte: new Date(fromDate), lte: new Date(toDate) };
  }

  try {
    const policies = await prisma.insurancePolicy.findMany({
      where: whereClause,
      include: { contractor: true, project: true, policyType: true, documents: true },
      orderBy: { startDate: "desc" },
    });

    const now = new Date();
    const withComputedStatus = policies.map((p) => ({
      ...p,
      computedStatus: p.endDate < now ? "Expired" : "Active",
    }));

    const filtered =
      policyStatus === "All"
        ? withComputedStatus
        : withComputedStatus.filter((p) => p.computedStatus === policyStatus);

    return NextResponse.json({ data: filtered, count: filtered.length });
  } catch (error) {
    console.error("Error fetching policies:", error);
    return NextResponse.json({ error: "Failed to fetch policies" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      companyId, contractorId, projectId, policyTypeId, policyNo,
      startDate, endDate, noOfPersonsInsured, contractorWorkingStatus,
      location, remark,
    } = body;

    // Remove strict companyId check for now to allow flexible creation or default to a dummy if needed
    if (!contractorId || !projectId || !policyTypeId || !policyNo || !startDate || !endDate) {
      return NextResponse.json(
        { error: "contractorId, projectId, policyTypeId, policyNo, startDate and endDate are required" },
        { status: 400 }
      );
    }

    const policy = await prisma.insurancePolicy.create({
      data: {
        ...(companyId ? { companyId } : {}),
        contractorId,
        projectId,
        policyTypeId,
        policyNo,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        noOfPersonsInsured: Number(noOfPersonsInsured) || 0,
        contractorWorkingStatus: contractorWorkingStatus || "Working",
        location,
        remark,
      },
    });

    return NextResponse.json({ data: policy }, { status: 201 });
  } catch (error) {
    console.error("Error creating policy:", error);
    return NextResponse.json({ error: "Failed to create policy" }, { status: 500 });
  }
}
