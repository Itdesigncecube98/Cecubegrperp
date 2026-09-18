export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req, { params }) {
  try {
    const { id: projectId } = params;

    // 1. Calculate Previous Certified
    // This is the sum of 'cumulative' from the latest RA bill, or sum of all netPayable? 
    // Usually Previous Certified is the 'Cumulative' of the previous RA bill.
    const lastRABill = await prisma.projectRABill.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
    
    const previousCertified = lastRABill ? lastRABill.cumulative : 0;

    // 2. Calculate Current Bill
    // The current bill is the sum of all Certified MBs. 
    // Actually, typically the "Cumulative" is the sum of ALL certified MBs since project start.
    // So let's just sum all Certified MBs for this project.
    const certifiedMBs = await prisma.projectMB.findMany({
      where: { projectId, status: 'Certified' },
      include: { items: true }
    });

    let totalCertifiedWork = 0;
    for (const mb of certifiedMBs) {
      const mbTotal = mb.items.reduce((sum, item) => sum + item.amount, 0);
      totalCertifiedWork += mbTotal;
    }

    // Cumulative Work Done = Total Certified Work
    // Current Bill = Cumulative Work Done - Previous Certified
    const cumulative = totalCertifiedWork;
    let currentBill = cumulative - previousCertified;
    if (currentBill < 0) currentBill = 0; // Edge case safeguard

    return NextResponse.json({
      previousCertified,
      currentBill,
      cumulative
    });

  } catch (error) {
    console.error('Error fetching RA stats:', error);
    return NextResponse.json({ error: 'Failed to fetch RA stats' }, { status: 500 });
  }
}
