import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');
  const type = searchParams.get('type');

  try {
    let whereClause = {};
    if (employeeId) whereClause.employeeId = employeeId;
    if (type) whereClause.documentType = type;

    const documents = await prisma.employeeDocument.findMany({
      where: whereClause,
      select: {
        id: true,
        employeeId: true,
        documentType: true,
        documentName: true,
        documentNumber: true,
        expiryDate: true,
        fileName: true,
        fileType: true,
        createdAt: true,
        employee: {
          select: {
            name: true,
            empId: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data.employeeId || !data.documentType || !data.documentName || !data.fileData || !data.fileName || !data.fileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newDoc = await prisma.employeeDocument.create({
      data: {
        employeeId: data.employeeId,
        documentType: data.documentType,
        documentName: data.documentName,
        documentNumber: data.documentNumber || null,
        expiryDate: data.expiryDate || null,
        fileData: data.fileData, // Base64 string
        fileName: data.fileName,
        fileType: data.fileType
      }
    });

    return NextResponse.json({ success: true, id: newDoc.id });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: error.message || 'Failed to create document' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
  }

  try {
    await prisma.employeeDocument.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
