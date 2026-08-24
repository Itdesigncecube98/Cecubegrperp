
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: decodedId },
          { empId: decodedId },
          { name: decodedId }
        ]
      },
      include: {
        supervisor: { select: { id: true, name: true } },
        leaveBalance: true,
        dependents: true,
        bankDetails: true,
        workExperiences: true,
        educations: true,
        jobHistories: { orderBy: { id: 'desc' } },
        _count: { select: { attendances: true, leaveRequests: true } }
      }
    });
    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(employee);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { password, dependents, bankDetails, workExperiences, educations, _count, supervisor, leaveBalance, attendances, punchRequests, leaveRequests, locationRequests, documents, vehicles, tripLogs, createdAt, id: empDbId, orgChartNode, jobHistories, ...updateData } = data;
    
    // Handle nested dependents update if provided
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

    const decodedId = decodeURIComponent(id);
    const existingEmployee = await prisma.employee.findFirst({ 
      where: {
        OR: [
          { id: decodedId },
          { empId: decodedId },
          { name: decodedId }
        ]
      }, 
      include: { jobHistories: true } 
    });
    
    if (!existingEmployee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    const actualId = existingEmployee.id;

    const relevantFields = ['siteOffice', 'branch', 'department', 'designation', 'chargeType'];
    const hasTransferChanged = relevantFields.some(f => updateData[f] !== undefined && updateData[f] !== existingEmployee[f]);

    const todayStr = new Date().toISOString().split('T')[0];

    if (hasTransferChanged) {
      if (!existingEmployee.jobHistories || existingEmployee.jobHistories.length === 0) {
        // Backfill first record
        await prisma.jobHistory.create({
          data: {
            employeeId: actualId,
            siteOffice: existingEmployee.siteOffice,
            branch: existingEmployee.branch,
            department: existingEmployee.department,
            designation: existingEmployee.designation,
            chargeType: existingEmployee.chargeType,
            fromDate: existingEmployee.joinedDate || existingEmployee.createdAt.toISOString().split('T')[0],
            toDate: todayStr
          }
        });
      } else {
        // Close the current active record
        await prisma.jobHistory.updateMany({
          where: { employeeId: actualId, toDate: null },
          data: { toDate: todayStr }
        });
      }

      // Create new active record
      await prisma.jobHistory.create({
        data: {
          employeeId: actualId,
          siteOffice: updateData.siteOffice !== undefined ? updateData.siteOffice : existingEmployee.siteOffice,
          branch: updateData.branch !== undefined ? updateData.branch : existingEmployee.branch,
          department: updateData.department !== undefined ? updateData.department : existingEmployee.department,
          designation: updateData.designation !== undefined ? updateData.designation : existingEmployee.designation,
          chargeType: updateData.chargeType !== undefined ? updateData.chargeType : existingEmployee.chargeType,
          fromDate: todayStr,
          toDate: null
        }
      });
    }

    const updated = await prisma.employee.update({
      where: { id: actualId },
      data: updateData,
      include: { 
        dependents: true,
        bankDetails: true,
        workExperiences: true,
        educations: true,
        jobHistories: { orderBy: { id: 'desc' } },
        supervisor: { select: { id: true, name: true } },
        leaveBalance: true,
        _count: { select: { attendances: true, leaveRequests: true } }
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update Error:', error);
    require('fs').appendFileSync('update_error.log', new Date().toISOString() + ': ' + error.message + '\n' + (error.stack || '') + '\n');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
