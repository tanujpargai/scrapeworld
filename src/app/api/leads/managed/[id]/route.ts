import { NextRequest, NextResponse } from 'next/server';
import { leadManagementRepository } from '@/repositories/LeadManagementRepository';
import { ALL_LEAD_STATUSES, LeadStatus } from '@/types/leadManagement';

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
      lead,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.status) {
      if (!ALL_LEAD_STATUSES.includes(body.status as LeadStatus)) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid status '${body.status}'. Must be one of: ${ALL_LEAD_STATUSES.join(', ')}` 
          },
          { status: 400 }
        );
      }

      const updated = await leadManagementRepository.updateLeadStatus(id, body.status as LeadStatus);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Lead not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        lead: updated,
      });
    }

    // Generic update
    const lead = await leadManagementRepository.upsertLead({ ...body, id });
    return NextResponse.json({
      success: true,
      lead,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update lead' },
      { status: 500 }
    );
  }
}
