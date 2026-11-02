import prisma from '@/lib/prisma';
import { LeadIntelligence } from '@prisma/client';
import { ReachabilityService } from './ReachabilityService';
import { OfferIntelligenceService } from './OfferIntelligenceService';

export class LeadIntelligenceService {
  private reachabilityService = new ReachabilityService();
  private offerIntelligence = new OfferIntelligenceService();

  /**
   * Calculate lead intelligence V3 metrics for a single business and save/update it.
   */
  async calculateAndSave(businessId: string): Promise<LeadIntelligence> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        websiteData: {
          include: {
            issues: true,
          },
        },
        opportunities: true,
        socialProfiles: true,
        analyses: {
          include: {
            competitor: {
              include: {
                competitorBusiness: {
                  include: {
                    websiteData: true,
                  },
                },
              },
            },
          },
        },
        aiReports: {
          orderBy: { generatedAt: 'desc' },
        },
      },
    });

    if (!business) {
      throw new Error(`Business not found for scoring: ${businessId}`);
    }

    const { websiteData, opportunities, analyses, aiReports } = business;

    const EXCLUDED_INDUSTRIES = [
      'seo agency', 'seo agencies', 'digital marketing agency', 'digital marketing agencies',
      'web design agency', 'web design agencies', 'software company', 'software companies',
      'it services', 'lead generation agency', 'lead generation agencies',
      'branding agency', 'branding agencies', 'performance marketing agency', 'performance marketing agencies'
    ];

    let isExcluded = business.excludedFromOutreach;
    if (business.industry && !isExcluded) {
      const ind = business.industry.toLowerCase();
      if (EXCLUDED_INDUSTRIES.some(ex => ind.includes(ex))) {
        await prisma.business.update({
          where: { id: businessId },
          data: { excludedFromOutreach: true }
        });
        isExcluded = true;
        business.excludedFromOutreach = true;
      }
    }

    // 1. Need Score (25% in Sales Readiness)
    let needScore = 10;
    if (!business.verifiedWebsite) {
      needScore = 100; // No website is a critical need
    } else {
      const overall = websiteData?.overallScore ?? 50;
      const overallContribution = (100 - overall) * 0.4;
      const sslContribution = websiteData?.sslEnabled ? 0 : 30;
      const speedContribution = (websiteData && (websiteData.performanceScore ?? 100) < 50) ? 20 : 0;
      const seoContribution = (websiteData && (websiteData.seoScore ?? 100) < 50) ? 10 : 0;
      needScore = Math.min(100, Math.max(10, Math.round(overallContribution + sslContribution + speedContribution + seoContribution)));
    }

    // 2. Reachability Score (25% in Sales Readiness)
    const reach = await this.reachabilityService.calculateReachability(businessId);
    const reachabilityScore = reach.score;
    const contactabilityTier = reach.tier;

    // 3. Local Market Footprint (20% in Sales Readiness)
    // Measures public customer engagement and review footprint.
    // NOTE: This reflects customer volume/activity, NOT revenue, net worth, or financial ability to pay.
    const reviewCount = business.reviewCount ?? 0;
    let marketPresenceScore = 20;
    if (reviewCount >= 500) {
      marketPresenceScore = 100;
    } else if (reviewCount >= 200) {
      marketPresenceScore = 85;
    } else if (reviewCount >= 50) {
      marketPresenceScore = 60;
    } else if (reviewCount >= 10) {
      marketPresenceScore = 40;
    }

    // 4. Competitor Gap (useful for Urgency)
    let competitorGap = 30;
    if (analyses && analyses.length > 0) {
      let totalGap = 0;
      analyses.forEach((a: any) => {
        totalGap += a.websiteScoreGap ?? 0;
      });
      const avgGap = totalGap / analyses.length;

      if (avgGap > 50) {
        competitorGap = 100;
      } else if (avgGap > 30) {
        competitorGap = 80;
      } else if (avgGap > 10) {
        competitorGap = 50;
      } else {
        competitorGap = 20;
      }
    }

    // 5. Urgency Score (15% in Sales Readiness)
    let urgencyScore = 10;
    if (!business.verifiedWebsite) {
      urgencyScore += 50; // Critical need (no website)
    } else {
      if (websiteData) {
        if (!websiteData.sslEnabled) urgencyScore += 30;
        if ((websiteData.performanceScore ?? 100) < 50) urgencyScore += 20;
        if ((websiteData.seoScore ?? 100) < 50) urgencyScore += 15;
        if ((websiteData.securityScore ?? 100) < 50) urgencyScore += 15;
      }
    }
    if (competitorGap >= 80) {
      urgencyScore += 10;
    }
    urgencyScore = Math.max(10, Math.min(100, urgencyScore));

    // 6. Ownership Discovery Score (15% in Sales Readiness)
    const ownershipScore = (business.ownerName && (business.ownerConfidence ?? 0) >= 75) ? 100 : 0;

    // 7. Sales Readiness V3 Score (0-100)
    const salesReadinessScore = Math.round(
      needScore * 0.25 +
      reachabilityScore * 0.25 +
      marketPresenceScore * 0.20 +
      urgencyScore * 0.15 +
      ownershipScore * 0.15
    );

    // Sales Readiness Tier
    let salesReadinessTier = 'D';
    if (salesReadinessScore >= 90) salesReadinessTier = 'A+';
    else if (salesReadinessScore >= 80) salesReadinessTier = 'A';
    else if (salesReadinessScore >= 70) salesReadinessTier = 'B';
    else if (salesReadinessScore >= 60) salesReadinessTier = 'C';

    // 8. Sales Confidence
    let salesConfidence = 'Low';
    if (salesReadinessScore >= 80) {
      salesConfidence = 'High';
    } else if (salesReadinessScore >= 50) {
      salesConfidence = 'Medium';
    }

    // 9. Buying Intent
    let buyingIntent = 'Cold';
    if (urgencyScore >= 80) {
      buyingIntent = 'Hot';
    } else if (urgencyScore >= 40 || competitorGap >= 50) {
      buyingIntent = 'Warm';
    }

    // 11. V4.5 Offer Intelligence
    const offerResult = this.offerIntelligence.calculate({
      name: business.name,
      industry: business.industry,
      city: business.city,
      phone: business.phone,
      email: business.email,
      rating: business.rating,
      reviewCount: business.reviewCount,
      verifiedWebsite: business.verifiedWebsite,
      ownerName: business.ownerName,
      ownerLinkedIn: business.ownerLinkedIn,
      ownerEmail: (business as any).ownerEmail || null,
      ownerConfidence: business.ownerConfidence,
      enterpriseFlag: business.enterpriseFlag,
      franchiseFlag: business.franchiseFlag,
      websiteData: websiteData ? {
        overallScore: websiteData.overallScore,
        seoScore: websiteData.seoScore,
        performanceScore: websiteData.performanceScore,
        sslEnabled: websiteData.sslEnabled,
        securityScore: websiteData.securityScore,
      } : null,
      socialProfiles: business.socialProfiles || [],
      opportunities: opportunities || [],
    });

    // 12. Rebalanced Ranking Engine (LeadScore V4)
    // Excluded businesses are hard-capped at score 5
    if (business.excludedFromOutreach) {
      const result = await prisma.leadIntelligence.upsert({
        where: { businessId },
        update: { leadScore: 5, leadTier: 'D', lastCalculatedAt: new Date() },
        create: {
          businessId,
          leadScore: 5,
          leadTier: 'D',
          urgencyScore: 0,
          buyingIntent: 'Cold',
          salesConfidence: 'Low',
          reasonToBuyScore: 0,
        },
      });
      return result;
    }

    const opportunityComponent = business.outreachSuitabilityScore ?? 50;
    const reachabilityComponent = reachabilityScore;
    const readinessComponent = salesReadinessScore;
    const urgencyComponent = urgencyScore;
    // Offer confidence replaces revenue potential in the scoring formula
    const offerConfidenceComponent = offerResult.offerConfidence;

    let leadScore = Math.round(
      opportunityComponent * 0.25 +
      reachabilityComponent * 0.25 +
      readinessComponent * 0.20 +
      urgencyComponent * 0.15 +
      offerConfidenceComponent * 0.15
    );

    leadScore = Math.max(0, Math.min(100, leadScore));

    // LeadTier V4
    let leadTier = 'D';
    if (leadScore >= 90) leadTier = 'A+';
    else if (leadScore >= 80) leadTier = 'A';
    else if (leadScore >= 70) leadTier = 'B+';
    else if (leadScore >= 60) leadTier = 'B';
    else if (leadScore >= 40) leadTier = 'C';

    let socialSignalsScore = 0;
    if (business.socialProfiles?.length > 0) {
      socialSignalsScore = 30;
      if (business.socialProfiles.some(p => p.platform === 'INSTAGRAM')) socialSignalsScore += 20;
      if (business.socialProfiles.some(p => (p.followers ?? 0) >= 1000 || (p.followersEstimate ?? 0) >= 1000)) socialSignalsScore += 50;
      socialSignalsScore = Math.min(100, socialSignalsScore);
    }

    const opportunityScore = Math.round(
      (needScore * 0.30) +
      (reachabilityScore * 0.25) +
      (marketPresenceScore * 0.20) +
      (competitorGap * 0.15) +
      (socialSignalsScore * 0.10)
    );

    const reasonToBuyScore = Math.round((needScore + competitorGap) / 2);
    const fullAnalysisReport = aiReports.find(r => r.reportType === 'FULL_ANALYSIS');
    const leadSummary = fullAnalysisReport?.summary || 
      `${business.name} is a ${business.industry || 'local business'} in ${business.city || 'Delhi'} with a review rating of ${business.rating ?? 0}/5 across ${reviewCount} reviews. Opportunity score is ${leadScore}/100.`;

    const oldIntel = await prisma.leadIntelligence.findUnique({
      where: { businessId },
      select: { leadScore: true },
    });

    const result = await prisma.leadIntelligence.upsert({
      where: { businessId },
      update: {
        leadScore,
        leadTier,
        urgencyScore,
        buyingIntent,
        salesConfidence,
        reasonToBuyScore,
        leadSummary,
        salesReadinessScore,
        salesReadinessTier,
        reachabilityScore,
        contactabilityTier,
        opportunityScore,
        lastCalculatedAt: new Date(),
        // V4.5 Offer Intelligence fields
        businessSize: offerResult.businessSize,
        abilityToPay: offerResult.abilityToPay,
        primaryOffer: offerResult.primaryOffer,
        secondaryOffer: offerResult.secondaryOffer,
        offerConfidence: offerResult.offerConfidence,
        offerReason: offerResult.offerReason,
        preferredContactMethod: offerResult.preferredContactMethod,
        contactMethodReason: offerResult.contactMethodReason,
        outreachDifficultyScore: offerResult.outreachDifficultyScore,
        outreachDifficultyLevel: offerResult.outreachDifficultyLevel,
        firstTouchStrategy: offerResult.firstTouchStrategy,
        firstTouchReason: offerResult.firstTouchReason,
      },
      create: {
        businessId,
        leadScore,
        leadTier,
        urgencyScore,
        buyingIntent,
        salesConfidence,
        reasonToBuyScore,
        leadSummary,
        salesReadinessScore,
        salesReadinessTier,
        reachabilityScore,
        contactabilityTier,
        opportunityScore,
        // V4.5 Offer Intelligence fields
        businessSize: offerResult.businessSize,
        abilityToPay: offerResult.abilityToPay,
        primaryOffer: offerResult.primaryOffer,
        secondaryOffer: offerResult.secondaryOffer,
        offerConfidence: offerResult.offerConfidence,
        offerReason: offerResult.offerReason,
        preferredContactMethod: offerResult.preferredContactMethod,
        contactMethodReason: offerResult.contactMethodReason,
        outreachDifficultyScore: offerResult.outreachDifficultyScore,
        outreachDifficultyLevel: offerResult.outreachDifficultyLevel,
        firstTouchStrategy: offerResult.firstTouchStrategy,
        firstTouchReason: offerResult.firstTouchReason,
      },
    });

    if (!oldIntel || oldIntel.leadScore !== leadScore) {
      await prisma.activity.create({
        data: {
          businessId,
          type: 'SCORE_CHANGED',
          metadata: {
            oldScore: oldIntel?.leadScore ?? null,
            newScore: leadScore,
            tier: leadTier,
          },
        },
      });
    }

    return result;
  }

  /**
   * Recalculate priority ranks across all LeadIntelligence records using optimized raw SQL Window Function.
   */
  async recalculateAllPriorityRanks(): Promise<void> {
    console.log('Recalculating global priority ranks via raw SQL window function...');
    await prisma.$executeRawUnsafe(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY lead_score DESC) as new_rank
        FROM lead_intelligence
      )
      UPDATE lead_intelligence li
      SET lead_priority_rank = r.new_rank
      FROM ranked r
      WHERE li.id = r.id
    `);
  }

  async processAndRank(businessId: string): Promise<LeadIntelligence> {
    const intel = await this.calculateAndSave(businessId);
    await this.recalculateAllPriorityRanks();
    return (await prisma.leadIntelligence.findUnique({
      where: { id: intel.id },
    }))!;
  }
}
