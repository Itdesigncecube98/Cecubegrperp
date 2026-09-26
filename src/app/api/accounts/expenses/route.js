import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

async function generateExpenseNumber() {
  const count = await prisma.expense.count();
  const num = String(count + 1).padStart(5, '0');
  const year = new Date().getFullYear();
  return `EXP-${year}-${num}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id          = searchParams.get('id');
    const employeeId  = searchParams.get('employeeId');
    const projectId   = searchParams.get('projectId');
    const status      = searchParams.get('status');
    const category    = searchParams.get('category');
    const startDate   = searchParams.get('startDate');
    const endDate     = searchParams.get('endDate');
    const approvedById = searchParams.get('approvedById');

    if (id) {
      const expense = await prisma.expense.findUnique({
        where: { id: parseInt(id) },
        include: {
          employee:      { select: { id: true, name: true, designation: true, department: true } },
          approvedBy:    { select: { id: true, name: true } },
          purchaseOrder: { select: { id: true, poNumber: true } }
        }
      });
      if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      return NextResponse.json(expense);
    }

    const where = {};
    if (employeeId)   where.employeeId   = employeeId;
    if (projectId)    where.projectId    = parseInt(projectId);
    if (status)       where.status       = status;
    if (category)     where.category     = category;
    if (approvedById) where.approvedById = approvedById;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = startDate;
      if (endDate)   where.expenseDate.lte = endDate;
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: {
        employee:   { select: { id: true, name: true, designation: true, department: true } },
        approvedBy: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('GET /api/accounts/expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      employeeId, projectId, purchaseOrderId, category,
      description, amount, currency, expenseDate,
      receiptData, receiptFileName, tripLogId, remarks
    } = data;

    if (!employeeId || !category || !description || !amount || !expenseDate) {
      return NextResponse.json(
        { error: 'employeeId, category, description, amount, and expenseDate are required' },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        expenseNumber:   await generateExpenseNumber(),
        employeeId,
        projectId:       projectId       ? parseInt(projectId) : null,
        purchaseOrderId: purchaseOrderId ? parseInt(purchaseOrderId) : null,
        category,
        description,
        amount:          parseFloat(amount),
        currency:        currency        || 'INR',
        expenseDate,
        receiptData:     receiptData     || null,
        receiptFileName: receiptFileName || null,
        tripLogId:       tripLogId       ? parseInt(tripLogId) : null,
        remarks:         remarks         || null,
        status:          'DRAFT'
      },
      include: {
        employee: { select: { id: true, name: true, designation: true } }
      }
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('POST /api/accounts/expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, action, approvedById, rejectionReason, paymentRef, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Expense id is required' }, { status: 400 });

    const expId = parseInt(id);

    if (action === 'SUBMIT') {
      const exp = await prisma.expense.update({
        where: { id: expId },
        data: { status: 'SUBMITTED', submittedAt: new Date() }
      });
      return NextResponse.json(exp);
    }

    if (action === 'APPROVE') {
      if (!approvedById) {
        return NextResponse.json({ error: 'approvedById is required to approve' }, { status: 400 });
      }
      const exp = await prisma.expense.update({
        where: { id: expId },
        data: {
          status:      'APPROVED',
          approvedById,
          approvedAt:  new Date()
        },
        include: {
          employee:   { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } }
        }
      });
      return NextResponse.json(exp);
    }

    if (action === 'REJECT') {
      const exp = await prisma.expense.update({
        where: { id: expId },
        data: {
          status:          'REJECTED',
          approvedById:    approvedById    || null,
          approvedAt:      new Date(),
          rejectionReason: rejectionReason || null
        }
      });
      return NextResponse.json(exp);
    }

    if (action === 'MARK_PAID') {
      const exp = await prisma.expense.update({
        where: { id: expId },
        data: {
          status:     'PAID',
          paidAt:     new Date(),
          paymentRef: paymentRef || null
        }
      });
      return NextResponse.json(exp);
    }

    if (action === 'CANCEL') {
      const exp = await prisma.expense.update({
        where: { id: expId },
        data: { status: 'CANCELLED' }
      });
      return NextResponse.json(exp);
    }

    if (updates.amount          !== undefined) updates.amount          = parseFloat(updates.amount);
    if (updates.projectId       !== undefined) updates.projectId       = updates.projectId ? parseInt(updates.projectId) : null;
    if (updates.purchaseOrderId !== undefined) updates.purchaseOrderId = updates.purchaseOrderId ? parseInt(updates.purchaseOrderId) : null;

    const exp = await prisma.expense.update({
      where: { id: expId },
      data: updates,
      include: {
        employee:   { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(exp);
  } catch (error) {
    console.error('PUT /api/accounts/expenses:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Expense id is required' }, { status: 400 });

    const expense = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

    if (!['DRAFT', 'REJECTED', 'CANCELLED'].includes(expense.status)) {
      return NextResponse.json(
        { error: 'Only DRAFT, REJECTED or CANCELLED expenses can be deleted' },
        { status: 400 }
      );
    }

    await prisma.expense.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/accounts/expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
