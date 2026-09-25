import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { numberToWords } from "@/lib/numberToWords";

// GET /api/purchase-orders?companyId=&status=&fromDate=&toDate=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const status = searchParams.get("status");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const search = searchParams.get("search");

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const where = {
      companyId,
      ...(status ? { status } : {}),
      ...(fromDate && toDate
        ? { poDate: { gte: new Date(fromDate), lte: new Date(toDate) } }
        : {}),
      ...(search
        ? {
            OR: [
              { poNumber: { contains: search, mode: "insensitive" } },
              { supplierName: { contains: search, mode: "insensitive" } },
              { projectName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: true,
        _count: {
          select: { items: true, grns: true },
        },
      },
      orderBy: { poDate: "desc" },
    });

    return NextResponse.json({ data: pos, count: pos.length });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
  }
}

// POST /api/purchase-orders
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      companyId,
      supplierName,
      supplierAddress,
      supplierContact,
      supplierPhone,
      supplierEmail,
      supplierGstin,
      supplierPan,
      deliveryAddress,
      deliveryContact,
      deliveryPhone,
      deliveryGstin,
      deliveryDate,
      projectName,
      items,
      scopeOfWork,
      measurementTerms,
      paymentTerms,
      qualityTerms,
      deliverySchedule,
      loadingCharges,
      freightInsurance,
      liquidatedDamages,
      jurisdiction,
      otherTerms,
      preparedBy,
      preparedByName,
    } = body;

    if (!companyId || !supplierName || !supplierAddress || !deliveryAddress || !items || items.length === 0) {
      return NextResponse.json(
        { error: "companyId, supplierName, supplierAddress, deliveryAddress, and items are required" },
        { status: 400 }
      );
    }

    // Generate PO Number (format: PO2026, PO2027, etc.)
    const lastPO = await prisma.purchaseOrder.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    const lastNumber = lastPO?.poNumber.match(/\d+$/)?.[0] || "2025";
    const poNumber = `PO${String(Number(lastNumber) + 1)}`;

    // Calculate totals
    let subTotal = 0;
    let totalTaxAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const processedItems = items.map((item, index) => {
      const taxableAmount = item.quantity * item.rate * (1 - (item.discountPercent || 0) / 100);
      const gstAmount = taxableAmount * (item.gstPercent / 100);
      const totalAmount = taxableAmount + gstAmount;

      subTotal += taxableAmount;
      totalTaxAmount += gstAmount;

      // Determine if inter-state or intra-state based on GSTIN
      const companyGSTState = companyId?.substring(0, 2);
      const supplierGSTState = supplierGstin?.substring(0, 2);
      const isInterState = supplierGstin && companyGSTState !== supplierGSTState;
      
      if (isInterState) {
        igstAmount += gstAmount;
      } else {
        cgstAmount += gstAmount / 2;
        sgstAmount += gstAmount / 2;
      }

      return {
        sNo: index + 1,
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        discountPercent: item.discountPercent || 0,
        taxableAmount,
        gstPercent: item.gstPercent,
        gstAmount,
        totalAmount,
        pendingQty: item.quantity,
        specifications: item.specifications,
        remarks: item.remarks,
      };
    });

    const totalAmount = subTotal + totalTaxAmount;
    const roundOff = Math.round(totalAmount) - totalAmount;
    const finalAmount = Math.round(totalAmount);

    // Convert amount to words
    const totalAmountWords = numberToWords(finalAmount);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        companyId,
        supplierName,
        supplierAddress,
        supplierContact,
        supplierPhone,
        supplierEmail,
        supplierGstin,
        supplierPan,
        deliveryAddress,
        deliveryContact,
        deliveryPhone,
        deliveryGstin,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        projectName,
        subTotal,
        cgstPercent: cgstAmount > 0 ? 9 : 0,
        cgstAmount,
        sgstPercent: sgstAmount > 0 ? 9 : 0,
        sgstAmount,
        igstPercent: igstAmount > 0 ? 18 : 0,
        igstAmount,
        totalTaxAmount,
        roundOff,
        totalAmount: finalAmount,
        totalAmountWords,
        scopeOfWork,
        measurementTerms,
        paymentTerms,
        qualityTerms,
        deliverySchedule,
        loadingCharges,
        freightInsurance,
        liquidatedDamages,
        jurisdiction,
        otherTerms,
        preparedBy,
        preparedByName: preparedByName || "Purchase Manager",
        status: "DRAFT",
        items: {
          create: processedItems,
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ data: po }, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
}
