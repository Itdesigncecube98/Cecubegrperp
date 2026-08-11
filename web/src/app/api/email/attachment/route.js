import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing email log ID' }, { status: 400 });
    }

    const emailLog = await prisma.emailLog.findUnique({
      where: { id: parseInt(id) }
    });

    if (!emailLog) {
      return NextResponse.json({ error: 'Email log not found' }, { status: 404 });
    }

    if (emailLog.emailType !== 'document' || !emailLog.attachmentName) {
      return NextResponse.json({ error: 'No document attachment available for this email log' }, { status: 400 });
    }

    const document = await prisma.employeeDocument.findFirst({
      where: { fileName: emailLog.attachmentName },
      orderBy: { createdAt: 'desc' }
    });

    if (!document) {
      return NextResponse.json({ error: 'Shared document not found' }, { status: 404 });
    }

    return NextResponse.json({
      fileData: document.fileData,
      fileType: document.fileType,
      fileName: document.fileName
    });
  } catch (error) {
    console.error('Email attachment fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch attachment' }, { status: 500 });
  }
}
