import { NextRequest, NextResponse } from 'next/server';
import { leadManagementRepository } from '@/repositories/LeadManagementRepository';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body || !body.content || !body.content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Note content cannot be empty' },
        { status: 400 }
      );
    }

    const note = await leadManagementRepository.addNote(
      id,
      body.content,
      body.author || 'User'
    );

    if (!note) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      note,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add note' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await leadManagementRepository.getLeadById(id);

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notes: lead.notes || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}
