import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SegmentationService } from '@/services/SegmentationService';

import { BusinessStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    // 1. Get the base "where" clause for READY_TO_CONTACT segment
    const segmentWhere = SegmentationService.getSegmentWhereClause('READY_TO_CONTACT');
    
    // 2. Add Status = NEW
    const where = {
      ...segmentWhere,
      status: BusinessStatus.NEW
    };

    // 3. Fetch businesses and sort by opportunityScore DESC
    const businesses = await prisma.business.findMany({
      where,
      include: {
        leadIntelligence: true,
        socialProfiles: true,
        opportunities: true,
        websiteData: true,
      },
      orderBy: {
        leadIntelligence: {
          opportunityScore: 'desc'
        }
      },
      take: 100 // Limit to top 100 for "Today"
    });

    const businessesWithSegments = businesses.map(b => ({
      ...b,
      segments: SegmentationService.getBusinessSegments(b)
    }));

    return NextResponse.json({
      success: true,
      businesses: businessesWithSegments
    });
  } catch (error: any) {
    console.error('API Error in /today:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
