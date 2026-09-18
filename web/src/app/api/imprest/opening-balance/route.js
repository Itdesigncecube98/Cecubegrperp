export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { amount, getLedger, postJournal } from '@/lib/accounting';

// Ensure table exists
async function ensureTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "ImprestOpeningBalance" (
      id SERIAL PRIMARY KEY,
      "employeeId" TEXT NOT NULL,
      "openingBalance" FLOAT NOT NULL DEFAULT 0,
      "asOfDate" TEXT NOT NULL,
      "remarks" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE("employeeId")
    )
  `;
}

export async function GET(req) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    let rows;
    if (employeeId) {
      rows = await prisma.$queryRaw`
        SELECT ob.*, e.name AS emp_name, e."empId" AS emp_code, e.department AS emp_dept
        FROM "ImprestOpeningBalance" ob
        LEFT JOIN "Employee" e ON e.id = ob."employeeId"
        WHERE ob."employeeId" = ${employeeId}
      `;
    } else {
      rows = await prisma.$queryRaw`
        SELECT ob.id, ob."employeeId", ob."openingBalance"::float AS "openingBalance",
               ob."asOfDate", ob.remarks, ob."createdAt",
               e.name AS emp_name, e."empId" AS emp_code, e.department AS emp_dept,
               e.branch AS emp_branch
        FROM "ImprestOpeningBalance" ob
        LEFT JOIN "Employee" e ON e.id = ob."employeeId"
        ORDER BY e.name ASC
      `;
    }

    const result = rows.map(r => ({
      id: Number(r.id),
      employeeId: r.employeeId,
      openingBalance: Number(r.openingBalance) || 0,
      asOfDate: r.asOfDate,
      remarks: r.remarks,
      createdAt: r.createdAt,
      employee: {
        name: r.emp_name,
        empId: r.emp_code,
        department: r.emp_dept,
        branch: r.emp_branch,
      }
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Opening balance GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureTable();
    const { employeeId, openingBalance, asOfDate, remarks } = await req.json();

    if (!employeeId || openingBalance == null) {
      return NextResponse.json({ error: 'employeeId and openingBalance are required' }, { status: 400 });
    }

    const bal = parseFloat(openingBalance) || 0;
    const date = asOfDate || new Date().toISOString().split('T')[0];
    const rem = remarks || null;

    // Upsert
    const result = await prisma.$queryRaw`
      INSERT INTO "ImprestOpeningBalance" ("employeeId", "openingBalance", "asOfDate", "remarks", "createdAt", "updatedAt")
      VALUES (${employeeId}, ${bal}, ${date}, ${rem}, NOW(), NOW())
      ON CONFLICT ("employeeId")
      DO UPDATE SET "openingBalance" = ${bal}, "asOfDate" = ${date}, "remarks" = ${rem}, "updatedAt" = NOW()
      RETURNING id, "employeeId", "openingBalance"::float, "asOfDate", remarks, "createdAt"
    `;

    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true } });
    if (employee && bal > 0) {
      await prisma.$transaction(async (tx) => {
        await getLedger(tx, 'Opening Balance Equity', 'Capital');
        await postJournal(tx, {
          voucherNo: `IMPREST-OPENING-${employeeId}`,
          type: 'JV',
          narration: `Imprest opening balance for ${employee.name}`,
          entries: [
            { ledger: `Imprest Opening Balance - ${employee.name}`, ledgerType: 'Asset', type: 'Dr', amount: amount(bal) },
            { ledger: 'Opening Balance Equity', ledgerType: 'Capital', type: 'Cr', amount: amount(bal) }
          ]
        });
      }, { timeout: 30000 });
    }

    return NextResponse.json({ ...result[0], openingBalance: Number(result[0].openingBalance) }, { status: 201 });
  } catch (error) {
    console.error('Opening balance POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await prisma.$queryRaw`DELETE FROM "ImprestOpeningBalance" WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
