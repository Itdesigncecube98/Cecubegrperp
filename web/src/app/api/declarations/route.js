import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const financialYear = searchParams.get('financialYear');

    if (!employeeId || !financialYear) {
      return NextResponse.json({ error: 'Missing employeeId or financialYear' }, { status: 400 });
    }

    const declaration = await prisma.incomeDeclaration.findFirst({
      where: { employeeId, financialYear },
      include: { items: true }
    });

    return NextResponse.json(declaration || { items: [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data.employeeId || data.employeeId === 'ALL') {
      return NextResponse.json({ error: 'Cannot save for ALL employees. Select a specific employee.' }, { status: 400 });
    }

    let declaration = await prisma.incomeDeclaration.findFirst({
      where: { employeeId: data.employeeId, financialYear: data.financialYear }
    });

    if (declaration) {
      await prisma.incomeDeclaration.update({
        where: { id: declaration.id },
        data: { department: data.department, panNumber: data.panNumber }
      });
      await prisma.declarationItem.deleteMany({
        where: { declarationId: declaration.id }
      });
    } else {
      declaration = await prisma.incomeDeclaration.create({
        data: {
          employeeId: data.employeeId,
          financialYear: data.financialYear,
          department: data.department,
          panNumber: data.panNumber
        }
      });
    }

    if (data.items && data.items.length > 0) {
      await prisma.incomeDeclaration.update({
        where: { id: declaration.id },
        data: {
          items: {
            create: data.items.map(item => ({
              tdsType: item.type,
              tdsSection: item.section,
              itemName: item.item,
              actualAmount: Number(item.actual) || 0,
              qualifyingAmount: Number(item.qualifying) || 0,
              finalAmount: Number(item.final) || 0
            }))
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
