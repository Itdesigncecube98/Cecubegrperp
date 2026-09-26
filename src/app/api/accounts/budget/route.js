import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id         = searchParams.get('id');
    const projectId  = searchParams.get('projectId');
    const category   = searchParams.get('category');
    const fiscalYear = searchParams.get('fiscalYear');

    if (id) {
      const item = await prisma.budgetAllocation.findUnique({
        where: { id: parseInt(id) },
        include: { project: { select: { id: true, projectCode: true, name: true } } }
      });
      if (!item) return NextResponse.json({ error: 'Budget item not found' }, { status: 404 });
      return NextResponse.json(item);
    }

    const where = {};
    if (projectId)  where.projectId  = parseInt(projectId);
    if (category)   where.category   = category;
    if (fiscalYear) where.fiscalYear = fiscalYear;

    const items = await prisma.budgetAllocation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { id: true, projectCode: true, name: true } } }
    });

    // Per-project summary if projectId given
    if (projectId) {
      const totalAllocated = items.reduce((s, i) => s + (i.revised ?? i.allocated), 0);
      const totalSpent     = items.reduce((s, i) => s + i.spent, 0);
      return NextResponse.json({
        items,
        summary: {
          totalAllocated: Math.round(totalAllocated * 100) / 100,
          totalSpent:     Math.round(totalSpent     * 100) / 100,
          remaining:      Math.round((totalAllocated - totalSpent) * 100) / 100,
          utilisation:    totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 10000) / 100 : 0
        }
      });
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error('GET /api/accounts/budget:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { projectId, category, description, allocated, fiscalYear, notes } = data;

    if (!projectId || !category) {
      return NextResponse.json({ error: 'projectId and category are required' }, { status: 400 });
    }

    const item = await prisma.budgetAllocation.create({
      data: {
        projectId:   parseInt(projectId),
        category,
        description: description || null,
        allocated:   allocated   ? parseFloat(allocated) : 0,
        spent:       0,
        fiscalYear:  fiscalYear  || null,
        notes:       notes       || null
      },
      include: { project: { select: { id: true, projectCode: true, name: true } } }
    });

    // Update project budgetAmount
    await syncProjectBudget(parseInt(projectId));

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/accounts/budget:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Budget item id is required' }, { status: 400 });

    if (updates.allocated !== undefined) updates.allocated = parseFloat(updates.allocated);
    if (updates.spent     !== undefined) updates.spent     = parseFloat(updates.spent);
    if (updates.revised   !== undefined) updates.revised   = updates.revised ? parseFloat(updates.revised) : null;

    const item = await prisma.budgetAllocation.update({
      where: { id: parseInt(id) },
      data: updates,
      include: { project: { select: { id: true, projectCode: true, name: true } } }
    });

    await syncProjectBudget(item.projectId);

    return NextResponse.json(item);
  } catch (error) {
    console.error('PUT /api/accounts/budget:', error);
    if (error.code === 'P2025') return NextResponse.json({ error: 'Budget item not found' }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Budget item id is required' }, { status: 400 });

    const item = await prisma.budgetAllocation.findUnique({ where: { id: parseInt(id) } });
    if (!item) return NextResponse.json({ error: 'Budget item not found' }, { status: 404 });

    await prisma.budgetAllocation.delete({ where: { id: parseInt(id) } });
    await syncProjectBudget(item.projectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/accounts/budget:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Keep Project.budgetAmount in sync with sum of allocations
async function syncProjectBudget(projectId) {
  const agg = await prisma.budgetAllocation.aggregate({
    where: { projectId },
    _sum: { allocated: true, spent: true }
  });
  await prisma.project.update({
    where: { id: projectId },
    data: {
      budgetAmount: agg._sum.allocated ?? 0,
      spentAmount:  agg._sum.spent     ?? 0
    }
  });
}
