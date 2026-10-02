export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveProjectLibraryContext } from '@/lib/projectLibrary';

async function syncWorkOrderTasksIntoLibrary(libraryId) {
  if (!libraryId) return;
  const library = await prisma.library.findUnique({ where: { id: libraryId }, select: { name: true } });
  if (!library?.name) return;
  const legacyProjects = await prisma.project.findMany({ where: { library: library.name }, select: { name: true } });
  if (!legacyProjects.length) return;
  const projectNames = [...new Set(legacyProjects.map(project => project.name).filter(Boolean))];
  const projectMasters = await prisma.projectMaster.findMany({ where: { name: { in: projectNames } }, select: { id: true, name: true } });
  if (!projectMasters.length) return;
  const orders = await prisma.workOrder.findMany({ where: { projectId: { in: projectMasters.map(project => project.id) } }, select: { projectId: true, scope: true } });
  const group = await prisma.taskLibraryGroup.findFirst({ where: { libraryId, name: { equals: 'work', mode: 'insensitive' } }, select: { id: true } });
  if (!group) return;

  const imported = [];
  const scheduled = new Set();
  for (const order of orders) {
    let scope = {};
    try { scope = order.scope ? JSON.parse(order.scope) : {}; } catch { continue; }
    for (const item of Array.isArray(scope.items) ? scope.items : []) {
      const name = String(item.description || '').trim();
      if (!name) continue;
      const key = `${order.projectId}:${name.toLowerCase()}`;
      if (scheduled.has(key)) continue;
      scheduled.add(key);
      const exists = await prisma.taskLibraryItem.findFirst({ where: {
        groupId: group.id,
        name: { equals: name, mode: 'insensitive' },
        OR: [{ projectId: order.projectId }, { projectId: null }],
      }, select: { id: true } });
      if (exists) continue;
      imported.push({
        groupId: group.id, libraryId, projectId: order.projectId, name,
        unit: item.unit || 'Job', quantity: Number(item.qty) || 1,
        description: 'Imported from generated work order',
      });
    }
  }
  if (imported.length) await prisma.taskLibraryItem.createMany({ data: imported, skipDuplicates: true });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const libraryId = searchParams.get('libraryId');
    const search = searchParams.get('search');
    const projectId = searchParams.get('projectId');

    // Work-order scopes are also kept in their project's Task Library group.
    // This repairs older work orders that were previously copied only to Site Task Tree.
    if (libraryId) await syncWorkOrderTasksIntoLibrary(libraryId);

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

    let projectTaskFilter;
    if (projectId) {
      const { legacyProject, projectMaster, library } = await resolveProjectLibraryContext(prisma, projectId, { ensureProjectMaster: true });
      if (!libraryId) {
        // The project's configured library is the source of its task and
        // resource catalog. Never fall back to other libraries on a bad link.
        where.libraryId = library?.id || '__unmatched_project_library__';
      }
      if (projectMaster) {
        const projectIds = [projectMaster.id, projectMaster.projectId, legacyProject?.id].filter(Boolean);
        projectTaskFilter = {
          OR: [
            { projectId: { in: projectIds } },
            { projectId: null }
          ]
        };
      } else {
        projectTaskFilter = { id: '__unmatched_project_task__' };
      }
    }

    const groups = await prisma.taskLibraryGroup.findMany({
      where,
      include: {
        library: true,
        tasks: {
          where: projectTaskFilter,
          include: {
            materials: {
              orderBy: { createdAt: 'asc' }
            },
            labours: {
              orderBy: { createdAt: 'asc' }
            },
            equipments: {
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
      const { taskId, name, unit, quantity, rate, specification } = body;
      if (!taskId) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
      if (!name || !name.trim()) return NextResponse.json({ error: 'Material name is required' }, { status: 400 });

      const material = await prisma.taskLibraryMaterial.create({
        data: {
          taskId,
          name: name.trim(),
          unit: unit ? unit.trim() : null,
          quantity: parseFloat(quantity) || 0,
          rate: parseFloat(rate) || 0,
          specification: specification ? specification.trim() : null
        }
      });
      return NextResponse.json(material, { status: 201 });
    }

    // 2. Add Labour to Task
    if (type === 'labour') {
      const { taskId, name, unit, quantity, rate, specification } = body;
      if (!taskId) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
      if (!name || !name.trim()) return NextResponse.json({ error: 'Labour role/name is required' }, { status: 400 });

      const labour = await prisma.taskLibraryLabour.create({
        data: {
          taskId,
          name: name.trim(),
          unit: unit ? unit.trim() : 'Manday',
          quantity: parseFloat(quantity) || 0,
          rate: parseFloat(rate) || 0,
          specification: specification ? specification.trim() : null
        }
      });
      return NextResponse.json(labour, { status: 201 });
    }

    // 3. Add Equipment to Task
    if (type === 'equipment') {
      const { taskId, name, unit, quantity, rate, specification } = body;
      if (!taskId) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
      if (!name || !name.trim()) return NextResponse.json({ error: 'Equipment name is required' }, { status: 400 });

      const equipment = await prisma.taskLibraryEquipment.create({
        data: {
          taskId,
          name: name.trim(),
          unit: unit ? unit.trim() : 'Hour',
          quantity: parseFloat(quantity) || 0,
          rate: parseFloat(rate) || 0,
          specification: specification ? specification.trim() : null
        }
      });
      return NextResponse.json(equipment, { status: 201 });
    }
    if (type === 'task') {
      const { libraryId, groupId, projectId, name, unit, quantity, description } = body;
      if (!groupId) return NextResponse.json({ error: 'Group ID is required for task' }, { status: 400 });
      if (!name || !name.trim()) return NextResponse.json({ error: 'Task name is required' }, { status: 400 });

      let finalLibraryId = libraryId;
      const group = await prisma.taskLibraryGroup.findUnique({ where: { id: groupId }, select: { libraryId: true } });
      if (!group) return NextResponse.json({ error: 'Parent group not found' }, { status: 404 });
      if (!finalLibraryId) {
        finalLibraryId = group.libraryId;
      }
      if (finalLibraryId !== group.libraryId) {
        return NextResponse.json({ error: 'Selected task group does not belong to the selected library.' }, { status: 400 });
      }

      let finalProjectId = null;
      if (projectId) {
        const context = await resolveProjectLibraryContext(prisma, projectId, { ensureProjectMaster: true });
        if (!context.projectMaster) return NextResponse.json({ error: 'Selected project could not be resolved.' }, { status: 400 });
        if (context.library && context.library.id !== group.libraryId) {
          return NextResponse.json({ error: `This project uses ${context.library.name}. Select that library before adding a project task.` }, { status: 400 });
        }
        finalProjectId = context.projectMaster.id;
      }

      const task = await prisma.taskLibraryItem.create({
        data: {
          groupId,
          libraryId: finalLibraryId,
          projectId: finalProjectId,
          name: name.trim(),
          unit: unit ? unit.trim() : null,
          quantity: parseFloat(quantity) || 1,
          description: description ? description.trim() : null
        },
        include: {
          materials: true,
          labours: true,
          equipments: true
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
      const { name, unit, quantity, rate, specification } = body;
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (unit !== undefined) updateData.unit = unit ? unit.trim() : null;
      if (quantity !== undefined) updateData.quantity = parseFloat(quantity) || 0;
      if (rate !== undefined) updateData.rate = parseFloat(rate) || 0;
      if (specification !== undefined) updateData.specification = specification ? specification.trim() : null;

      const item = await prisma.taskLibraryMaterial.update({
        where: { id },
        data: updateData
      });
      return NextResponse.json(item);
    }

    if (type === 'labour') {
      const { name, unit, quantity, rate, specification } = body;
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (unit !== undefined) updateData.unit = unit ? unit.trim() : 'Manday';
      if (quantity !== undefined) updateData.quantity = parseFloat(quantity) || 0;
      if (rate !== undefined) updateData.rate = parseFloat(rate) || 0;
      if (specification !== undefined) updateData.specification = specification ? specification.trim() : null;

      const item = await prisma.taskLibraryLabour.update({
        where: { id },
        data: updateData
      });
      return NextResponse.json(item);
    }

    if (type === 'equipment') {
      const { name, unit, quantity, rate, specification } = body;
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (unit !== undefined) updateData.unit = unit ? unit.trim() : 'Hour';
      if (quantity !== undefined) updateData.quantity = parseFloat(quantity) || 0;
      if (rate !== undefined) updateData.rate = parseFloat(rate) || 0;
      if (specification !== undefined) updateData.specification = specification ? specification.trim() : null;

      const item = await prisma.taskLibraryEquipment.update({
        where: { id },
        data: updateData
      });
      return NextResponse.json(item);
    }

    if (type === 'task') {
      const { name, unit, quantity, description, groupId, projectId } = body;
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (unit !== undefined) updateData.unit = unit ? unit.trim() : null;
      if (quantity !== undefined) updateData.quantity = parseFloat(quantity) || 1;
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (groupId !== undefined) updateData.groupId = groupId;
      if (projectId !== undefined) {
        if (!projectId) {
          updateData.projectId = null;
        } else {
          const context = await resolveProjectLibraryContext(prisma, projectId, { ensureProjectMaster: true });
          if (!context.projectMaster) return NextResponse.json({ error: 'Selected project could not be resolved.' }, { status: 400 });
          const task = await prisma.taskLibraryItem.findUnique({ where: { id }, select: { libraryId: true } });
          const targetGroup = groupId
            ? await prisma.taskLibraryGroup.findUnique({ where: { id: groupId }, select: { libraryId: true } })
            : null;
          const taskLibraryId = targetGroup?.libraryId || task?.libraryId;
          if (context.library && context.library.id !== taskLibraryId) {
            return NextResponse.json({ error: `This project uses ${context.library.name}. Move the task into that library before assigning the project.` }, { status: 400 });
          }
          updateData.projectId = context.projectMaster.id;
        }
      }

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
          include: { materials: true, labours: true, equipments: true }
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

    if (type === 'equipment') {
      await prisma.taskLibraryEquipment.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Equipment deleted successfully' });
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
