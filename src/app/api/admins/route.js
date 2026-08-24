import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const admins = await prisma.admin.findMany({
      select: { id: true, adminId: true, name: true, email: true, department: true, password: true }
    });
    return NextResponse.json(admins);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // check if email already exists
    const existing = await prisma.admin.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const newAdmin = await prisma.admin.create({
      data: {
        adminId: data.adminId || null,
        name: data.name,
        email: data.email,
        department: data.department,
        password: data.password
      },
      select: { id: true, adminId: true, name: true, email: true, department: true, password: true }
    });
    return NextResponse.json(newAdmin);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    if (!updateData.password) {
      delete updateData.password;
    }
    
    const updatedAdmin = await prisma.admin.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, adminId: true, name: true, email: true, department: true, password: true }
    });
    return NextResponse.json(updatedAdmin);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // Check to prevent deleting the ONLY admin
    const adminCount = await prisma.admin.count();
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last admin account.' }, { status: 400 });
    }
    
    await prisma.admin.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
