export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const regimes = await prisma.taxRegime.findMany({
      include: { brackets: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(regimes);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    // data expects: { name, financialYear, category, brackets: [{ lowerLimit, upperLimit, rate }] }
    
    // Check if regime with this name and FY already exists
    let regime = await prisma.taxRegime.findFirst({
      where: { name: data.name, financialYear: data.financialYear }
    });

    if (!regime) {
      regime = await prisma.taxRegime.create({
        data: {
          name: data.name,
          financialYear: data.financialYear,
        }
      });
    } else {
      // If regime exists, delete any existing brackets for this category to replace them
      await prisma.taxBracket.deleteMany({
        where: { regimeId: regime.id, category: data.category }
      });
    }

    // Create the new brackets for this category
    if (data.brackets && data.brackets.length > 0) {
      await prisma.taxRegime.update({
        where: { id: regime.id },
        data: {
          brackets: {
            create: data.brackets.map(b => ({
              category: data.category,
              lowerLimit: Number(b.lowerLimit),
              upperLimit: b.upperLimit ? Number(b.upperLimit) : null,
              rate: Number(b.rate)
            }))
          }
        }
      });
    }

    const updatedRegime = await prisma.taxRegime.findUnique({
      where: { id: regime.id },
      include: { brackets: true }
    });

    return NextResponse.json(updatedRegime, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    // data expects: { regimeId, name, financialYear, category, brackets: [...] }
    
    await prisma.taxRegime.update({
      where: { id: data.regimeId },
      data: { name: data.name, financialYear: data.financialYear }
    });

    await prisma.taxBracket.deleteMany({
      where: { regimeId: data.regimeId, category: data.category }
    });

    if (data.brackets && data.brackets.length > 0) {
      await prisma.taxRegime.update({
        where: { id: data.regimeId },
        data: {
          brackets: {
            create: data.brackets.map(b => ({
              category: data.category,
              lowerLimit: Number(b.lowerLimit),
              upperLimit: b.upperLimit ? Number(b.upperLimit) : null,
              rate: Number(b.rate)
            }))
          }
        }
      });
    }

    const updatedRegime = await prisma.taxRegime.findUnique({
      where: { id: data.regimeId },
      include: { brackets: true }
    });

    return NextResponse.json(updatedRegime);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const data = await request.json();
    if (data.category) {
      await prisma.taxBracket.deleteMany({
        where: { regimeId: data.regimeId, category: data.category }
      });
      const remaining = await prisma.taxBracket.count({ where: { regimeId: data.regimeId } });
      if (remaining === 0) {
        await prisma.taxRegime.delete({ where: { id: data.regimeId } });
      }
    } else {
      await prisma.taxRegime.delete({ where: { id: data.regimeId } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
