import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import crypto from "crypto";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const projectId = searchParams.get("projectId");

  if (!employeeId || !projectId) {
    return NextResponse.json({ error: "employeeId and projectId are required" }, { status: 400 });
  }

  try {
    const tools = await prisma.adminTool.findMany({
      where: { isActive: true },
      orderBy: [{ module: "asc" }, { name: "asc" }],
    });

    const grants = await prisma.employeeProjectToolAccess.findMany({
      where: { employeeId, projectId },
    });
    const grantedSet = new Set(grants.filter(g => g.granted).map(g => g.toolId));

    const result = tools.map(t => ({
      id: t.id,
      module: t.module,
      name: t.name,
      isGranted: grantedSet.has(t.id),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching employee tools:", error);
    return NextResponse.json({ error: "Failed to fetch employee tools" }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  const { employeeId, projectId, toolIds } = body;

  if (!employeeId || !projectId || !Array.isArray(toolIds)) {
    return NextResponse.json({ error: "employeeId, projectId and toolIds[] are required" }, { status: 400 });
  }

  try {
    const allTools = await prisma.adminTool.findMany({ where: { isActive: true } });
    const grantedSet = new Set(toolIds);

    for (const tool of allTools) {
      const shouldGrant = grantedSet.has(tool.id);
      const existing = await prisma.employeeProjectToolAccess.findFirst({
        where: { employeeId, projectId, toolId: tool.id },
      });

      if (existing) {
        if (existing.granted !== shouldGrant) {
          await prisma.employeeProjectToolAccess.update({
            where: { id: existing.id },
            data: { granted: shouldGrant },
          });
        }
      } else {
        await prisma.employeeProjectToolAccess.create({
          data: {
            id: crypto.randomUUID(),
            employeeId,
            projectId,
            toolId: tool.id,
            granted: shouldGrant,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving employee tools:", error);
    return NextResponse.json({ error: "Failed to save employee tools" }, { status: 500 });
  }
}
