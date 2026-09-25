export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    let setup = await prisma.pfNssfSetup.findFirst();
    if (!setup) {
      setup = await prisma.pfNssfSetup.create({
        data: { id: 1 }
      });
    }
    return NextResponse.json(setup, { status: 200 });
  } catch (error) {
    console.error('Error fetching PF/NSSF setup:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PF/NSSF setup' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // We only ever have one configuration row (id = 1)
    let setup = await prisma.pfNssfSetup.findFirst();
    
    const data = {
      fromDate: body.fromDate,
      toDate: body.toDate,
      employerEpfFpsPercent: body.employerEpfFpsPercent,
      employerFpsPercent: body.employerFpsPercent,
      employeeEpfFpsPercent: body.employeeEpfFpsPercent,
      employeeFpsPercent: body.employeeFpsPercent,
      ac02EpfAdminCharges: body.ac02EpfAdminCharges,
      ac02RoundValue: body.ac02RoundValue,
      ac02RoundSide: body.ac02RoundSide,
      ac21EdliPercent: body.ac21EdliPercent,
      ac21RoundValue: body.ac21RoundValue,
      ac21RoundSide: body.ac21RoundSide,
      ac22EdliAdminCharges: body.ac22EdliAdminCharges,
      ac22RoundValue: body.ac22RoundValue,
      ac22RoundSide: body.ac22RoundSide,
      ac22InspectionCharges: body.ac22InspectionCharges,
      grossWagesFormula: body.grossWagesFormula,
      employeeSalaryEpfLimit: body.employeeSalaryEpfLimit,
      employeeSalaryFpsLimit: body.employeeSalaryFpsLimit,
      employerSalaryEpfLimit: body.employerSalaryEpfLimit,
      employerSalaryFpsLimit: body.employerSalaryFpsLimit,
      pfNssfSalary: body.pfNssfSalary,
      roundSideLimit: body.roundSideLimit,
      exemptionAgeLimit: body.exemptionAgeLimit,
      employeeEpfInterestRate: body.employeeEpfInterestRate,
      employeeFpsInterestRate: body.employeeFpsInterestRate,
      employerEpfInterestRate: body.employerEpfInterestRate,
      employerFpsInterestRate: body.employerFpsInterestRate
    };

    if (setup) {
      setup = await prisma.pfNssfSetup.update({
        where: { id: setup.id },
        data
      });
    } else {
      setup = await prisma.pfNssfSetup.create({
        data: { id: 1, ...data }
      });
    }

    return NextResponse.json(setup, { status: 200 });
  } catch (error) {
    console.error('Error saving PF/NSSF setup:', error);
    return NextResponse.json(
      { error: 'Failed to save PF/NSSF setup' },
      { status: 500 }
    );
  }
}
