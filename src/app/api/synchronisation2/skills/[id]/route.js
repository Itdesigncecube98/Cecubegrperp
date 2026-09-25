export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const updatedSkill = await prisma.skill.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description: description || null,
      },
    });

    return NextResponse.json(updatedSkill, { status: 200 });
  } catch (error) {
    console.error('Error updating skill:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Skill with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    await prisma.skill.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      { message: 'Skill deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting skill:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
}
