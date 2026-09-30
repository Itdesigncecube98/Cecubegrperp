import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import crypto from "crypto";

const MODULE_TOOLS = {
  Contracting: [
    "Contractor View", "Contractor Edit", "Contractor Delete",
    "Add Group", "Register Supplier to Group",
    "Insurance Policy Add", "Insurance Policy Detail",
    "Labour Master",
    "Requisition Generation", "Requisition Browse",
    "Labour Requisition Approve", "Labour Requisition wise WO Generation",
    "Raise Work Order", "Browse Work Order", "Labour Rate Master",
    "RA Bill Generation", "RA Bill Browse", "RA Bill Approval",
    "Enquiry Generation", "Enquiry Browse",
    "Quotation Entry", "Quotation Browse", "Quotation Compare",
  ],
  Engineering: [
    "Project View", "Project Edit", "Project Delete", "New Project",
    "Contract & Scope Save", "Lock Baseline",
    "Define WBS", "WBS Budget / Estimate Allocation",
    "Task Library Create", "Task Library Edit", "Task Library Delete",
    "Material Library Create", "Material Library Edit", "Material Library Delete",
    "Equipment Library Create", "Equipment Library Edit", "Equipment Library Delete",
    "Labour Library Create", "Labour Library Edit", "Labour Library Delete",
    "Unit Master Create", "Unit Master Edit", "Unit Master Delete",
    "Project Category 1 Create/Edit/Delete",
    "Project Category 2 Create/Edit/Delete",
  ],
  Purchase: [
    "Purchase Indent (PR) Create/View/Edit",
    "Vendor Master Create/View/Edit",
    "Enquiry Generation", "Enquiry Browse",
    "Quotation Entry", "Quotation Browse", "Quotation Compare",
    "Purchase Orders (PO)", "PO Material Browse", "Purchase Bills",
  ],
  Site: [
    "Site Dashboard",
    "DPR Create", "DPR View",
    "Work Completion — Log Qty",
    "Material Requisition Raise", "Material Requisition Edit", "Material Requisition Delete",
    "GTN View", "GTN Edit",
    "GRN View", "GRN Edit",
    "Site Store",
    "Task Status Change",
    "Quality Control View", "Quality Control Add",
    "Health & Safety View", "Health & Safety Add",
    "Raise NCR",
  ],
};

export async function POST(request) {
  const body = await request.json();
  if (body.action !== "seed") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  try {
    let seeded = 0;
    const validNames = [];

    for (const [module, names] of Object.entries(MODULE_TOOLS)) {
      for (const name of names) {
        validNames.push(name);
        const existing = await prisma.adminTool.findFirst({ where: { module, name } });
        if (existing) {
          await prisma.adminTool.update({
            where: { id: existing.id },
            data: { isActive: true, updatedAt: new Date() },
          });
        } else {
          await prisma.adminTool.create({
            data: {
              id: crypto.randomUUID(),
              module,
              name,
              isActive: true,
              updatedAt: new Date(),
            },
          });
          seeded++;
        }
      }
    }

    // Deactivate tools that are no longer in the canonical list (soft delete, keeps history)
    const stale = await prisma.adminTool.findMany({
      where: { name: { notIn: validNames } },
    });
    for (const s of stale) {
      await prisma.adminTool.update({
        where: { id: s.id },
        data: { isActive: false, updatedAt: new Date() },
      });
    }

    return NextResponse.json({ seeded, purged: stale.length });
  } catch (error) {
    console.error("Error seeding tools:", error);
    return NextResponse.json({ error: "Failed to seed tools" }, { status: 500 });
  }
}
