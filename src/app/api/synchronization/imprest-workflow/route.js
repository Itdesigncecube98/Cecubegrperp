export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Ensure the projectsHeadId2 column exists (added for dual-approver support)
async function ensureProjectsHead2Column() {
  try {
    await prisma.$executeRaw`
      ALTER TABLE "ImprestWorkflowConfig"
      ADD COLUMN IF NOT EXISTS "projectsHeadId2" TEXT
    `;
  } catch (e) {
    // Column already exists or other non-fatal error
  }
}

export async function GET() {
  try {
    await ensureProjectsHead2Column();

    // Use raw query to include the new column not yet in Prisma schema
    const rows = await prisma.$queryRaw`
      SELECT wf.*, 
             p1.name AS ph1_name, p1.department AS ph1_dept,
             p2.name AS ph2_name, p2.department AS ph2_dept,
             acc.name AS acc_name, acc.department AS acc_dept,
             adm.name AS adm_name, adm.department AS adm_dept
      FROM "ImprestWorkflowConfig" wf
      LEFT JOIN "Employee" p1 ON p1.id = wf."projectsHeadId"
      LEFT JOIN "Employee" p2 ON p2.id = wf."projectsHeadId2"
      LEFT JOIN "Employee" acc ON acc.id = wf."accountsId"
      LEFT JOIN "Employee" adm ON adm.id = wf."adminId"
      WHERE wf.id = 1
    `;

    if (!rows || rows.length === 0) {
      // Create default row
      await prisma.$executeRaw`
        INSERT INTO "ImprestWorkflowConfig" (id, "updatedAt")
        VALUES (1, NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      return NextResponse.json({ id: 1, projectsHeadId: null, projectsHeadId2: null, accountsId: null, adminId: null });
    }

    const r = rows[0];
    return NextResponse.json({
      id: 1,
      projectsHeadId: r.projectsHeadId || null,
      projectsHeadId2: r.projectsHeadId2 || null,
      accountsId: r.accountsId || null,
      projectsHead: r.ph1_name ? { id: r.projectsHeadId, name: r.ph1_name, department: r.ph1_dept } : null,
      projectsHead2: r.ph2_name ? { id: r.projectsHeadId2, name: r.ph2_name, department: r.ph2_dept } : null,
      accounts: r.acc_name ? { id: r.accountsId, name: r.acc_name, department: r.acc_dept } : null,
    });
  } catch (error) {
    console.error('Error fetching imprest workflow config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await ensureProjectsHead2Column();
    const body = await req.json();
    const { projectsHeadId, projectsHeadId2, accountsId } = body;

    const ph1 = projectsHeadId || null;
    const ph2 = projectsHeadId2 || null;
    const acc = accountsId || null;

    await prisma.$executeRaw`
      INSERT INTO "ImprestWorkflowConfig" (id, "projectsHeadId", "projectsHeadId2", "accountsId", "updatedAt")
      VALUES (1, ${ph1}, ${ph2}, ${acc}, NOW())
      ON CONFLICT (id) DO UPDATE
        SET "projectsHeadId" = ${ph1},
            "projectsHeadId2" = ${ph2},
            "accountsId" = ${acc},
            "updatedAt" = NOW()
    `;

    return NextResponse.json({ success: true, projectsHeadId: ph1, projectsHeadId2: ph2, accountsId: acc });
  } catch (error) {
    console.error('Error updating imprest workflow config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
