import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // 1. Get Opening Balance
    let openingBalance = 0;
    try {
      const obRows = await prisma.$queryRaw`SELECT "openingBalance"::float FROM "ImprestOpeningBalance" WHERE "employeeId" = ${employeeId}`;
      if (obRows && obRows.length > 0) {
        openingBalance = Number(obRows[0].openingBalance) || 0;
      }
    } catch (e) {
      // Table might not exist yet, that's fine
    }

    // 2. Get Total Requested Amount (Money committed when a request is created)
    // Deduct for any active request (not DRAFT, not REJECTED, not RETURNED)
    const requestedRows = await prisma.$queryRaw`
      SELECT SUM("amountRequested")::float as total_requested
      FROM "ImprestRequest"
      WHERE "employeeId" = ${employeeId}
        AND status NOT IN ('DRAFT', 'REJECTED', 'RETURNED')
    `;
    const totalRequested = Number(requestedRows?.[0]?.total_requested) || 0;

    // 3. Get Total Verified Expenses (Already settled — subtracted on top of the request)
    const expenseRows = await prisma.$queryRaw`
      SELECT SUM(e."billAmount")::float as total_expense
      FROM "ImprestExpense" e
      JOIN "ImprestRequest" r ON r.id = e."imprestRequestId"
      WHERE r."employeeId" = ${employeeId} AND e.status = 'VERIFIED'
    `;
    const totalExpense = Number(expenseRows?.[0]?.total_expense) || 0;

    // Balance = Opening - Requested (committed) - Verified Expenses
    const currentBalance = openingBalance - totalRequested - totalExpense;

    return NextResponse.json({
      employeeId,
      openingBalance,
      totalRequested,
      totalExpense,
      currentBalance
    });

  } catch (error) {
    console.error('Error calculating balance:', error);
    return NextResponse.json({ error: 'Failed to calculate balance' }, { status: 500 });
  }
}

