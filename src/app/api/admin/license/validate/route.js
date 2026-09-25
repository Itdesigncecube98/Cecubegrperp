import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /api/admin/license/validate?companyId=&userId= ──────────────────────
// Called at every login to check license validity
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const userId    = searchParams.get('userId');

    // Find active license for company (or global)
    const license = await prisma.licenseKey.findFirst({
      where: {
        isActive: true,
        OR: [
          { companyId },
          { companyId: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!license) {
      return NextResponse.json({
        valid: false,
        reason: 'NO_LICENSE',
        message: 'No active licence found. Please contact system administrator.',
      }, { status: 403 });
    }

    // Check expiry
    const now = new Date();
    if (license.expiresAt && now > license.expiresAt) {
      return NextResponse.json({
        valid: false,
        reason: 'EXPIRED',
        message: 'Licence expired. Please contact system administrator.',
        expiredAt: license.expiresAt,
      }, { status: 403 });
    }

    // Check user count
    if (userId && license.maxUsers) {
      const activeUserCount = await prisma.systemUser.count({
        where: { status: 'Active', companyId },
      });
      if (activeUserCount > license.maxUsers) {
        return NextResponse.json({
          valid: false,
          reason: 'USER_LIMIT_EXCEEDED',
          message: `User limit exceeded (${activeUserCount}/${license.maxUsers}).`,
        }, { status: 403 });
      }
    }

    // Compute expiry alert tier
    let alertTier = null;
    let remainingDays = null;
    if (license.expiresAt) {
      remainingDays = Math.ceil((license.expiresAt - now) / (1000 * 60 * 60 * 24));
      if (remainingDays <= 7)  alertTier = 'CRITICAL';
      else if (remainingDays <= 15) alertTier = 'WARNING';
      else if (remainingDays <= 30) alertTier = 'NOTICE';
    }

    // Get per-module rights
    const moduleRights = await prisma.licenseModuleRight.findMany({
      where: { licenseId: license.id },
    });

    const activeUserCount = await prisma.systemUser.count({
      where: { status: 'Active', ...(companyId ? { companyId } : {}) },
    });

    return NextResponse.json({
      valid: true,
      license: {
        id:           license.id,
        plan:         license.plan,
        maxUsers:     license.maxUsers,
        activeUsers:  activeUserCount,
        modules:      license.modules,
        expiresAt:    license.expiresAt,
        remainingDays,
        alertTier,
      },
      moduleRights: moduleRights.reduce((acc, m) => ({ ...acc, [m.module]: m.isEnabled }), {}),
    });
  } catch (err) {
    console.error('[GET /api/admin/license/validate]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
