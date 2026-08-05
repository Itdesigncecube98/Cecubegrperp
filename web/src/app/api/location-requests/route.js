import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');
  const date = searchParams.get('date');

  try {
    let whereClause = {};
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }
    if (date) {
      // Very basic date filtering by checking if requestedAt starts with the date string
      // In a real app we might use Prisma's date functions, but for simplicity:
      whereClause.requestedAt = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lt: new Date(`${date}T23:59:59.999Z`)
      };
    }

    const requests = await prisma.locationRequest.findMany({
      where: whereClause,
      orderBy: { requestedAt: 'desc' },
      include: {
        employee: true
      }
    });

    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { employeeId } = data;

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const newRequest = await prisma.locationRequest.create({
      data: {
        employeeId,
        status: 'PENDING'
      }
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, status, latitude, longitude, movementType } = data;
    const reqId = parseInt(id);

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData = {
      status: status || 'COMPLETED',
      respondedAt: new Date(),
    };
    if (latitude) updateData.latitude = parseFloat(latitude);
    if (longitude) updateData.longitude = parseFloat(longitude);
    if (movementType) updateData.movementType = movementType;

    const updated = await prisma.locationRequest.update({
      where: { id: reqId },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
