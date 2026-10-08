
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
        assignedGpsLocations: true,
        emergencyContacts: { orderBy: { id: 'asc' } },
        documents: true,
        leavingReason: { select: { id: true, name: true } },
        shifts: { include: { shift: true }, orderBy: { effectiveFrom: 'desc' } },
        jobHistories: { orderBy: { id: 'desc' } },
        _count: { select: { attendances: true, leaveRequests: true } }
      }
    });
    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Portal module tiles historically used Employee.assignedModules. Include
    // modules that now have project-wise Employee Tools grants so those
    // employees can enter the workspace they were assigned.
    const projectToolGrants = await prisma.employeeProjectToolAccess.findMany({
      where: { employeeId: employee.id, granted: true },
      select: { tool: { select: { module: true } } },
    });
    const assignedModules = Array.from(new Set([
      ...(employee.assignedModules || []),
      ...projectToolGrants.map(grant => grant.tool.module),
    ]));
    return NextResponse.json({ ...employee, assignedModules });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { password, dependents, assignedGpsLocations, emergencyContacts, bankDetails, workExperiences, educations, _count, supervisor, leaveBalance, attendances, punchRequests, leaveRequests, locationRequests, documents, vehicles, tripLogs, createdAt, id: empDbId, orgChartNode, jobHistories, shifts, ...updateData } = data;

    // Persist password updates. `password` is deliberately excluded from the
    // spread above so it is never overwritten with null/undefined, but it must
    // be written back explicitly whenever a non-empty value is supplied.
    if (typeof password === 'string' && password.trim().length > 0) {
      updateData.password = password.trim();
    }
    
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
          branch: b.branch,
          branchCode: b.branchCode,
          address: b.address,
          isPrimary: b.isPrimary || false
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
          course: e.course,
          year: e.year,
          grade: e.grade
        }))
      };
    }

    if (assignedGpsLocations && Array.isArray(assignedGpsLocations)) {
      updateData.assignedGpsLocations = {
        deleteMany: {},
        create: assignedGpsLocations.map(l => ({
          location: l.location,
          effectiveDate: l.effectiveDate,
          budgetHead: l.budgetHead
        }))
      };
    }

    if (emergencyContacts && Array.isArray(emergencyContacts)) {
      if (emergencyContacts.length > 3) {
        return NextResponse.json({ error: 'A maximum of 3 emergency contacts is allowed.' }, { status: 400 });
      }
      updateData.emergencyContacts = {
        deleteMany: {},
        create: emergencyContacts.map(contact => ({
          name: contact.name || null,
          phone: contact.phone || null,
          relationship: contact.relationship || null
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

    if (updateData.empId !== undefined && updateData.empId !== null) {
      const trimmedEmpId = updateData.empId.toString().trim();
      if (trimmedEmpId) {
        const existingWithEmpId = await prisma.employee.findFirst({
          where: {
            id: { not: actualId },
            empId: { equals: trimmedEmpId, mode: 'insensitive' }
          }
        });
        if (existingWithEmpId) {
          return NextResponse.json({ 
            error: `Employee Code "${trimmedEmpId}" is already assigned to ${existingWithEmpId.name} (${existingWithEmpId.email}). Employee Code cannot be duplicated.` 
          }, { status: 400 });
        }
        updateData.empId = trimmedEmpId;
      }
    }

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

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);

    const existingEmployee = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: decodedId },
          { empId: decodedId },
          { name: decodedId }
        ]
      },
      select: { id: true, name: true, empId: true }
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await prisma.employee.delete({
      where: { id: existingEmployee.id }
    });

    return NextResponse.json({
      success: true,
      id: existingEmployee.id,
      name: existingEmployee.name,
      empId: existingEmployee.empId
    });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete employee' }, { status: 500 });
  }
}
