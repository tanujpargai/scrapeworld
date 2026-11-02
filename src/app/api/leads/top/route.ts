import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const topLeads = await prisma.leadIntelligence.findMany({
      orderBy: { leadPriorityRank: 'asc' },
      take: 20,
      include: {
        business: {
          select: {
            name: true,
            reviewCount: true,
            websiteData: {
              select: {
                sslEnabled: true,
                overallScore: true,
              },
            },
            opportunities: {
              select: {
                serviceType: true,
              },
            },
          },
        },
      },
    });

    const formattedLeads = topLeads.map(lead => {
      const biz = lead.business;
      const recommendedServices = biz.opportunities.map(o => o.serviceType);
      
      let reasonToBuy = lead.leadSummary || '';
      if (!reasonToBuy && lead.leadScore >= 75) {
        const sslStatus = biz.websiteData ? (biz.websiteData.sslEnabled ? 'SSL active' : 'SSL MISSING') : 'No website';
        const webScore = biz.websiteData ? `${biz.websiteData.overallScore}/100` : 'N/A';
        reasonToBuy = `Needs digital optimization: Website is ${sslStatus} with quality score of ${webScore}. Competitors have market advantage, and high reviews (${biz.reviewCount ?? 0}) indicate strong capacity to invest.`;
      } else if (!reasonToBuy) {
        reasonToBuy = 'Moderate sales opportunity. Current digital presence is stable but minor optimizations exist.';
      }

      return {
        id: lead.id,
        businessId: lead.businessId,
        businessName: biz.name,
        leadScore: lead.leadScore,
        leadTier: lead.leadTier,
        urgencyScore: lead.urgencyScore,
        buyerProbability: lead.buyerProbability,
        reasonToBuy,
        revenuePotential: lead.revenuePotential,
        estimatedDealValue: lead.estimatedDealValue,
        leadPriorityRank: lead.leadPriorityRank,
        recommendedServices,
      };
    });

    return NextResponse.json({
      success: true,
      leads: formattedLeads,
    });
  } catch (error) {
    console.error('API Error in GET /api/leads/top:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
