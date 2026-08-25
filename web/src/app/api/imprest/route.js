import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── POST: Create new imprest request ───────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();
    const { employeeId, amountRequested, requiredDate, purpose, projectSite, imprestHead, imprestType, isDraft } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const countResult = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "ImprestRequest"`;
    const count = Number(countResult[0]?.cnt || 0);
    const reqId = `CIPID-${String(count + 1).padStart(4, '0')}`;

    const status = isDraft ? 'DRAFT' : 'PENDING_SUPERVISOR';
    const amt = parseFloat(amountRequested) || 0;
    const rDate = requiredDate || new Date().toISOString().split('T')[0];
    const purp = purpose || '';
    const site = projectSite || null;
    const head = imprestHead || null;
    const typeStr = imprestType || null;

    const result = await prisma.$queryRaw`
      INSERT INTO "ImprestRequest" (
        "requestId", "employeeId", "amountRequested", "requiredDate",
        "purpose", "projectSite", "imprestHead", "imprestType", "status", "createdAt", "updatedAt"
      ) VALUES (
        ${reqId}, ${employeeId}, ${amt}, ${rDate},
        ${purp}, ${site}, ${head}, ${typeStr}, ${status}, NOW(), NOW()
      )
      RETURNING id, "requestId", "employeeId", "amountRequested", "requiredDate",
                "purpose", "projectSite", "imprestHead", "imprestType", "status", "createdAt"
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating Imprest Request:', error);
    return NextResponse.json({ error: error.message || 'Failed to create request' }, { status: 500 });
  }
}

// ─── GET: Fetch imprest requests ────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const approverId = searchParams.get('approverId');
    const status = searchParams.get('status');
    const settledStatus = searchParams.get('settledStatus');

    let requests = [];

    if (approverId) {
      // Fetch workflow config (with raw query to pick up projectsHeadId2 column)
      const wfRows = await prisma.$queryRaw`SELECT id, "projectsHeadId", "projectsHeadId2", "accountsId" FROM "ImprestWorkflowConfig" WHERE id = 1`;
      const wf = wfRows[0] || {};

      const projectsHeadId = wf.projectsHeadId || '__none__';
      const projectsHeadId2 = wf.projectsHeadId2 || '__none__';
      const accountsId = wf.accountsId || '__none__';

      const isProjectsHead = approverId === projectsHeadId;
      const isProjectsHead2 = approverId === projectsHeadId2;
      const isAccounts = approverId === accountsId;

      const results = await prisma.$queryRaw`
        SELECT ir.id, ir."requestId", ir."employeeId",
               ir."amountRequested"::float AS "amountRequested",
               ir."approvedAmount"::float AS "approvedAmount",
               ir."requiredDate", ir.purpose, ir."projectSite",
               ir."imprestHead", ir."imprestType", ir.status, ir.remarks, ir."createdAt",
               e.name AS emp_name, e."empId" AS emp_code, e.department AS emp_dept
        FROM "ImprestRequest" ir
        LEFT JOIN "Employee" e ON e.id = ir."employeeId"
        WHERE (
          (ir.status = 'PENDING_SUPERVISOR' AND e."supervisorId" = ${approverId})
          OR (ir.status = 'PENDING_ACCOUNTS' AND ${isAccounts}::boolean)
          OR (ir.status = 'PENDING_PROJECTS_HEAD' AND ${isProjectsHead}::boolean)
          OR (ir.status = 'PENDING_PROJECTS_HEAD_2' AND ${isProjectsHead2}::boolean)
        )
        ORDER BY ir."createdAt" DESC
      `;

      requests = results.map(r => ({
        id: Number(r.id),
        requestId: r.requestId,
        employeeId: r.employeeId,
        amountRequested: Number(r.amountRequested) || 0,
        approvedAmount: r.approvedAmount != null ? Number(r.approvedAmount) : null,
        requiredDate: r.requiredDate,
        purpose: r.purpose,
        projectSite: r.projectSite,
        imprestHead: r.imprestHead,
        imprestType: r.imprestType,
        status: r.status,
        remarks: r.remarks,
        createdAt: r.createdAt,
        employee: {
          name: r.emp_name,
          empId: r.emp_code,
          department: r.emp_dept,
        }
      }));

    } else if (employeeId) {
      const results = await prisma.$queryRaw`
        SELECT ir.id, ir."requestId", ir."employeeId",
                 ir."amountRequested"::float AS "amountRequested",
                 ir."approvedAmount"::float AS "approvedAmount",
                 ir."requiredDate", ir.purpose, ir."projectSite",
                 ir."imprestHead", ir."imprestType", ir.status, ir.remarks, ir."createdAt", ir."issueDate", ir."settledStatus", ir."settlementDate", ir."issuedAmount", ir."transactionRef", ir."paymentMode", e.department AS emp_dept
        FROM "ImprestRequest" ir
        LEFT JOIN "Employee" e ON e.id = ir."employeeId"
        WHERE ir."employeeId" = ${employeeId}
        ORDER BY ir."createdAt" DESC
      `;
      requests = results.map(r => ({
        id: Number(r.id),
        requestId: r.requestId,
        employeeId: r.employeeId,
        amountRequested: Number(r.amountRequested) || 0,
        approvedAmount: r.approvedAmount != null ? Number(r.approvedAmount) : null,
        requiredDate: r.requiredDate,
        purpose: r.purpose,
        projectSite: r.projectSite,
        imprestHead: r.imprestHead,
        status: r.status,
        createdAt: r.createdAt,
        employee: { name: r.emp_name, empId: r.emp_code, department: r.emp_dept }
      }));

    } else {
      // Admin: fetch all, optionally filtered by status
      let results;
      if (status === 'ALL_PENDING') {
        results = await prisma.$queryRaw`
            SELECT ir.id, ir."requestId", ir."employeeId",
                   ir."amountRequested"::float, ir."approvedAmount"::float, ir."issuedAmount"::float,
                   ir."paymentMode", ir."requiredDate", ir.purpose, ir."projectSite",
                   ir."imprestHead", ir.status, ir."settledStatus", ir."createdAt",
                   e.name AS emp_name, e."empId" AS emp_code, e.department AS emp_dept,
                   sup.name AS supervisor_name
            FROM "ImprestRequest" ir
            LEFT JOIN "Employee" e ON e.id = ir."employeeId"
            LEFT JOIN "Employee" sup ON sup.id = e."supervisorId"
            WHERE ir.status LIKE 'PENDING_%'
            ORDER BY ir."createdAt" DESC`;
      } else if (status) {
        results = await prisma.$queryRaw`
            SELECT ir.id, ir."requestId", ir."employeeId",
                   ir."amountRequested"::float, ir."approvedAmount"::float, ir."issuedAmount"::float,
                   ir."paymentMode", ir."requiredDate", ir.purpose, ir."projectSite",
                   ir."imprestHead", ir.status, ir."settledStatus", ir."createdAt",
                   e.name AS emp_name, e."empId" AS emp_code, e.department AS emp_dept,
                   sup.name AS supervisor_name
            FROM "ImprestRequest" ir
            LEFT JOIN "Employee" e ON e.id = ir."employeeId"
            LEFT JOIN "Employee" sup ON sup.id = e."supervisorId"
            WHERE ir.status = ${status}
            ORDER BY ir."createdAt" DESC`;
      } else if (settledStatus) {
        results = await prisma.$queryRaw`
            SELECT ir.id, ir."requestId", ir."employeeId",
                   ir."amountRequested"::float, ir."approvedAmount"::float, ir."issuedAmount"::float,
                   ir."paymentMode", ir."requiredDate", ir.purpose, ir."projectSite",
                   ir."imprestHead", ir.status, ir."settledStatus", ir."createdAt",
                   e.name AS emp_name, e."empId" AS emp_code, e.department AS emp_dept,
                   sup.name AS supervisor_name
            FROM "ImprestRequest" ir
            LEFT JOIN "Employee" e ON e.id = ir."employeeId"
            LEFT JOIN "Employee" sup ON sup.id = e."supervisorId"
            WHERE ir."settledStatus" = ${settledStatus}
            ORDER BY ir."createdAt" DESC`;
      } else {
        results = await prisma.$queryRaw`
            SELECT ir.id, ir."requestId", ir."employeeId",
                   ir."amountRequested"::float, ir."approvedAmount"::float, ir."issuedAmount"::float,
                   ir."paymentMode", ir."requiredDate", ir.purpose, ir."projectSite",
                   ir."imprestHead", ir.status, ir."settledStatus", ir."createdAt",
                   e.name AS emp_name, e."empId" AS emp_code, e.department AS emp_dept,
                   sup.name AS supervisor_name
            FROM "ImprestRequest" ir
            LEFT JOIN "Employee" e ON e.id = ir."employeeId"
            LEFT JOIN "Employee" sup ON sup.id = e."supervisorId"
            ORDER BY ir."createdAt" DESC`;
      }

      // Fetch workflow config to resolve names for non-supervisor pending statuses
      const wfRows = await prisma.$queryRaw`SELECT * FROM "ImprestWorkflowConfig" WHERE id = 1`;
      const wf = wfRows[0] || {};
      
      let projectsHeadName = 'Raj Kumar';
      let projectsHeadName2 = 'Sanjay Arora';
      let accountsName = 'Accounts';
      
      if (wf.projectsHeadId) {
        const ph = await prisma.$queryRaw`SELECT name FROM "Employee" WHERE id = ${wf.projectsHeadId}`;
        if (ph[0]) projectsHeadName = ph[0].name;
      }
      if (wf.projectsHeadId2) {
        const ph2 = await prisma.$queryRaw`SELECT name FROM "Employee" WHERE id = ${wf.projectsHeadId2}`;
        if (ph2[0]) projectsHeadName2 = ph2[0].name;
      }
      if (wf.accountsId) {
        const acc = await prisma.$queryRaw`SELECT name FROM "Employee" WHERE id = ${wf.accountsId}`;
        if (acc[0]) accountsName = acc[0].name;
      }

      requests = results.map(r => {
        let currentApprover = 'Unknown';
        if (r.status === 'PENDING_SUPERVISOR') currentApprover = r.supervisor_name || 'Supervisor (Not Assigned)';
        else if (r.status === 'PENDING_ACCOUNTS') currentApprover = accountsName;
        else if (r.status === 'PENDING_PROJECTS_HEAD') currentApprover = projectsHeadName;
        else if (r.status === 'PENDING_PROJECTS_HEAD_2') currentApprover = projectsHeadName2;
        else if (r.status === 'APPROVED' || r.status === 'REJECTED') currentApprover = '-';

        return {
          id: Number(r.id),
          requestId: r.requestId,
          employeeId: r.employeeId,
          amountRequested: Number(r.amountRequested) || 0,
          approvedAmount: r.approvedAmount != null ? Number(r.approvedAmount) : null,
          issuedAmount: r.issuedAmount != null ? Number(r.issuedAmount) : null,
          paymentMode: r.paymentMode,
          requiredDate: r.requiredDate,
          purpose: r.purpose,
          projectSite: r.projectSite,
          imprestHead: r.imprestHead,
          imprestType: r.imprestType,
          status: r.status,
          settledStatus: r.settledStatus,
          createdAt: r.createdAt,
          employee: { name: r.emp_name, empId: r.emp_code, department: r.emp_dept },
          currentApprover
        };
      });
    }

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching Imprest Requests:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch requests' }, { status: 500 });
  }
}

// ─── PUT: Approve / Reject / Return / Issue / Settle ────────────────────────
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, action, ...updateData } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    const safeAction = action.toLowerCase();
    const reqId = parseInt(id);

    if (safeAction === 'approve') {
      // Flow: Supervisor → Accounts → Raj (PH1) → Sanjay (PH2) → APPROVED
      const flow = ['PENDING_SUPERVISOR', 'PENDING_ACCOUNTS', 'PENDING_PROJECTS_HEAD', 'PENDING_PROJECTS_HEAD_2', 'APPROVED'];
      let nextStatus = updateData.status;
      if (!nextStatus && updateData.currentStatus) {
        const idx = flow.indexOf(updateData.currentStatus);
        nextStatus = idx !== -1 && idx < flow.length - 1 ? flow[idx + 1] : 'APPROVED';
      }
      nextStatus = nextStatus || 'APPROVED';

      const approvedAmount = updateData.approvedAmount ? parseFloat(updateData.approvedAmount) : null;
      const approverId = updateData.approverId || null;
      const remarks = updateData.remarks || null;
      const approvalDate = new Date();

      if (approvedAmount !== null) {
        await prisma.$queryRaw`
          UPDATE "ImprestRequest"
          SET status = ${nextStatus}, "approvedAmount" = ${approvedAmount},
              "approverId" = ${approverId}, "approvalDate" = ${approvalDate},
              remarks = ${remarks}, "updatedAt" = NOW()
          WHERE id = ${reqId}
        `;
      } else {
        await prisma.$queryRaw`
          UPDATE "ImprestRequest"
          SET status = ${nextStatus}, "approverId" = ${approverId},
              "approvalDate" = ${approvalDate}, remarks = ${remarks}, "updatedAt" = NOW()
          WHERE id = ${reqId}
        `;
      }

    } else if (safeAction === 'reject') {
      const remarks = updateData.remarks || null;
      await prisma.$queryRaw`
        UPDATE "ImprestRequest"
        SET status = 'REJECTED', remarks = ${remarks}, "updatedAt" = NOW()
        WHERE id = ${reqId}
      `;

    } else if (safeAction === 'return') {
      const remarks = updateData.remarks || null;
      await prisma.$queryRaw`
        UPDATE "ImprestRequest"
        SET status = 'RETURNED', remarks = ${remarks}, "updatedAt" = NOW()
        WHERE id = ${reqId}
      `;

    } else if (safeAction === 'issue') {
      const issuedAmount = parseFloat(updateData.issuedAmount || 0);
      const paymentMode = updateData.paymentMode || null;
      const transactionRef = updateData.transactionRef || null;
      const issueDate = updateData.issueDate ? new Date(updateData.issueDate) : new Date();
      await prisma.$queryRaw`
        UPDATE "ImprestRequest"
        SET status = 'ISSUED', "issuedAmount" = ${issuedAmount},
            "paymentMode" = ${paymentMode}, "transactionRef" = ${transactionRef},
            "issueDate" = ${issueDate}, "updatedAt" = NOW()
        WHERE id = ${reqId}
      `;

    } else if (safeAction === 'settle') {
      const settledStatus = updateData.settledStatus || 'SETTLED';
      const settlementDate = new Date();
      await prisma.$queryRaw`
        UPDATE "ImprestRequest"
        SET "settledStatus" = ${settledStatus}, "settlementDate" = ${settlementDate}, "updatedAt" = NOW()
        WHERE id = ${reqId}
      `;

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Return updated record
    const updated = await prisma.$queryRaw`SELECT * FROM "ImprestRequest" WHERE id = ${reqId}`;
    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('Error updating Imprest Request:', error);
    return NextResponse.json({ error: error.message || 'Failed to update request' }, { status: 500 });
  }
}
