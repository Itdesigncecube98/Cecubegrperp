import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    const bill = await prisma.purchaseBill.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            lineItems: true,
            raisedBy: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        vendor: true,
        tdsEntries: true
      }
    });

    if (!bill) {
      return NextResponse.json({ error: 'Purchase bill not found' }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error('Error fetching purchase bill:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase bill' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const {
      status,
      paidAmount,
      paymentMode,
      paymentDate,
      paymentRef,
      transactionId,
      remarks
    } = body;

    const updateData = {};
    if (status) updateData.status = status;
    if (paidAmount !== undefined) updateData.paidAmount = parseFloat(paidAmount);
    if (paymentMode) updateData.paymentMode = paymentMode;
    if (paymentDate) updateData.paymentDate = paymentDate;
    if (paymentRef) updateData.paymentRef = paymentRef;
    if (transactionId) updateData.transactionId = transactionId;
    if (remarks !== undefined) updateData.remarks = remarks;

    const bill = await prisma.purchaseBill.update({
      where: { id },
      data: updateData,
      include: {
        purchaseOrder: {
          include: {
            lineItems: true
          }
        },
        vendor: true,
        tdsEntries: true
      }
    });

    // Auto-update status based on payment
    if (paidAmount !== undefined) {
      let newStatus = 'PENDING';
      if (bill.paidAmount >= bill.netPayable) {
        newStatus = 'PAID';
      } else if (bill.paidAmount > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      if (newStatus !== bill.status) {
        await prisma.purchaseBill.update({
          where: { id },
          data: { status: newStatus }
        });
      }

      // Update PO paid amount
      const totalPaidForPO = await prisma.purchaseBill.aggregate({
        where: { purchaseOrderId: bill.purchaseOrderId },
        _sum: { paidAmount: true }
      });

      await prisma.purchaseOrder.update({
        where: { id: bill.purchaseOrderId },
        data: { paidAmount: totalPaidForPO._sum.paidAmount || 0 }
      });
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error('Error updating purchase bill:', error);
    return NextResponse.json({ error: 'Failed to update purchase bill' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);

    await prisma.purchaseBill.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Purchase bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase bill:', error);
    return NextResponse.json({ error: 'Failed to delete purchase bill' }, { status: 500 });
  }
}
