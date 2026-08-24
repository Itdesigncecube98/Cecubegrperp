import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const checkSupervisor = searchParams.get('checkSupervisor');

    // Lightweight: is this employee a supervisor of anyone?
    if (checkSupervisor) {
      const count = await prisma.employee.count({
        where: { supervisorId: checkSupervisor }
      });
      return NextResponse.json({ isSupervisor: count > 0 });
    }

    const includeDetails = searchParams.get('details') === 'true';
    const whereClause = role ? { role } : {};
    const employees = await prisma.employee.findMany({ 
      where: whereClause,
      include: includeDetails ? {
        dependents: true,
        bankDetails: true,
        workExperiences: true,
        educations: true
      } : undefined
    });
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { password, role, dependents, bankDetails, workExperiences, educations, id, supervisor, leaveBalance, _count, attendances, punchRequests, leaveRequests, locationRequests, documents, vehicles, tripLogs, createdAt, orgChartNode, jobHistories, ...otherData } = data;
    if (otherData.supervisorId === '') otherData.supervisorId = null;
    
    let dependentCreate = undefined;
    if (dependents && Array.isArray(dependents) && dependents.length > 0) {
      dependentCreate = {
        create: dependents.map(d => ({
          name: d.name,
          relationship: d.relationship,
          dateOfBirth: d.dateOfBirth,
          phone: d.phone
        }))
      };
    }

    let bankDetailCreate = undefined;
    if (bankDetails && Array.isArray(bankDetails) && bankDetails.length > 0) {
      bankDetailCreate = {
        create: bankDetails.map(b => ({
          bankName: b.bankName,
          accountName: b.accountName,
          accountNumber: b.accountNumber,
          ifscCode: b.ifscCode,
          branch: b.branch
        }))
      };
    }

    let workExperienceCreate = undefined;
    if (workExperiences && Array.isArray(workExperiences) && workExperiences.length > 0) {
      workExperienceCreate = {
        create: workExperiences.map(w => ({
          companyName: w.companyName,
          jobTitle: w.jobTitle,
          fromDate: w.fromDate,
          toDate: w.toDate,
          jobDescription: w.jobDescription
        }))
      };
    }

    let educationsCreate = undefined;
    if (educations && Array.isArray(educations) && educations.length > 0) {
      educationsCreate = {
        create: educations.map(e => ({
          institution: e.institution,
          degree: e.degree,
          year: e.year,
          grade: e.grade
        }))
      };
    }

    const newEmployee = await prisma.employee.create({
      data: {
        ...otherData,
        password: password,
        role: role || 'EMPLOYEE',
        dependents: dependentCreate,
        bankDetails: bankDetailCreate,
        workExperiences: workExperienceCreate,
        educations: educationsCreate,
        leaveBalance: {
          create: {
            casualLeaves: 1,
            leaveWithoutPay: 0,
            earnedLeaves: 2
          }
        },
        jobHistories: {
          create: [{
            siteOffice: otherData.siteOffice,
            branch: otherData.branch,
            department: otherData.department,
            designation: otherData.designation,
            chargeType: otherData.chargeType,
            fromDate: otherData.joinedDate || new Date().toISOString().split('T')[0]
          }]
        }
      }
    });
    return NextResponse.json(newEmployee);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    // Strip relational/computed fields that Prisma cannot directly update
    const { id, dependents, bankDetails, workExperiences, educations, supervisor, leaveBalance, _count, attendances, punchRequests, leaveRequests, locationRequests, documents, vehicles, tripLogs, createdAt, id: empDbId, orgChartNode, ...updateData } = data;
    
    // Only set role if it's explicitly provided
    if (updateData.role === undefined) {
      delete updateData.role;
    }
    if (updateData.supervisorId === '') {
      updateData.supervisorId = null;
    }

    if (dependents && Array.isArray(dependents)) {
      updateData.dependents = {
        deleteMany: {},
        create: dependents.map(d => ({
          name: d.name,
          relationship: d.relationship,
          dateOfBirth: d.dateOfBirth,
          phone: d.phone
        }))
      };
    }

    if (bankDetails && Array.isArray(bankDetails)) {
      updateData.bankDetails = {
        deleteMany: {},
        create: bankDetails.map(b => ({
          bankName: b.bankName,
          accountName: b.accountName,
          accountNumber: b.accountNumber,
          ifscCode: b.ifscCode,
          branch: b.branch
        }))
      };
    }

    if (workExperiences && Array.isArray(workExperiences)) {
      updateData.workExperiences = {
        deleteMany: {},
        create: workExperiences.map(w => ({
          companyName: w.companyName,
          jobTitle: w.jobTitle,
          fromDate: w.fromDate,
          toDate: w.toDate,
          jobDescription: w.jobDescription
        }))
      };
    }

    if (educations && Array.isArray(educations)) {
      updateData.educations = {
        deleteMany: {},
        create: educations.map(e => ({
          institution: e.institution,
          degree: e.degree,
          year: e.year,
          grade: e.grade
        }))
      };
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(updatedEmployee);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await prisma.employee.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
