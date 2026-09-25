import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const updatedReligion = await prisma.religion.update({
      where: { id },
      data: {
        name,
        description: description || null,
      },
    });

    return NextResponse.json(updatedReligion, { status: 200 });
  } catch (error) {
    console.error('Error updating religion:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Religion with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update religion' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);

    await prisma.religion.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Religion deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting religion:', error);
    return NextResponse.json(
      { error: 'Failed to delete religion' },
      { status: 500 }
    );
  }
}
