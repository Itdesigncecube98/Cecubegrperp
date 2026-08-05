import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const locations = await prisma.gpsLocation.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const location = await prisma.gpsLocation.create({
      data: {
        name: data.name,
        address: data.address || null,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        radiusMeters: parseInt(data.radiusMeters) || 100,
        locationType: data.locationType || 'Office'
      }
    });
    return NextResponse.json(location);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    await prisma.gpsLocation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const location = await prisma.gpsLocation.update({
      where: { id: data.id },
      data: {
        name: data.name,
        address: data.address || null,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        radiusMeters: parseInt(data.radiusMeters) || 100,
        locationType: data.locationType || 'Office'
      }
    });
    return NextResponse.json(location);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
