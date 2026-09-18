import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  const types = ['Maternity Leave', 'Paternity Leave'];
  const res = [];
  
  for (const name of types) {
    const exists = await prisma.leaveType.findFirst({ where: { name } });
    if (!exists) {
      await prisma.leaveType.create({ data: { name } });
      res.push(`Created ${name}`);
    } else {
      res.push(`${name} already exists`);
    }
  }
  
  return NextResponse.json({ message: 'Done', results: res });
}
