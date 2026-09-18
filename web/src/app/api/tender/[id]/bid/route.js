export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const bid = await prisma.tenderBid.upsert({
      where: { tenderId: id },
      update: {
        basicPrice: parseFloat(body.basicPrice) || 0,
        gstAmount: parseFloat(body.gstAmount) || 0,
        discount: parseFloat(body.discount) || 0,
        freight: parseFloat(body.freight) || 0,
        otherCharges: parseFloat(body.otherCharges) || 0,
        finalBidValue: parseFloat(body.finalBidValue) || 0,
        paymentTerms: body.paymentTerms,
        retention: body.retention,
        ld: body.ld,
        warranty: body.warranty,
        securityDeposit: body.securityDeposit,
        performanceBg: body.performanceBg,
        emd: body.emd
      },
      create: {
        tenderId: id,
        basicPrice: parseFloat(body.basicPrice) || 0,
        gstAmount: parseFloat(body.gstAmount) || 0,
        discount: parseFloat(body.discount) || 0,
        freight: parseFloat(body.freight) || 0,
        otherCharges: parseFloat(body.otherCharges) || 0,
        finalBidValue: parseFloat(body.finalBidValue) || 0,
        paymentTerms: body.paymentTerms,
        retention: body.retention,
        ld: body.ld,
        warranty: body.warranty,
        securityDeposit: body.securityDeposit,
        performanceBg: body.performanceBg,
        emd: body.emd
      }
    });

    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    console.error('Error saving bid:', error);
    return NextResponse.json({ error: error.message || 'Failed to save bid' }, { status: 500 });
  }
}
