export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const proposal = await prisma.marketingProposal.update({
      where: { id },
      data: {
        estimatedCost: body.estimatedCost !== undefined ? parseFloat(body.estimatedCost) : undefined,
        quotedAmount: body.quotedAmount !== undefined ? parseFloat(body.quotedAmount) : undefined,
        margin: body.margin !== undefined ? parseFloat(body.margin) : undefined,
        discount: body.discount !== undefined ? parseFloat(body.discount) : undefined,
        finalAmount: body.finalAmount !== undefined ? parseFloat(body.finalAmount) : undefined,
        paymentTerms: body.paymentTerms,
        deliveryTerms: body.deliveryTerms,
        validity: body.validity ? new Date(body.validity) : undefined,
        status: body.status
      }
    });

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json({ error: error.message || 'Failed to update proposal' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await prisma.marketingProposal.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Proposal deleted successfully' });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
  }
}
