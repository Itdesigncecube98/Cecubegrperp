import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /api/admin/company-setup ─────────────────────────────────────────────
// Returns all companies with user counts and license info
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status ? { status } : {};

    const companies = await prisma.company.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Enrich with user count per company
    const enriched = await Promise.all(
      companies.map(async (co) => {
        const [userCount, licenseCount] = await Promise.all([
          prisma.systemUser.count({ where: { companyId: co.id, status: { not: 'Deleted' } } }),
          prisma.licenseKey.count({ where: { companyId: co.id, isActive: true } }),
        ]);
        return { ...co, userCount, licenseCount };
      }),
    );

    return NextResponse.json({ data: enriched });
  } catch (err) {
    console.error('[GET /api/admin/company-setup]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/admin/company-setup ────────────────────────────────────────────
// Body: { name, code?, type?, status?, ...extras, createdBy? }
export async function POST(request) {
  try {
    const body = await request.json();
    const { createdBy, ...companyData } = body;

    if (!companyData.name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const company = await prisma.company.create({ data: companyData });

    await prisma.auditLog.create({
      data: {
        userId: createdBy,
        module: 'Admin',
        subModule: 'Company Setup',
        action: 'CREATE',
        entityType: 'Company',
        entityId: company.id,
        newValues: JSON.stringify(companyData),
        status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ data: company }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/company-setup]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/admin/company-setup ──────────────────────────────────────────
// Body: { id, ...updateData, updatedBy? }
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, updatedBy, ...updateData } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const old = await prisma.company.findUnique({ where: { id } });

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: updatedBy,
        module: 'Admin',
        subModule: 'Company Setup',
        action: 'UPDATE',
        entityType: 'Company',
        entityId: id,
        oldValues: JSON.stringify(old),
        newValues: JSON.stringify(updateData),
        status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ data: company });
  } catch (err) {
    console.error('[PATCH /api/admin/company-setup]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE /api/admin/company-setup ─────────────────────────────────────────
// Soft-delete (set status = 'Inactive')
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deletedBy = searchParams.get('deletedBy');

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const userCount = await prisma.systemUser.count({
      where: { companyId: id, status: 'Active' },
    });
    if (userCount > 0) {
      return NextResponse.json(
        { error: `Cannot deactivate: ${userCount} active user(s) still assigned to this company.` },
        { status: 409 },
      );
    }

    const company = await prisma.company.update({
      where: { id },
      data: { status: 'Inactive' },
    });

    await prisma.auditLog.create({
      data: {
        userId: deletedBy,
        module: 'Admin',
        subModule: 'Company Setup',
        action: 'DELETE',
        entityType: 'Company',
        entityId: id,
        status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ data: company });
  } catch (err) {
    console.error('[DELETE /api/admin/company-setup]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
