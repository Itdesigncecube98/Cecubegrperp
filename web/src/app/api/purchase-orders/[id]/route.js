import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/purchase-orders/[id]
export async function GET(_request, { params }) {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        grns: {
          include: {
            items: true,
          },
        },
        vendorBills: true,
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    return NextResponse.json({ data: po });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return NextResponse.json({ error: "Failed to fetch purchase order" }, { status: 500 });
  }
}

// PUT /api/purchase-orders/[id]
export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const { status, approvedBy, approvedByName, ...updateData } = body;

    const updates = {
      ...updateData,
      ...(status ? { status } : {}),
      ...(approvedBy && status === "APPROVED"
        ? { approvedBy, approvedByName, approvedAt: new Date() }
        : {}),
    };

    const po = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: updates,
      include: {
        items: true,
      },
    });

    return NextResponse.json({ data: po });
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 });
  }
}

// DELETE /api/purchase-orders/[id]
export async function DELETE(_request, { params }) {
  try {
    // Check if PO has GRNs
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { _count: { select: { grns: true } } },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    if (po._count.grns > 0) {
      return NextResponse.json(
        { error: "Cannot delete PO with existing GRNs" },
        { status: 400 }
      );
    }

    if (po.status === "APPROVED" || po.status === "SENT") {
      return NextResponse.json(
        { error: "Cannot delete approved or sent PO" },
        { status: 400 }
      );
    }

    await prisma.purchaseOrder.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ data: { id: params.id, deleted: true } });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 });
  }
}
