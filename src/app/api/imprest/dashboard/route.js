import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    // 1. Total Issued
    const totalIssuedResult = await prisma.$queryRaw`
      SELECT SUM("issuedAmount") as total FROM "ImprestRequest" WHERE "issuedAmount" IS NOT NULL
    `;
    const totalIssued = totalIssuedResult[0]?.total ? Number(totalIssuedResult[0].total) : 0;

    // 2. Project Wise
    const projectWiseRaw = await prisma.$queryRaw`
      SELECT "projectSite", SUM("issuedAmount") as amount
      FROM "ImprestRequest"
      WHERE "issuedAmount" IS NOT NULL AND "projectSite" IS NOT NULL
      GROUP BY "projectSite"
      ORDER BY amount DESC
    `;
    const projectWise = projectWiseRaw.map(r => ({
      project: r.projectSite,
      amount: Number(r.amount)
    }));

    // 3. Employee Wise
    const employeeWiseRaw = await prisma.$queryRaw`
      SELECT e.name, SUM(ir."issuedAmount") as amount
      FROM "ImprestRequest" ir
      JOIN "Employee" e ON e.id = ir."employeeId"
      WHERE ir."issuedAmount" IS NOT NULL
      GROUP BY e.name
      ORDER BY amount DESC
    `;
    const employeeWise = employeeWiseRaw.map(r => ({
      name: r.name,
      amount: Number(r.amount)
    }));

    // 4. Recent Issuances (to show Issue Details)
    const recentIssuesRaw = await prisma.$queryRaw`
      SELECT ir."requestId", e.name as emp_name, ir."issuedAmount", ir."paymentMode", ir."transactionRef", ir."issueDate"
      FROM "ImprestRequest" ir
      JOIN "Employee" e ON e.id = ir."employeeId"
      WHERE ir."issuedAmount" IS NOT NULL
      ORDER BY ir."issueDate" DESC, ir."updatedAt" DESC
      LIMIT 10
    `;
    const recentIssues = recentIssuesRaw.map(r => ({
      requestId: r.requestId,
      empName: r.emp_name,
      issuedAmount: Number(r.issuedAmount),
      paymentMode: r.paymentMode,
      transactionRef: r.transactionRef,
      issueDate: r.issueDate ? new Date(r.issueDate).toISOString().split('T')[0] : '-'
    }));

    // Calculate other summary cards if possible (Pending Approvals)
    const pendingApprovalResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "ImprestRequest" WHERE status LIKE 'PENDING_%'
    `;
    const pendingApprovalCount = Number(pendingApprovalResult[0]?.count || 0);

    return NextResponse.json({
      totalIssued,
      projectWise,
      employeeWise,
      recentIssues,
      pendingApprovalCount
    });
  } catch (error) {
    console.error('Error fetching imprest dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
