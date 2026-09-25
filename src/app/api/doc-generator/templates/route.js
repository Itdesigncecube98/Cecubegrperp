import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const templates = await prisma.documentTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching document templates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Support batch insert for seeding
    if (Array.isArray(data)) {
      const created = await prisma.documentTemplate.createMany({
        data: data.map(d => ({
          id: d.id, // Usually allow Prisma to auto-generate, but keeping id for seeded templates
          formName: d.formName,
          description: d.description || '',
          fields: d.fields || [],
          tableColumns: d.tableColumns || []
        }))
      });
      return NextResponse.json(created);
    }

    // Single insert
    const template = await prisma.documentTemplate.create({
      data: {
        formName: data.formName,
        description: data.description || '',
        fields: data.fields || [],
        tableColumns: data.tableColumns || []
      }
    });
    
    return NextResponse.json(template);
  } catch (error) {
    console.error('Error creating document template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
