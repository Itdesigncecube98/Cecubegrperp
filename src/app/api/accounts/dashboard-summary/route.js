import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const today     = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0, 7); // "YYYY-MM"
    const monthStart = `${thisMonth}-01`;

    const [
      // Expenses
      totalExpenses,
      pendingExpenses,
      expensesByStatus,
      monthExpensesAgg,

      // Invoices
      totalInvoices,
      overdueInvoices,
      invoicesByStatus,
      receivablesAgg,

      // Purchase Orders
      totalPOs,
      pendingPOs,
      poAgg,

      // Payroll
      payrollThisMonth,

      // Vendors
      activeVendors,

      // Budget
      budgetAgg,

      // Recent activity
      recentExpenses,
      recentInvoices,
      recentPOs,

      // Overdue invoices detail
      overdueInvoicesList
    ] = await Promise.all([
      prisma.expense.count(),
      prisma.expense.count({ where: { status: 'SUBMITTED' } }),
      prisma.expense.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true } }),
      prisma.expense.aggregate({
        where: { expenseDate: { gte: monthStart, lte: today } },
        _sum: { amount: true },
        _count: { _all: true }
      }),

      prisma.invoice.count(),
      prisma.invoice.count({ where: { dueDate: { lt: today }, status: { notIn: ['PAID', 'CANCELLED'] } } }),
      prisma.invoice.groupBy({ by: ['status'], _count: { _all: true }, _sum: { totalAmount: true, paidAmount: true } }),
      prisma.invoice.aggregate({
        where: { invoiceType: 'SALES', status: { notIn: ['CANCELLED'] } },
        _sum: { totalAmount: true, paidAmount: true }
      }),

      prisma.purchaseOrder.count(),
      prisma.purchaseOrder.count({ where: { status: { in: ['SUBMITTED'] } } }),
      prisma.purchaseOrder.aggregate({
        where: { status: { notIn: ['CANCELLED'] } },
        _sum: { totalAmount: true, paidAmount: true }
      }),

      prisma.payroll.aggregate({
        where: { payrollMonth: thisMonth },
        _sum: { grossSalary: true, netSalary: true, pf: true, esi: true, tds: true },
        _count: { _all: true }
      }),

      prisma.vendor.count({ where: { status: 'ACTIVE' } }),

      prisma.budgetAllocation.aggregate({
        _sum: { allocated: true, spent: true }
      }),

      prisma.expense.findMany({
        where: { status: 'SUBMITTED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { employee: { select: { id: true, name: true } } }
      }),

      prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { project: { select: { id: true, name: true } } }
      }),

      prisma.purchaseOrder.findMany({
        where: { status: { in: ['SUBMITTED', 'APPROVED'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { vendor: { select: { id: true, name: true } } }
      }),

      prisma.invoice.findMany({
        where: { dueDate: { lt: today }, status: { notIn: ['PAID', 'CANCELLED'] } },
        orderBy: { dueDate: 'asc' },
        take: 5,
        include: { project: { select: { id: true, name: true } } }
      })
    ]);

    const totalReceivable = (receivablesAgg._sum.totalAmount ?? 0) - (receivablesAgg._sum.paidAmount ?? 0);
    const totalPayable    = (poAgg._sum.totalAmount ?? 0) - (poAgg._sum.paidAmount ?? 0);

    return NextResponse.json({
      expenses: {
        total:        totalExpenses,
        pendingApproval: pendingExpenses,
        thisMonth:    { count: monthExpensesAgg._count._all, amount: monthExpensesAgg._sum.amount ?? 0 },
        byStatus:     expensesByStatus.map(s => ({
          status: s.status,
          count:  s._count._all,
          amount: s._sum.amount ?? 0
        }))
      },
      invoices: {
        total:        totalInvoices,
        overdue:      overdueInvoices,
        receivable:   Math.round(totalReceivable * 100) / 100,
        byStatus:     invoicesByStatus.map(s => ({
          status: s.status,
          count:  s._count._all,
          amount: s._sum.totalAmount ?? 0,
          paid:   s._sum.paidAmount  ?? 0
        }))
      },
      purchaseOrders: {
        total:        totalPOs,
        pendingApproval: pendingPOs,
        totalValue:   poAgg._sum.totalAmount  ?? 0,
        totalPayable: Math.round(totalPayable * 100) / 100
      },
      payroll: {
        thisMonth: {
          count:      payrollThisMonth._count._all,
          grossTotal: payrollThisMonth._sum.grossSalary ?? 0,
          netTotal:   payrollThisMonth._sum.netSalary   ?? 0,
          pfTotal:    payrollThisMonth._sum.pf          ?? 0,
          esiTotal:   payrollThisMonth._sum.esi         ?? 0,
          tdsTotal:   payrollThisMonth._sum.tds         ?? 0
        }
      },
      vendors: { active: activeVendors },
      budget: {
        totalAllocated: budgetAgg._sum.allocated ?? 0,
        totalSpent:     budgetAgg._sum.spent     ?? 0,
        remaining:      (budgetAgg._sum.allocated ?? 0) - (budgetAgg._sum.spent ?? 0)
      },
      recentExpenses,
      recentInvoices,
      recentPOs,
      overdueInvoicesList
    });
  } catch (error) {
    console.error('GET /api/accounts/dashboard-summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
