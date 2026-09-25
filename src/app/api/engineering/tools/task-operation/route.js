export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.planning_data');

function getTaskOperationStoragePath(projectId) {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  return path.join(STORAGE_DIR, `task_operation_${projectId}.json`);
}

async function getDefaultTreeForProject(projectId, projectName) {
  let taskGroups = [];
  try {
    taskGroups = await prisma.taskLibraryGroup.findMany({
      include: {
        tasks: {
          include: {
            materials: true,
            labours: true
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  } catch (err) {
    console.warn('Error fetching task library groups for task operation', err);
  }

  const projectChildren = [];

  if (taskGroups && taskGroups.length > 0) {
    taskGroups.forEach((grp, gIdx) => {
      const taskNodes = (grp.tasks || []).map((t, tIdx) => ({
        id: `task-${t.id}`,
        taskLibraryId: t.id,
        name: t.name,
        type: 'task',
        qty: t.quantity !== undefined ? t.quantity : 0,
        unit: t.unit || 'Nos',
        rate: t.rate || 0,
        description: t.description || ''
      }));

      projectChildren.push({
        id: `grp-${grp.id || gIdx}`,
        name: grp.name,
        type: 'group',
        expanded: gIdx === 0, // auto expand first group (Civil Work)
        checked: true,
        children: taskNodes
      });
    });
  }

  return {
    id: `proj-${projectId}`,
    name: projectName || 'Birla Estate, Rerouting of 66KV Electrical Service',
    type: 'project',
    expanded: true,
    checked: true,
    children: projectChildren
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const sync = searchParams.get('sync') === 'true';

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const filePath = getTaskOperationStoragePath(projectId);
    if (!sync && fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed && parsed.rootNode) {
          return NextResponse.json(parsed);
        }
      } catch (err) {
        console.warn('Could not read task operation file, generating default', err);
      }
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const rootNode = await getDefaultTreeForProject(projectId, project?.name);

    const initialData = {
      projectId,
      projectName: project?.name || 'Birla Estate, Rerouting of 66KV Electrical Service',
      lastUpdated: new Date().toISOString(),
      rootNode
    };

    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf8');
    return NextResponse.json(initialData);
  } catch (error) {
    console.error('Error fetching task operation data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch task operations' }, { status: 500 });
  }
}

// Tree helper functions
function findNodeAndParent(node, targetId, parent = null) {
  if (node.id === targetId) return { node, parent };
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeAndParent(child, targetId, node);
      if (found) return found;
    }
  }
  return null;
}

function cloneNodeDeep(node) {
  const cloned = {
    ...node,
    id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: node.name
  };
  if (node.children) {
    cloned.children = node.children.map(cloneNodeDeep);
  }
  return cloned;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId, action } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const filePath = getTaskOperationStoragePath(projectId);
    let data;

    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        data = { rootNode: await getDefaultTreeForProject(projectId, 'Project') };
      }
    } else {
      data = { rootNode: await getDefaultTreeForProject(projectId, 'Project') };
    }

    // 1. RENAME_NODE
    if (action === 'RENAME_NODE') {
      const { nodeId, newName } = body;
      const found = findNodeAndParent(data.rootNode, nodeId);
      if (found) {
        found.node.name = newName;
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return NextResponse.json({ success: true, updatedNode: found.node, rootNode: data.rootNode });
      }
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // 2. COPY_PASTE_NODE
    if (action === 'COPY_PASTE_NODE') {
      const { sourceNodeId, targetNodeId, copyWithRate, reason, remark } = body;
      const sourceFound = findNodeAndParent(data.rootNode, sourceNodeId);
      const targetFound = findNodeAndParent(data.rootNode, targetNodeId);

      if (!sourceFound) {
        return NextResponse.json({ error: 'Source node not found' }, { status: 404 });
      }
      if (!targetFound) {
        return NextResponse.json({ error: 'Target node not found' }, { status: 404 });
      }

      // If target is task, we paste inside target's parent
      let destinationContainer = targetFound.node;
      if (targetFound.node.type === 'task') {
        destinationContainer = targetFound.parent || data.rootNode;
      }

      if (!destinationContainer.children) {
        destinationContainer.children = [];
      }

      const newNode = cloneNodeDeep(sourceFound.node);
      if (!copyWithRate) {
        newNode.rate = 0;
      }
      newNode.copyMeta = {
        copiedFrom: sourceFound.node.name,
        reason: reason || 'New Assignment',
        remark: remark || '',
        timestamp: new Date().toISOString()
      };

      destinationContainer.children.push(newNode);
      data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return NextResponse.json({ success: true, rootNode: data.rootNode, newNode });
    }

    // 3. ADD_NODE
    if (action === 'ADD_NODE') {
      const { parentNodeId, nodeType, name, qty, unit, rate } = body;
      const targetFound = findNodeAndParent(data.rootNode, parentNodeId);
      let targetNode = targetFound ? targetFound.node : data.rootNode;

      if (targetNode.type === 'task') {
        targetNode = targetFound.parent || data.rootNode;
      }

      if (!targetNode.children) targetNode.children = [];

      const newNode = {
        id: `node-${Date.now()}`,
        name: name || 'New Task',
        type: nodeType || 'task',
        qty: parseFloat(qty) || 0,
        unit: unit || 'Nos',
        rate: parseFloat(rate) || 0,
        children: nodeType !== 'task' ? [] : undefined
      };

      targetNode.children.push(newNode);
      data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return NextResponse.json({ success: true, rootNode: data.rootNode, newNode });
    }

    // 4. MOVE_NODE (UP or DOWN)
    if (action === 'MOVE_NODE') {
      const { nodeId, direction } = body;
      const found = findNodeAndParent(data.rootNode, nodeId);
      if (found && found.parent && Array.isArray(found.parent.children)) {
        const list = found.parent.children;
        const index = list.findIndex(c => c.id === nodeId);
        if (index !== -1) {
          if (direction === 'UP' && index > 0) {
            const temp = list[index - 1];
            list[index - 1] = list[index];
            list[index] = temp;
          } else if (direction === 'DOWN' && index < list.length - 1) {
            const temp = list[index + 1];
            list[index + 1] = list[index];
            list[index] = temp;
          }
          data.lastUpdated = new Date().toISOString();
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
          return NextResponse.json({ success: true, rootNode: data.rootNode });
        }
      }
    }

    // 5. DELETE_NODE
    if (action === 'DELETE_NODE') {
      const { nodeId } = body;
      const found = findNodeAndParent(data.rootNode, nodeId);
      if (found && found.parent && Array.isArray(found.parent.children)) {
        found.parent.children = found.parent.children.filter(c => c.id !== nodeId);
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return NextResponse.json({ success: true, rootNode: data.rootNode });
      }
    }

    // 6. SAVE_WHOLE_TREE
    if (action === 'SAVE_TREE' && body.rootNode) {
      data.rootNode = body.rootNode;
      data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return NextResponse.json({ success: true, rootNode: data.rootNode });
    }

    return NextResponse.json({ error: 'Action not supported' }, { status: 400 });
  } catch (error) {
    console.error('Error in task operation API:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute task operation' }, { status: 500 });
  }
}
