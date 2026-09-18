import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  let whereClause = {};
  if (companyId) whereClause.companyId = companyId;
  if (status) whereClause.status = status;
  if (search) {
    whereClause.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { employeeCode: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const labourers = await prisma.labour.findMany({
      where: whereClause,
      orderBy: { employeeCode: "asc" },
    });

    return NextResponse.json({ data: labourers });
  } catch (error) {
    console.error("Error fetching labour:", error);
    return NextResponse.json({ error: "Failed to fetch labour" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { companyId, employeeCode, title, firstName, gender } = body;

    if (!employeeCode || !title || !firstName || !gender) {
      return NextResponse.json(
        { error: "employeeCode, title, firstName and gender are required" },
        { status: 400 }
      );
    }

    const labour = await prisma.labour.create({
      data: {
        ...(companyId ? { companyId } : {}),
        employeeCode: body.employeeCode,
        title: body.title,
        firstName: body.firstName,
        middleName: body.middleName || null,
        lastName: body.lastName || null,
        status: body.status || "ACTIVE",
        joiningDate: body.joiningDate ? new Date(body.joiningDate) : null,
        leavingDate: body.leavingDate ? new Date(body.leavingDate) : null,
        leavingReason: body.leavingReason || null,
        employmentType: body.employmentType || null,
        biometricRefNo: body.biometricRefNo || null,
        dailyWages: body.dailyWages ? Number(body.dailyWages) : null,
        fatherName: body.fatherName || null,
        motherName: body.motherName || null,
        gender: body.gender,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        bloodGroup: body.bloodGroup || null,
        maritalStatus: body.maritalStatus || null,
        spouseName: body.spouseName || null,
        identificationMarks: body.identificationMarks || null,
        panNo: body.panNo || null,
        aadharNo: body.aadharNo || null,
        uan: body.uan || null,
        pfNo: body.pfNo || null,
        pfStartDate: body.pfStartDate ? new Date(body.pfStartDate) : null,
        esiNo: body.esiNo || null,
        passportNumber: body.passportNumber || null,
        passportIssuedBy: body.passportIssuedBy || null,
        permanentAddress: body.permanentAddress || null,
        temporaryAddress: body.temporaryAddress || null,
        mobile1: body.mobile1 || null,
        mobile2: body.mobile2 || null,
        email1: body.email1 || null,
        email2: body.email2 || null,
        telephoneOffice1: body.telephoneOffice1 || null,
        telephoneOffice2: body.telephoneOffice2 || null,
        telephoneResidence: body.telephoneResidence || null,
      },
    });
    return NextResponse.json({ data: labour }, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Employee Code already exists" }, { status: 409 });
    }
    console.error("Error creating labour:", err);
    return NextResponse.json({ error: "Failed to create labour" }, { status: 500 });
  }
}
