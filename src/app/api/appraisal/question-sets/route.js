export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const questionSets = await prisma.appraisalQuestionSet.findMany({
      include: {
        questions: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return NextResponse.json(questionSets);
  } catch (error) {
    console.error('Error fetching question sets:', error);
    return NextResponse.json({ error: 'Failed to fetch question sets' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    // Basic validation
    if (!data.name) {
      return NextResponse.json({ error: 'Question set name is required' }, { status: 400 });
    }

    const newQuestionSet = await prisma.appraisalQuestionSet.create({
      data: {
        name: data.name,
      },
      include: {
        questions: true,
      },
    });

    return NextResponse.json(newQuestionSet, { status: 201 });
  } catch (error) {
    console.error('Error creating question set:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Question set with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create question set' }, { status: 500 });
  }
}
