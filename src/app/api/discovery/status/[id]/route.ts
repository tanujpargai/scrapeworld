import { NextResponse } from 'next/server';
import { CollectionService } from '@/services/CollectionService';
import prisma from '@/lib/prisma';
import { SegmentationService } from '@/services/SegmentationService';
import { icpRepository } from '@/repositories/ICPRepository';
import { icpScraperIntegrationService } from '@/services/icp/ICPScraperIntegrationService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const queryIcpId = searchParams.get('icpId');

    const collectionService = new CollectionService();
    const collection = await collectionService.getCollectionStatus(id);

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    const businesses = await prisma.business.findMany({
      where: { collectionId: collection.id },
      include: {
        websiteData: true,
        leadIntelligence: true,
        socialProfiles: true,
        opportunities: true,
      },
    });

    const leadCount = businesses.length;

    // Resolve target ICP if selected in campaign or passed as query param
    const statsObj = (collection.stats && typeof collection.stats === 'object') ? (collection.stats as any) : {};
    const targetIcpId = queryIcpId || statsObj.icpId || null;
    let icp = null;
    if (targetIcpId) {
      icp = await icpRepository.findById(targetIcpId);
    }

    // Run qualification pipeline
    const batchResult = await icpScraperIntegrationService.qualifyBatch(businesses, icp, collection.id);

    const evalMap = new Map<string, any>();
    for (const q of batchResult.qualified) {
      const bId = q.businessId || q.business?.id;
      if (bId) evalMap.set(bId, q);
    }
    for (const r of batchResult.rejected) {
      const bId = r.businessId || r.business?.id;
      if (bId) evalMap.set(bId, r);
    }

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
      where: { business: { collectionId: collection.id } }
    });

    const target = collection.targetCount || 100;
    const completionPercent = Math.min(100, Math.round((leadCount / target) * 100));
    const estimatedAvailable = collection.totalFound || 0;
    const saturationRatio = estimatedAvailable > 0 ? (leadCount / estimatedAvailable) : 0;
    
    let saturationStatus = 'Healthy';
    if (leadCount >= target) {
      saturationStatus = 'Target Met';
    } else if (saturationRatio >= 0.90) {
      saturationStatus = 'Near Market Saturation';
    } else if (saturationRatio >= 0.75) {
      saturationStatus = 'High Extraction';
    }

    const segments = await SegmentationService.getCollectionSegments(collection.id);

    const businessesWithSegments = businesses.map(b => {
      const evaluation = evalMap.get(b.id) || null;
      return {
        ...b,
        segments: SegmentationService.getBusinessSegments(b),
        icpEvaluation: evaluation,
        icpScore: evaluation?.score ?? 0,
        icpPriority: evaluation?.priority ?? 'LOW',
        icpMatched: evaluation ? evaluation.matched : true,
      };
    });

    // Sort: if ICP active, qualified leads first, ranked by score descending
    if (icp) {
      businessesWithSegments.sort((a, b) => {
        if (a.icpMatched !== b.icpMatched) {
          return a.icpMatched ? -1 : 1;
        }
        return (b.icpScore ?? 0) - (a.icpScore ?? 0);
      });
    }

    const enriched = {
      ...collection,
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
      segments,
      icpSummary: icp ? {
        id: icp.id,
        name: icp.name,
        targetService: icp.targetService,
        qualifiedCount: batchResult.qualifiedCount,
        rejectedCount: batchResult.rejectedCount,
        matchRate: batchResult.matchRate,
        totalEvaluated: batchResult.totalEvaluated,
      } : null,
      businesses: businessesWithSegments,
    };

    return NextResponse.json({
      success: true,
      job: enriched, // Map key 'job' to avoid breaking acceptance tests
    });
  } catch (error) {
    console.error('API Error in discovery/status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

