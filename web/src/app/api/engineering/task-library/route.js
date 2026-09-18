export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const libraryId = searchParams.get('libraryId');
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search');

    let where = {};
    if (libraryId) {
      where.libraryId = libraryId;
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        {
          tasks: {
            some: {
              OR: [
                { name: { contains: search.trim(), mode: 'insensitive' } },
                { description: { contains: search.trim(), mode: 'insensitive' } }
              ]
            }
          }
        }
      ];
    }

    const groups = await prisma.taskLibraryGroup.findMany({
      where,
      include: {
        library: true,
        tasks: {
          ...(projectId ? { where: { projectId } } : {}),
          include: {
            materials: {
              orderBy: { createdAt: 'asc' }
            },
            labours: {
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const response = NextResponse.json(groups);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (error) {
    console.error('Error fetching task library data:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch task library' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { type } = body;

    // 1. Add Material to Task
    if (type === 'material') {
      const { taskId, name, unit, quantity, specification } = body;
      if (!taskId) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
      if (!name || !name.trim()) return NextResponse.json({ error: 'Material name is required' }, { status: 400 });

      const material = await prisma.taskLibraryMaterial.create({
        data: {
          taskId,
          name: name.trim(),
          unit: unit ? unit.trim() : null,
          quantity: parseFloat(quantity) || 0,
          specification: specification ? specification.trim() : null
        }
      });
      return NextResponse.json(material, { status: 201 });
    }

    // 2. Add Labour to Task
    if (type === 'labour') {
      const { taskId, name, unit, quantity, specification } = body;
      if (!taskId) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
      if (!name || !name.trim()) return NextResponse.json({ error: 'Labour role/name is required' }, { status: 400 });

      const labour = await prisma.taskLibraryLabour.create({
        data: {
          taskId,
          name: name.trim(),
          unit: unit ? unit.trim() : 'Manday',
          quantity: parseFloat(quantity) || 0,
          specification: specification ? specification.trim() : null
        }
      });
      return NextResponse.json(labour, { status: 201 });
    }

    // 3. Add Task under Group
    if (type === 'task') {
      const { libraryId, groupId, projectId, name, unit, quantity, description } = body;
      if (!groupId) return NextResponse.json({ error: 'Group ID is required for task' }, { status: 400 });
      if (!name || !name.trim()) return NextResponse.json({ error: 'Task name is required' }, { status: 400 });

      let finalLibraryId = libraryId;
      if (!finalLibraryId) {
        const group = await prisma.taskLibraryGroup.findUnique({ where: { id: groupId } });
        if (!group) return NextResponse.json({ error: 'Parent group not found' }, { status: 404 });
        finalLibraryId = group.libraryId;
      }

      const task = await prisma.taskLibraryItem.create({
        data: {
          groupId,
          libraryId: finalLibraryId,
          projectId: projectId || null,
          name: name.trim(),
          unit: unit ? unit.trim() : null,
          quantity: parseFloat(quantity) || 1,
          description: description ? description.trim() : null
        },
        include: {
          materials: true,
          labours: true
        }
      });
      return NextResponse.json(task, { status: 201 });
    }

    // 4. Add Group under Library
    const { libraryId, name, description } = body;
    if (!libraryId) return NextResponse.json({ error: 'Library ID is required' }, { status: 400 });
    if (!name || !name.trim()) return NextResponse.json({ error: 'Group name is required' }, { status: 400 });

    const group = await prisma.taskLibraryGroup.create({
      data: {
        libraryId,
        name: name.trim(),
        description: description ? description.trim() : null
      },
      include: {
        tasks: {
          include: { materials: true, labours: true }
        }
      }
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating task library item:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create item' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, type } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    if (type === 'material') {
      const { name, unit, quantity, specification } = body;
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (unit !== undefined) updateData.unit = unit ? unit.trim() : null;
      if (quantity !== undefined) updateData.quantity = parseFloat(quantity) || 0;
      if (specification !== undefined) updateData.specification = specification ? specification.trim() : null;

      const item = await prisma.taskLibraryMaterial.update({
        where: { id },
        data: updateData
      });
      return NextResponse.json(item);
    }

    if (type === 'labour') {
      const { name, unit, quantity, specification } = body;
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (unit !== undefined) updateData.unit = unit ? unit.trim() : 'Manday';
      if (quantity !== undefined) updateData.quantity = parseFloat(quantity) || 0;
      if (specification !== undefined) updateData.specification = specification ? specification.trim() : null;

      const item = await prisma.taskLibraryLabour.update({
        where: { id },
        data: updateData
      });
      return NextResponse.json(item);
    }

    if (type === 'task') {
      const { name, unit, quantity, description, groupId } = body;
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (unit !== undefined) updateData.unit = unit ? unit.trim() : null;
      if (quantity !== undefined) updateData.quantity = parseFloat(quantity) || 1;
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (groupId !== undefined) updateData.groupId = groupId;

      const item = await prisma.taskLibraryItem.update({
        where: { id },
        data: updateData,
        include: {
          materials: true,
          labours: true
        }
      });
      return NextResponse.json(item);
    }

    // Default: update Group
    const { name, description } = body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;

    const group = await prisma.taskLibraryGroup.update({
      where: { id },
      data: updateData,
      include: {
        tasks: {
          include: { materials: true, labours: true }
        }
      }
    });
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating task library item:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    let id = null;
    let type = null;
    try {
      const body = await req.json();
      id = body?.id;
      type = body?.type;
    } catch (e) {
      // not JSON body
    }

    if (!id) {
      const { searchParams } = new URL(req.url);
      id = searchParams.get('id');
      type = searchParams.get('type');
    }

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    if (type === 'material') {
      await prisma.taskLibraryMaterial.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Material deleted successfully' });
    }

    if (type === 'labour') {
      await prisma.taskLibraryLabour.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Labour deleted successfully' });
    }

    if (type === 'task') {
      await prisma.taskLibraryItem.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Task deleted successfully' });
    }

    // Default: try deleting group
    try {
      await prisma.taskLibraryGroup.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Group deleted successfully' });
    } catch (e) {
      await prisma.taskLibraryItem.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Item deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting task library item:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete item' }, { status: 500 });
  }
}
