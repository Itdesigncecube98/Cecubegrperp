export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const groupTypes = new Set(['Asset', 'Liability', 'Expense', 'Income', 'Capital']);

export async function GET() {
  try {
    const groups = await prisma.accountsAccountGroup.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true, type: true } },
        _count: { select: { ledgers: true, subgroups: true } },
      },
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Accounts groups fetch failed:', error);
    return NextResponse.json({ error: 'Unable to load account groups.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

    let parentId = body.parentId || null;
    let type = String(body.type || 'Asset');
    if (parentId) {
      const parent = await prisma.accountsAccountGroup.findUnique({ where: { id: parentId } });
      if (!parent) return NextResponse.json({ error: 'Parent group not found.' }, { status: 404 });
      type = parent.type;
    } else if (!groupTypes.has(type)) {
      return NextResponse.json({ error: 'Choose a valid account group type.' }, { status: 400 });
    }

    const group = await prisma.accountsAccountGroup.create({
      data: { name, type, parentId, description: String(body.description || '').trim() || null },
    });
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    const duplicate = error?.code === 'P2002';
    return NextResponse.json({ error: duplicate ? 'That group name already exists.' : (error.message || 'Unable to create group.') }, { status: duplicate ? 409 : 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const id = String(body.id || '');
    const name = String(body.name || '').trim();
    if (!id || !name) return NextResponse.json({ error: 'Group ID and name are required.' }, { status: 400 });
    const group = await prisma.accountsAccountGroup.update({
      where: { id },
      data: { name, description: String(body.description || '').trim() || null },
    });
    return NextResponse.json(group);
  } catch (error) {
    return NextResponse.json({ error: error?.code === 'P2002' ? 'That group name already exists.' : (error.message || 'Unable to update group.') }, { status: error?.code === 'P2002' ? 409 : 500 });
  }
}

export async function DELETE(request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Group ID is required.' }, { status: 400 });
    const group = await prisma.accountsAccountGroup.findUnique({
      where: { id },
      include: { _count: { select: { ledgers: true, subgroups: true } } },
    });
    if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
    if (group._count.ledgers || group._count.subgroups) {
      return NextResponse.json({ error: 'Move or remove its contractors and subgroups before deleting this group.' }, { status: 409 });
    }
    await prisma.accountsAccountGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Accounts group delete failed:', error);
    return NextResponse.json({ error: 'Unable to delete group.' }, { status: 500 });
  }
}
