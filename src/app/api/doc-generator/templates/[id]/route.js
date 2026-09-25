import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    
    const template = await prisma.documentTemplate.update({
      where: { id },
      data: {
        formName: data.formName,
        description: data.description || '',
        fields: data.fields || [],
        tableColumns: data.tableColumns || []
      }
    });
    
    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating document template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await prisma.documentTemplate.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
