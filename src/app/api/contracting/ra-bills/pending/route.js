export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWorkOrderCompletionData } from '@/lib/workCompletionTasks';

// GET /api/contracting/ra-bills/pending?workOrderId=... OR ?projectName=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get('workOrderId');
    const projectName = searchParams.get('projectName');

    let resolvedProjectName = projectName;
    let workOrder = null;

    if (workOrderId) {
      workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: { project: { select: { id: true, name: true } } },
      });
      if (!workOrder) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
      resolvedProjectName = workOrder.project?.name;
    }

    if (!resolvedProjectName) {
      return NextResponse.json({ tasks: [], approvedTasks: [], totalApprovedAmount: 0, message: 'No project name available' });
    }

    // We MUST resolve the legacy Project by name because siteTaskMaster saves
    // files using the legacy Project model's ID, NOT ProjectMaster.id!
    const completionData = await getWorkOrderCompletionData(prisma, {
      projectName: resolvedProjectName,
      workOrderId,
      workOrderNo: workOrder?.woNo,
    });

    return NextResponse.json({
      ...completionData,
      workOrderNo: workOrder?.woNo,
      contractorName: workOrder?.contractorName,
      projectName: resolvedProjectName,
      debug: { woMatchStrategy: completionData.woMatchStrategy, totalTasksInFile: completionData.totalTasksInFile || 0 },
    });
  } catch (error) {
    console.error('Error fetching pending RA bill tasks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
