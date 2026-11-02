import { NextRequest, NextResponse } from 'next/server';
import { leadManagementRepository } from '@/repositories/LeadManagementRepository';
import type { LeadFilterOptions, LeadSortField, SortOrder, LeadStatus } from '@/types/leadManagement';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as LeadStatus | 'ALL' | null;
    const icp = searchParams.get('icp');
    const service = searchParams.get('service');
    const priority = searchParams.get('priority') as any;
    const search = searchParams.get('search') || undefined;
    const sortField = (searchParams.get('sort') || 'icpScore') as LeadSortField;
    const sortOrder = (searchParams.get('order') || 'desc') as SortOrder;

    const filters: LeadFilterOptions = {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(icp && icp !== 'ALL' ? { icpName: icp } : {}),
      ...(service && service !== 'ALL' ? { targetService: service } : {}),
      ...(priority && priority !== 'ALL' ? { priority } : {}),
      ...(search ? { search } : {}),
    };

    const leads = await leadManagementRepository.getAllLeads(filters, {
      field: sortField,
      order: sortOrder,
    });

    // Compute status counts for summary metrics
    const allLeads = await leadManagementRepository.getAllLeads();
    const metrics = {
      total: allLeads.length,
      new: allLeads.filter((l) => l.status === 'NEW').length,
      qualified: allLeads.filter((l) => l.status === 'QUALIFIED').length,
      contacted: allLeads.filter((l) => l.status === 'CONTACTED').length,
      replied: allLeads.filter((l) => l.status === 'REPLIED').length,
      meeting: allLeads.filter((l) => l.status === 'MEETING').length,
      won: allLeads.filter((l) => l.status === 'WON').length,
      lost: allLeads.filter((l) => l.status === 'LOST').length,
      disqualified: allLeads.filter((l) => l.status === 'DISQUALIFIED').length,
    };

    return NextResponse.json({
      success: true,
      count: leads.length,
      metrics,
      leads,
    });
  } catch (error: any) {
    console.error('Error fetching managed leads:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch managed leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || !body.businessName) {
      return NextResponse.json(
        { success: false, error: 'businessName is required' },
        { status: 400 }
      );
    }

    const lead = await leadManagementRepository.upsertLead(body);
    return NextResponse.json({
      success: true,
      lead,
    });
  } catch (error: any) {
    console.error('Error creating managed lead:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save lead' },
      { status: 500 }
    );
  }
}
