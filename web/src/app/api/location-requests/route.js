import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');
  const date = searchParams.get('date');

  try {
    let whereClause = {};
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (date) {
      whereClause.requestedAt = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lt: new Date(`${date}T23:59:59.999Z`)
      };
    } else if (startDate && endDate) {
      whereClause.requestedAt = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lt: new Date(`${endDate}T23:59:59.999Z`)
      };
    } else if (startDate) {
      whereClause.requestedAt = {
        gte: new Date(`${startDate}T00:00:00.000Z`)
      };
    } else if (endDate) {
      whereClause.requestedAt = {
        lt: new Date(`${endDate}T23:59:59.999Z`)
      };
    }

    const requests = await prisma.locationRequest.findMany({
      where: whereClause,
      orderBy: { requestedAt: 'desc' },
      include: {
        employee: true,
        pings: {
          orderBy: { timestamp: 'asc' }
        }
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

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await prisma.locationRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
