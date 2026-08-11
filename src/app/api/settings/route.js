import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.accountSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.accountSettings.create({
        data: {} // uses default values
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    
    let settings = await prisma.accountSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.accountSettings.create({
        data: data
      });
    } else {
      settings = await prisma.accountSettings.update({
        where: { id: settings.id },
        data: data
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
