import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(_request, { params }) {
  try {
    const policy = await prisma.insurancePolicy.findUnique({
      where: { id: params.id },
      include: { contractor: true, project: true, policyType: true, documents: true },
    });
    if (!policy) return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    return NextResponse.json({ data: policy });
  } catch (error) {
    console.error("Error fetching policy:", error);
    return NextResponse.json({ error: "Failed to fetch policy" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const {
      contractorId, projectId, policyTypeId, policyNo,
      startDate, endDate, noOfPersonsInsured, contractorWorkingStatus,
      location, remark,
    } = body;

    const policy = await prisma.insurancePolicy.update({
      where: { id: params.id },
      data: {
        ...(contractorId !== undefined ? { contractorId } : {}),
        ...(projectId !== undefined ? { projectId } : {}),
        ...(policyTypeId !== undefined ? { policyTypeId } : {}),
        ...(policyNo !== undefined ? { policyNo } : {}),
        ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
        ...(noOfPersonsInsured !== undefined ? { noOfPersonsInsured: Number(noOfPersonsInsured) } : {}),
        ...(contractorWorkingStatus !== undefined ? { contractorWorkingStatus } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(remark !== undefined ? { remark } : {}),
      },
    });
    return NextResponse.json({ data: policy });
  } catch (err) {
    console.error("Error updating policy:", err);
    return NextResponse.json({ error: "Policy not found or update failed" }, { status: 404 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    await prisma.insurancePolicy.delete({ where: { id: params.id } });
    return NextResponse.json({ data: { id: params.id, deleted: true } });
  } catch (err) {
    console.error("Error deleting policy:", err);
    return NextResponse.json({ error: "Policy not found or delete failed" }, { status: 404 });
  }
}
