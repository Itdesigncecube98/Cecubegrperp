import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch contract & scope for a project
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // TODO: Fetch from database when schema is ready
    // For now, return empty structure
    return NextResponse.json({
      woLoaNo: '',
      contractValue: '',
      scopeNotes: '',
      inclusions: '',
      exclusions: '',
      boqLocked: false,
      activities: []
    });

  } catch (error) {
    console.error('Error fetching scope:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Save contract & scope for a project
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const { woLoaNo, contractValue, scopeNotes, inclusions, exclusions, boqLocked, activities } = body;

    // TODO: Save to database when schema is ready
    // For now, just return success
    console.log('Saving scope for project:', id, body);

    return NextResponse.json({ 
      success: true,
      message: 'Contract & Scope saved successfully',
      data: body
    });

  } catch (error) {
    console.error('Error saving scope:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
