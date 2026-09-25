export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const updatedCategory = await prisma.tdsCategory.update({
      where: { id: parseInt(id) },
      data: { name },
    });

    return NextResponse.json(updatedCategory, { status: 200 });
  } catch (error) {
    console.error('Error updating TDS category:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'TDS Category not found' },
        { status: 404 }
      );
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'TDS Category with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update TDS category' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    await prisma.tdsCategory.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      { message: 'TDS Category deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting TDS category:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'TDS Category not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete TDS category' },
      { status: 500 }
    );
  }
}
