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

    const updatedAuthority = await prisma.issuingAuthority.update({
      where: { id: parseInt(id) },
      data: {
        name,
        status,
      },
    });

    return NextResponse.json(updatedAuthority, { status: 200 });
  } catch (error) {
    console.error('Error updating issuing authority:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Issuing authority not found' },
        { status: 404 }
      );
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Issuing authority with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update issuing authority' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    await prisma.issuingAuthority.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      { message: 'Issuing authority deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting issuing authority:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Issuing authority not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete issuing authority' },
      { status: 500 }
    );
  }
}
