import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      totalProjects,
      activeProjects,
      projectsByStatus,
      totalWorkOrders,
      openWorkOrders,
      workOrdersByStatus,
      todaySiteVisits,
      pendingMaterialRequests,
      totalEquipment,
      equipmentByStatus,
      recentProjects,
      overdueWorkOrders,
      equipmentDueSoon
    ] = await Promise.all([
      // Project counts
      prisma.project.count(),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.project.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),

      // Work order counts
      prisma.workOrder.count(),
      prisma.workOrder.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.workOrder.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),

      // Today's site visits
      prisma.siteVisit.count({ where: { visitDate: today } }),

      // Pending material requests
      prisma.materialRequest.count({ where: { status: { in: ['SUBMITTED'] } } }),

      // Equipment
      prisma.equipment.count(),
      prisma.equipment.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),

      // 5 most recent active projects
      prisma.project.findMany({
        where: { status: { in: ['ACTIVE', 'PLANNING'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          manager: { select: { id: true, name: true } },
          _count: { select: { workOrders: true, siteVisits: true } }
        }
      }),

      // Overdue work orders (dueDate < today and not completed/cancelled)
      prisma.workOrder.findMany({
        where: {
          dueDate: { lt: today },
          status: { notIn: ['COMPLETED', 'CANCELLED', 'APPROVED'] }
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
        include: {
          project:    { select: { id: true, projectCode: true, name: true } },
          assignedTo: { select: { id: true, name: true } }
        }
      }),

      // Equipment with service due in next 30 days
      (() => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + 30);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        return prisma.equipment.findMany({
          where: {
            nextServiceDate: { gte: today, lte: cutoffStr },
            status: { not: 'RETIRED' }
          },
          orderBy: { nextServiceDate: 'asc' },
          take: 5
        });
      })()
    ]);

    // Budget utilisation across all projects
    const budgetAgg = await prisma.project.aggregate({
      _sum: { budgetAmount: true, spentAmount: true }
    });

    return NextResponse.json({
      projects: {
        total:    totalProjects,
        active:   activeProjects,
        byStatus: projectsByStatus.map(s => ({ status: s.status, count: s._count._all }))
      },
      workOrders: {
        total:    totalWorkOrders,
        open:     openWorkOrders,
        byStatus: workOrdersByStatus.map(s => ({ status: s.status, count: s._count._all }))
      },
      siteVisits: {
        today: todaySiteVisits
      },
      materialRequests: {
        pendingApproval: pendingMaterialRequests
      },
      equipment: {
        total:    totalEquipment,
        byStatus: equipmentByStatus.map(s => ({ status: s.status, count: s._count._all }))
      },
      budget: {
        totalAllocated: budgetAgg._sum.budgetAmount ?? 0,
        totalSpent:     budgetAgg._sum.spentAmount  ?? 0
      },
      recentProjects,
      overdueWorkOrders,
      equipmentDueSoon
    });
  } catch (error) {
    console.error('GET /api/engg/dashboard-summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
