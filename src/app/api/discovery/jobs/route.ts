import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const enrichedCollections = [];
    for (const c of collections) {
      const businesses = await prisma.business.findMany({
        where: { collectionId: c.id },
        include: {
          leadIntelligence: true,
          socialProfiles: true,
        },
      });

      const leadCount = businesses.length;

      const reachableLeads = businesses.filter(b => 
        (b.leadIntelligence?.reachabilityScore && b.leadIntelligence.reachabilityScore > 0) || 
        b.phone || 
        b.email
      ).length;

      const verifiedWebsites = businesses.filter(b => !!b.verifiedWebsite).length;
      const ownersFound = businesses.filter(b => !!b.ownerName).length;
      const socialProfilesFound = businesses.filter(b => b.socialProfiles.length > 0).length;

      const leadScores = businesses
        .map(b => b.leadIntelligence?.leadScore)
        .filter(score => typeof score === 'number') as number[];
      const avgLeadScore = leadScores.length > 0
        ? Math.round(leadScores.reduce((sum, s) => sum + s, 0) / leadScores.length)
        : 0;

      const readinessScores = businesses
        .map(b => b.leadIntelligence?.salesReadinessScore)
        .filter(score => typeof score === 'number') as number[];
      const avgSalesReadiness = readinessScores.length > 0
        ? Math.round(readinessScores.reduce((sum, s) => sum + s, 0) / readinessScores.length)
        : 0;

      const opportunitiesCount = await prisma.opportunity.count({
        where: { business: { collectionId: c.id } }
      });

      const target = c.targetCount || 100;
      const completionPercent = Math.min(100, Math.round((leadCount / target) * 100));
      const estimatedAvailable = c.totalFound || 0;
      const saturationRatio = estimatedAvailable > 0 ? (leadCount / estimatedAvailable) : 0;
      
      let saturationStatus = 'Healthy';
      if (leadCount >= target) {
        saturationStatus = 'Target Met';
      } else if (saturationRatio >= 0.90) {
        saturationStatus = 'Near Market Saturation';
      } else if (saturationRatio >= 0.75) {
        saturationStatus = 'High Extraction';
      }

      enrichedCollections.push({
        ...c,
        leadCount,
        reachableLeads,
        verifiedWebsites,
        ownersFound,
        socialProfilesFound,
        avgLeadScore,
        avgSalesReadiness,
        opportunitiesCount,
        completionPercent,
        estimatedAvailable,
        saturationStatus,
      });
    }

    return NextResponse.json({
      success: true,
      jobs: enrichedCollections, // Map to jobs to avoid breaking client views
    });
  } catch (error: any) {
    console.error('Collections list API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
}

