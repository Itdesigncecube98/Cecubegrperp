import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    
    if (employeeId) {
      const balance = await prisma.leaveBalance.findUnique({
        where: { employeeId: parseInt(employeeId) }
      });
      return NextResponse.json(balance || { casualLeaves: 12, sickLeaves: 7, earnedLeaves: 15 });
    }
    
    // Return all balances if no employeeId
    const all = await prisma.leaveBalance.findMany();
    return NextResponse.json(all);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { employeeId, casualLeaves, sickLeaves, earnedLeaves } = data;
    
    const balance = await prisma.leaveBalance.upsert({
      where: { employeeId: parseInt(employeeId) },
      update: { casualLeaves, sickLeaves, earnedLeaves },
      create: { employeeId: parseInt(employeeId), casualLeaves, sickLeaves, earnedLeaves }
    });
    
    return NextResponse.json(balance);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
