import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    
    if (employeeId) {
      const balance = await prisma.leaveBalance.findUnique({
        where: { employeeId: employeeId }
      });
      return NextResponse.json(balance || { casualLeaves: 12, leaveWithoutPay: 0, earnedLeaves: 15 });
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
    const { employeeId, casualLeaves, leaveWithoutPay, earnedLeaves } = data;
    
    const balance = await prisma.leaveBalance.upsert({
      where: { employeeId: employeeId },
      update: { casualLeaves, leaveWithoutPay, earnedLeaves },
      create: { employeeId: employeeId, casualLeaves, leaveWithoutPay, earnedLeaves }
    });
    
    return NextResponse.json(balance);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
