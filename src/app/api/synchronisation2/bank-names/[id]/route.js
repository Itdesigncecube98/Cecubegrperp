export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, status } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const updatedBankName = await prisma.bankName.update({
      where: { id: parseInt(id) },
      data: { 
        name,
        status: status || 'Active'
      },
    });

    return NextResponse.json(updatedBankName, { status: 200 });
  } catch (error) {
    console.error('Error updating bank name:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Bank Name not found' },
        { status: 404 }
      );
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bank Name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update bank name' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    await prisma.bankName.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      { message: 'Bank Name deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting bank name:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Bank Name not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete bank name' },
      { status: 500 }
    );
  }
}
