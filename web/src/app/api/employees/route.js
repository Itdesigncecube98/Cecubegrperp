export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getOrganizationCode = (organization) => {
  const name = String(organization || '').trim().toLowerCase();
  if (name.includes('green energy')) return { prefix: 'CGEPL', width: 2 };
  if (name.includes('cecube') && name.includes('engineering')) return { prefix: 'CEIPL', width: 3 };
  return null;
};

// GET - Fetch all employees
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkSupervisorId = searchParams.get('checkSupervisor');

    if (checkSupervisorId) {
      const [employee, subordinateCount, pendingPunches, pendingLeaves] = await Promise.all([
        prisma.employee.findUnique({
          where: { id: checkSupervisorId },
          select: { id: true, role: true, assignedModules: true }
        }),
        prisma.employee.count({ where: { supervisorId: checkSupervisorId } }),
        prisma.punchRequest.count({
          where: { status: 'PENDING', employee: { supervisorId: checkSupervisorId } }
        }),
        prisma.leaveRequest.count({
          where: { targetSupervisorId: checkSupervisorId, status: 'PENDING_SUPERVISOR' }
        })
      ]);

      if (!employee) {
        return NextResponse.json({ isSupervisor: false, reason: 'Employee not found' }, { status: 404 });
      }

      const role = (employee.role || '').toUpperCase();
      const assignedModules = employee.assignedModules || [];
      const hasSupervisorModule = assignedModules.some((module) =>
        String(module).toUpperCase().includes('SUPERVISOR')
      );

      const isSupervisor =
        role.includes('SUPERVISOR') ||
        hasSupervisorModule ||
        subordinateCount > 0 ||
        pendingPunches > 0 ||
        pendingLeaves > 0;

      return NextResponse.json({
        isSupervisor,
        subordinateCount,
        pendingPunches,
        pendingLeaves
      });
    }

    const employees = await prisma.employee.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        empId: true,
        title: true,
        name: true,
        email: true,
        password: true,
        phone: true,
        workTelephone: true,
        otherEmail: true,
        role: true,
        department: true,
        designation: true,
        position: true,
        grade: true,
        employeeType: true,
        branch: true,
        siteOffice: true,
        jobHistories: {
          orderBy: { fromDate: 'desc' },
          take: 1,
          select: {
            designation: true,
            department: true,
            branch: true,
            siteOffice: true,
            fromDate: true,
            toDate: true
          }
        },
        organisation: true,
        employmentStatus: true,
        supervisorId: true,
        joinedDate: true,
        createdAt: true,
        photoUrl: true,
        basicSalary: true,
        hra: true,
        annualCtc: true,
        monthlyCtc: true,
        conveyance: true,
        medical: true,
        specialAllowance: true,
        bonus: true,
        salaryRevisions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            components: {
              select: {
                amount: true,
                salaryHead: {
                  select: {
                    description: true,
                    id: true,
                    calculationType: true,
                    remark: true,
                    isActive: true,
                    headTypeId: true,
                    createdAt: true,
                  }
                }
              }
            }
          }
        },
      }
    });

    return NextResponse.json(employees);

  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new employee
export async function POST(request) {
  try {
    const body = await request.json();

    if (Array.isArray(body.emergencyContacts) && body.emergencyContacts.length > 3) {
      return NextResponse.json({ error: 'A maximum of 3 emergency contacts is allowed.' }, { status: 400 });
    }

    const empIdRaw = body.empId ?? body.employeeId;
    let empId = empIdRaw != null ? empIdRaw.toString().trim() : '';

    const nameFromParts = [body.firstName, body.lastName].filter(Boolean).join(' ').trim();
    const name = (typeof body.name === 'string' ? body.name.trim() : '') || nameFromParts;

    const email = (body.email || '').trim();
    const organisation = body.organisation ?? body.organization ?? null;

    if (!email) {
      return NextResponse.json({ error: 'Email is required to create an employee login.' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Employee name is required.' }, { status: 400 });
    }

    // A password must always be stored so the employee can log in. Fall back to
    // the shared default (and surface it) when the admin leaves it blank.
    const providedPassword = typeof body.password === 'string' ? body.password.trim() : '';
    const password = providedPassword || 'default123';

    if (!empId && organisation) {
      const org = await prisma.organization.findFirst({ where: { name: organisation } });
      const configuredCode = getOrganizationCode(organisation);
      const prefix = configuredCode?.prefix || org?.code?.trim().toUpperCase();
      const codeWidth = configuredCode?.width || 3;
      if (prefix) {
        const counter = await prisma.$transaction(async (tx) => {
          const current = await tx.employeeCodeCounter.findUnique({ where: { prefix } });
          if (current) {
            return tx.employeeCodeCounter.update({ where: { prefix }, data: { nextNumber: { increment: 1 } } });
          }
          const existingEmployees = await tx.employee.findMany({
            where: { empId: { startsWith: prefix, mode: 'insensitive' } },
            select: { empId: true }
          });
          const highestExistingNumber = existingEmployees.reduce((highest, employee) => {
            const match = employee.empId?.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
            return match ? Math.max(highest, Number(match[1])) : highest;
          }, 0);
          return tx.employeeCodeCounter.create({ data: { prefix, nextNumber: highestExistingNumber + 1 } });
        });
        empId = `${prefix}${String(counter.nextNumber).padStart(codeWidth, '0')}`;
      }
    }

    if (empId) {
      const existingWithEmpId = await prisma.employee.findFirst({
        where: { empId: { equals: empId, mode: 'insensitive' } }
      });
      if (existingWithEmpId) {
        return NextResponse.json({
          error: `Employee Code "${empId}" is already assigned to ${existingWithEmpId.name}. Employee Code cannot be duplicated.`
        }, { status: 400 });
      }
    }

    const employee = await prisma.employee.create({
      data: {
        empId: empId || null,
        name,
        email,
        password,
        phone: body.phone ?? body.phoneNumber ?? null,
        // `department` is a required (non-null) column on Employee.
        department: (body.department != null ? String(body.department) : '').trim(),
        designation: body.designation != null ? String(body.designation) : null,
        role: body.role || 'EMPLOYEE',
        employmentStatus: body.employmentStatus || body.status || 'Working',
        organisation,
        ...(Array.isArray(body.emergencyContacts) ? {
          emergencyContacts: {
            create: body.emergencyContacts.map(contact => ({
              name: contact.name || null,
              phone: contact.phone || null,
              relationship: contact.relationship || null
            }))
          }
        } : {})
      }
    });

    return NextResponse.json(employee);

  } catch (error) {
    console.error('Error creating employee:', error);
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'unique field';
      return NextResponse.json({
        error: `An employee with the same ${target} already exists. Email addresses must be unique.`
      }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
