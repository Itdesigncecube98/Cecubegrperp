import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id           = searchParams.get('id');
    const projectId    = searchParams.get('projectId');
    const discipline   = searchParams.get('discipline');
    const drawingType  = searchParams.get('drawingType');
    const status       = searchParams.get('status');
    const withFileData = searchParams.get('withFileData') === 'true';

    if (id) {
      const drawing = await prisma.drawingDocument.findUnique({
        where: { id: parseInt(id) },
        include: {
          project:    { select: { id: true, projectCode: true, name: true } },
          uploadedBy: { select: { id: true, name: true } }
        }
      });
      if (!drawing) return NextResponse.json({ error: 'Drawing not found' }, { status: 404 });
      return NextResponse.json(drawing);
    }

    const where = {};
    if (projectId)   where.projectId   = parseInt(projectId);
    if (discipline)  where.discipline  = discipline;
    if (drawingType) where.drawingType = drawingType;
    if (status)      where.status      = status;

    // Exclude heavy base64 fileData from list view unless explicitly requested
    const select = withFileData ? undefined : {
      id: true, projectId: true, drawingNumber: true, title: true,
      revision: true, discipline: true, drawingType: true,
      status: true, uploadedById: true, fileName: true,
      fileType: true, fileSize: true, remarks: true,
      issuedDate: true, createdAt: true, updatedAt: true
    };

    const drawings = await prisma.drawingDocument.findMany({
      where,
      orderBy: [{ discipline: 'asc' }, { drawingNumber: 'asc' }],
      select: select ?? {
        id: true, projectId: true, drawingNumber: true, title: true,
        revision: true, discipline: true, drawingType: true,
        status: true, uploadedById: true, fileName: true,
        fileType: true, fileSize: true, remarks: true,
        issuedDate: true, createdAt: true, updatedAt: true
      }
    });

    // Attach project + uploader info separately (since we used custom select)
    const withRelations = await prisma.drawingDocument.findMany({
      where,
      orderBy: [{ discipline: 'asc' }, { drawingNumber: 'asc' }],
      include: {
        project:    { select: { id: true, projectCode: true, name: true } },
        uploadedBy: { select: { id: true, name: true } }
      },
      ...(withFileData ? {} : {
        select: {
          id: true, projectId: true, drawingNumber: true, title: true,
          revision: true, discipline: true, drawingType: true,
          status: true, uploadedById: true, fileName: true,
          fileType: true, fileSize: true, remarks: true,
          issuedDate: true, createdAt: true, updatedAt: true,
          project:    { select: { id: true, projectCode: true, name: true } },
          uploadedBy: { select: { id: true, name: true } }
        }
      })
    });

    return NextResponse.json(withRelations);
  } catch (error) {
    console.error('GET /api/engg/drawings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      projectId, drawingNumber, title, revision,
      discipline, drawingType, status, uploadedById,
      fileData, fileName, fileType, fileSize,
      remarks, issuedDate
    } = data;

    if (!projectId || !drawingNumber || !title) {
      return NextResponse.json(
        { error: 'projectId, drawingNumber, and title are required' },
        { status: 400 }
      );
    }

    const drawing = await prisma.drawingDocument.create({
      data: {
        projectId:    parseInt(projectId),
        drawingNumber,
        title,
        revision:     revision    || 'A',
        discipline:   discipline  || 'Civil',
        drawingType:  drawingType || 'Design',
        status:       status      || 'DRAFT',
        uploadedById: uploadedById || null,
        fileData:     fileData    || null,
        fileName:     fileName    || null,
        fileType:     fileType    || null,
        fileSize:     fileSize    ? parseInt(fileSize) : null,
        remarks:      remarks     || null,
        issuedDate:   issuedDate  || null
      },
      include: {
        project:    { select: { id: true, projectCode: true, name: true } },
        uploadedBy: { select: { id: true, name: true } }
      }
    });

    // Return without fileData in response to keep payload small
    const { fileData: _fd, ...drawingWithoutFile } = drawing;
    return NextResponse.json(drawingWithoutFile, { status: 201 });
  } catch (error) {
    console.error('POST /api/engg/drawings:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A drawing with this number and revision already exists for this project' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Drawing id is required' }, { status: 400 });

    if (updates.projectId !== undefined) updates.projectId = parseInt(updates.projectId);
    if (updates.fileSize  !== undefined) updates.fileSize  = updates.fileSize ? parseInt(updates.fileSize) : null;

    const drawing = await prisma.drawingDocument.update({
      where: { id: parseInt(id) },
      data: updates,
      include: {
        project:    { select: { id: true, projectCode: true, name: true } },
        uploadedBy: { select: { id: true, name: true } }
      }
    });

    const { fileData: _fd, ...drawingWithoutFile } = drawing;
    return NextResponse.json(drawingWithoutFile);
  } catch (error) {
    console.error('PUT /api/engg/drawings:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Drawing not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Drawing id is required' }, { status: 400 });

    await prisma.drawingDocument.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/engg/drawings:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Drawing not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
