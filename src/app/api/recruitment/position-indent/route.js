export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const branch = searchParams.get('branch');
    const position = searchParams.get('position');
    const status = searchParams.get('status');
    const raiseBy = searchParams.get('raiseBy');
    // Add additional filters if needed

    const where = {};
    if (company && company !== 'All' && company !== 'Select All' && company !== '10 all selected!') where.company = company;
    if (branch && branch !== 'All' && branch !== 'Select All' && branch !== '5 all selected!') where.branch = branch;
    if (position && position !== 'All' && position !== 'Select') where.positionName = { contains: position, mode: 'insensitive' };
    if (status && status !== 'All') where.status = status;
    if (raiseBy && raiseBy !== 'Select') where.raisedBy = raiseBy;

    const indents = await prisma.positionIndent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(indents);
  } catch (error) {
    console.error('Error fetching position indents:', error);
    return NextResponse.json({ error: 'Failed to fetch position indents' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    if (!data.positionName || !data.department || !data.raisedBy) {
      return NextResponse.json({ error: 'Position, Department, and Raised By are required' }, { status: 400 });
    }

    const newIndent = await prisma.positionIndent.create({
      data: {
        positionName: data.positionName,
        department: data.department,
        raisedBy: data.raisedBy,
        raisedDate: data.raisedDate || new Date().toISOString().split('T')[0],
        empType: data.empType || 'Full-time',
        indentType: data.indentType || 'New Requirement',
        replacementFor: data.indentType === 'Replacement' && data.replacementFor !== 'Select' ? data.replacementFor : null,
        reqFromDate: data.reqFromDate || null,
        status: data.status || 'pending',
        company: data.company || null,
        branch: data.branch || null,
      },
    });

    return NextResponse.json(newIndent, { status: 201 });
  } catch (error) {
    console.error('Error creating position indent:', error);
    return NextResponse.json({ error: 'Failed to create position indent' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    let updateFields;
    if (updateData.status !== undefined) {
      const allowedStatuses = ['pending', 'in progress', 'approved', 'rejected'];
      const status = String(updateData.status).trim().toLowerCase();
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid requirement status' }, { status: 400 });
      }
      updateFields = { status };
    } else {
      updateFields = {
        positionName: updateData.positionName,
        department: updateData.department,
        raisedBy: updateData.raisedBy,
        raisedDate: updateData.raisedDate,
        empType: updateData.empType,
        indentType: updateData.indentType,
        replacementFor: updateData.indentType === 'Replacement' && updateData.replacementFor !== 'Select' ? updateData.replacementFor : null,
        reqFromDate: updateData.reqFromDate,
      };
    }

    const outcome = await prisma.$transaction(async transaction => {
      const current = await transaction.positionIndent.findUnique({ where: { id } });
      if (!current) return { kind: 'not-found' };
      if (String(current.status).trim().toLowerCase() === 'approved') return { kind: 'approved' };

      const result = await transaction.positionIndent.updateMany({
        where: { id, status: current.status },
        data: updateFields,
      });
      if (result.count !== 1) {
        const latest = await transaction.positionIndent.findUnique({ where: { id } });
        return {
          kind: latest && String(latest.status).trim().toLowerCase() === 'approved' ? 'approved' : 'conflict',
        };
      }

      return {
        kind: 'updated',
        indent: await transaction.positionIndent.findUnique({ where: { id } }),
      };
    });

    if (outcome.kind === 'not-found') return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    if (outcome.kind === 'approved') return NextResponse.json({ error: 'Approved requirements cannot be changed' }, { status: 409 });
    if (outcome.kind === 'conflict') return NextResponse.json({ error: 'Requirement changed while saving. Refresh and try again.' }, { status: 409 });
    return NextResponse.json(outcome.indent);
  } catch (error) {
    console.error('Error updating position indent:', error);
    return NextResponse.json({ error: 'Failed to update position indent' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const outcome = await prisma.$transaction(async transaction => {
      const current = await transaction.positionIndent.findUnique({ where: { id } });
      if (!current) return 'not-found';
      if (String(current.status).trim().toLowerCase() === 'approved') return 'approved';

      const result = await transaction.positionIndent.deleteMany({
        where: { id, status: current.status },
      });
      if (result.count === 1) return 'deleted';

      const latest = await transaction.positionIndent.findUnique({ where: { id } });
      return latest && String(latest.status).trim().toLowerCase() === 'approved' ? 'approved' : 'conflict';
    });

    if (outcome === 'not-found') return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    if (outcome === 'approved') return NextResponse.json({ error: 'Approved requirements cannot be deleted' }, { status: 409 });
    if (outcome === 'conflict') return NextResponse.json({ error: 'Requirement changed while deleting. Refresh and try again.' }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting position indent:', error);
    return NextResponse.json({ error: 'Failed to delete position indent' }, { status: 500 });
  }
}
