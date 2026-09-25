export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const documentTypes = await prisma.documentType.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(documentTypes, { status: 200 });
  } catch (error) {
    console.error('Error fetching document types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document types' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, remark, viewInPortal, uploadInPortal, category, scope } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Document Type is required' },
        { status: 400 }
      );
    }

    const newDocumentType = await prisma.documentType.create({
      data: { 
        type,
        remark: remark || null,
        viewInPortal: viewInPortal ?? true,
        uploadInPortal: uploadInPortal ?? true,
        category: category || 'EMPLOYEE',
        scope: scope || 'Individual'
      },
    });

    return NextResponse.json(newDocumentType, { status: 201 });
  } catch (error) {
    console.error('Error creating document type:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Document Type with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create document type' },
      { status: 500 }
    );
  }
}
