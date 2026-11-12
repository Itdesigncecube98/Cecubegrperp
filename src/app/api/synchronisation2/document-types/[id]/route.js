export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, remark, viewInPortal, uploadInPortal, category, scope } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Document Type is required' },
        { status: 400 }
      );
    }

    const updatedDocumentType = await prisma.documentType.update({
      where: { id: parseInt(id) },
      data: {
        type,
        remark: remark || null,
        viewInPortal: viewInPortal ?? true,
        uploadInPortal: uploadInPortal ?? true,
        category: category || 'EMPLOYEE',
        scope: scope || 'Individual'
      },
    });

    return NextResponse.json(updatedDocumentType, { status: 200 });
  } catch (error) {
    console.error('Error updating document type:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Document Type not found' },
        { status: 404 }
      );
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Document Type with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update document type' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await prisma.documentType.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      { message: 'Document Type deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting document type:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Document Type not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete document type' },
      { status: 500 }
    );
  }
}
