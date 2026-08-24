import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const candidates = await prisma.candidate.findMany({
      include: { orgChartNode: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(candidates);
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const candidate = await prisma.candidate.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        appliedFor: data.appliedFor || null,
        department: data.department || null,
        status: data.status || 'PENDING',
        notes: data.notes || null,
      }
    });
    return NextResponse.json(candidate, { status: 201 });
  } catch (error) {
    console.error("Error creating candidate:", error);
    return NextResponse.json({ error: "Failed to create candidate" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    if (!id) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
    }

    const candidate = await prisma.candidate.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json(candidate);
  } catch (error) {
    console.error("Error updating candidate:", error);
    return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
    }

    await prisma.candidate.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Candidate deleted successfully" });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    return NextResponse.json({ error: "Failed to delete candidate" }, { status: 500 });
  }
}
