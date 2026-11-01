export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Upsert BOQ item
    const boqItem = await prisma.tenderBOQItem.create({
      data: {
        tenderId: id,
        serialNo: body.serialNo,
        description: body.description,
        unit: body.unit,
        quantity: parseFloat(body.quantity) || 0,
        clientRate: parseFloat(body.clientRate) || 0,
        estimatedRate: parseFloat(body.estimatedRate) || 0,
        materials: [],
        labours: []
      }
    });

    return NextResponse.json(boqItem, { status: 201 });
  } catch (error) {
    console.error('Error creating BOQ item:', error);
    return NextResponse.json({ error: error.message || 'Failed to create BOQ item' }, { status: 500 });
  }
}

function validateResourceBundles(value, type) {
  if (!Array.isArray(value) || value.length > 100) {
    return { error: `${type} must be a list of no more than 100 resource bundles.` };
  }
  for (const [index, bundle] of value.entries()) {
    if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
      return { error: `${type} bundle ${index + 1} is invalid.` };
    }
    if (!String(bundle.name || '').trim() || !String(bundle.unit || '').trim()) {
      return { error: `${type} bundle ${index + 1} requires a name and unit.` };
    }
    if (!Number.isFinite(Number(bundle.quantity)) || Number(bundle.quantity) < 0 ||
        !Number.isFinite(Number(bundle.rate)) || Number(bundle.rate) < 0) {
      return { error: `${type} bundle ${index + 1} requires a non-negative quantity and rate.` };
    }
    if (!Array.isArray(bundle.components) || bundle.components.length > 500) {
      return { error: `${type} bundle ${index + 1} components are invalid.` };
    }
    if (bundle.components.some(component =>
      !component || typeof component !== 'object' || Array.isArray(component) ||
      !String(component.name || '').trim() ||
      !Number.isFinite(Number(component.quantity)) || Number(component.quantity) < 0
    )) {
      return { error: `${type} bundle ${index + 1} contains an invalid component.` };
    }
  }
  return { value };
}

export async function PUT(req, { params }) {
  try {
    const { id: tenderId } = await params;
    const body = await req.json();
    const itemId = typeof body.itemId === 'string' ? body.itemId : '';
    const resourceType = body.resourceType;
    const field = resourceType === 'Material' ? 'materials' : resourceType === 'Labour' ? 'labours' : null;
    if (!itemId || !field) {
      return NextResponse.json({ error: 'A BOQ item and valid resource type are required.' }, { status: 400 });
    }
    const validation = validateResourceBundles(body.resources, resourceType);
    if (validation.error) return NextResponse.json({ error: validation.error }, { status: 400 });

    const item = await prisma.tenderBOQItem.findFirst({
      where: { id: itemId, tenderId },
      select: { id: true },
    });
    if (!item) return NextResponse.json({ error: 'BOQ item not found for this tender.' }, { status: 404 });

    const updated = await prisma.tenderBOQItem.update({
      where: { id: itemId },
      data: { [field]: validation.value },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error saving tender BOQ resources:', error);
    return NextResponse.json({ error: error.message || 'Failed to save BOQ resources.' }, { status: 500 });
  }
}
