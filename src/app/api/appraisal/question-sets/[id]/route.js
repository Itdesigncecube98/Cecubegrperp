export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();

    // Data should contain a list of questions to update/create
    const { name, questions } = data;

    if (!name) {
      return NextResponse.json({ error: 'Question set name is required' }, { status: 400 });
    }

    // Since we're dealing with a collection, the simplest approach is to update the set name,
    // delete all existing questions for this set, and recreate them.
    // Or, we can use a transaction to do this cleanly.

    const updatedQuestionSet = await prisma.$transaction(async (tx) => {
      // 1. Update the set name
      const set = await tx.appraisalQuestionSet.update({
        where: { id },
        data: { name },
      });

      // 2. Delete existing questions
      await tx.appraisalQuestion.deleteMany({
        where: { questionSetId: id },
      });

      // 3. Create new questions
      if (questions && questions.length > 0) {
        await tx.appraisalQuestion.createMany({
          data: questions.map((q) => ({
            questionSetId: id,
            question: q.question,
            grade: q.grade,
            type: q.type,
            objective: q.obj || q.objective || null, // Map obj -> objective if needed
            weightage: parseFloat(q.weightage),
          })),
        });
      }

      // 4. Return updated set with questions
      return tx.appraisalQuestionSet.findUnique({
        where: { id },
        include: { questions: true },
      });
    });

    return NextResponse.json(updatedQuestionSet);
  } catch (error) {
    console.error('Error updating question set:', error);
    if (error.code === 'P2025') {
       return NextResponse.json({ error: 'Question set not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update question set' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await prisma.appraisalQuestionSet.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Question set deleted successfully' });
  } catch (error) {
    console.error('Error deleting question set:', error);
    if (error.code === 'P2025') {
       return NextResponse.json({ error: 'Question set not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete question set' }, { status: 500 });
  }
}
