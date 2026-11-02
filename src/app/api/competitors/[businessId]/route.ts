import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CompetitorService } from '@/services/CompetitorService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    // Fetch competitors
    const competitors = await prisma.competitor.findMany({
      where: { businessId },
      include: {
        competitorBusiness: {
          include: {
            websiteData: true,
            socialProfiles: true,
          },
        },
      },
    });

    // Fetch gap analyses
    const analyses = await prisma.competitorAnalysis.findMany({
      where: { businessId },
      include: {
        competitor: {
          include: {
            competitorBusiness: true,
          },
        },
      },
    });

    // Fetch opportunities
    const opportunities = await prisma.opportunity.findMany({
      where: { businessId },
    });

    return NextResponse.json({
      success: true,
      competitors,
      analyses,
      opportunities,
    });
  } catch (error) {
    console.error('API Error in competitors GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    const competitorService = new CompetitorService();
    const result = await competitorService.runCompetitorPipeline(businessId);

    return NextResponse.json({
      success: true,
      message: 'Competitor pipeline executed successfully',
      result,
    });
  } catch (error: any) {
    console.error('API Error in competitors POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
