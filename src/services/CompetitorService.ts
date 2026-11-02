import prisma from '@/lib/prisma';
import { TaskPriority, OpportunityStatus, ServiceType } from '@prisma/client';

export interface CompetitorCandidate {
  business: any;
  score: number;
}

export class CompetitorService {
  /**
   * Run the complete competitor pipeline for a business:
   * 1. Discover competitors
   * 2. Perform Gap Analysis
   * 3. Generate Opportunities
   */
  async runCompetitorPipeline(businessId: string): Promise<{
    competitorsDiscovered: number;
    analysisCreated: number;
    opportunitiesCreated: number;
  }> {
    console.log(`Running Competitor Pipeline for Business ${businessId}...`);
    
    // 1. Discover and save top competitors
    const competitors = await this.discoverAndSaveCompetitors(businessId);
    
    if (competitors.length === 0) {
      console.warn(`No competitors discovered for business ${businessId}. Pipeline stopped.`);
      return { competitorsDiscovered: 0, analysisCreated: 0, opportunitiesCreated: 0 };
    }

    // 2. Perform Gap Analysis
    const analysisCount = await this.analyzeGaps(businessId, competitors);

    // Log competitor analysis update activity
    await prisma.activity.create({
      data: {
        businessId,
        type: 'COMPETITOR_UPDATED',
        metadata: {
          competitorsCount: competitors.length,
          analysisCreated: analysisCount,
        },
      },
    });

    // 3. Generate Opportunities
    const opportunityCount = await this.generateOpportunities(businessId, competitors);

    // 4. Trigger Lead Intelligence calculation (without global rank recalculation for batch speed)
    try {
      const { LeadIntelligenceService } = await import('@/services/LeadIntelligenceService');
      const leadIntelService = new LeadIntelligenceService();
      await leadIntelService.calculateAndSave(businessId);
      console.log(`[Auto-Trigger] Lead Intelligence calculated for Business ${businessId}`);
    } catch (intelErr) {
      console.error(`[Auto-Trigger] Failed to calculate Lead Intelligence for Business ${businessId}:`, intelErr);
    }

    return {
      competitorsDiscovered: competitors.length,
      analysisCreated: analysisCount,
      opportunitiesCreated: opportunityCount,
    };
  }

  /**
   * Discover and save competitors
   */
  private async discoverAndSaveCompetitors(businessId: string): Promise<any[]> {
    const target = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        websiteData: true,
        socialProfiles: true,
      },
    });

    if (!target) {
      throw new Error(`Target business not found: ${businessId}`);
    }

    const industry = target.industry || 'Unknown';

    // Query other businesses with same industry
    let candidates = await prisma.business.findMany({
      where: {
        id: { not: businessId },
        industry: {
          contains: industry,
          mode: 'insensitive',
        },
      },
      include: {
        websiteData: true,
        socialProfiles: true,
      },
    });

    // Fallback: If no same-industry candidates exist, look for any business in same city
    if (candidates.length === 0 && target.city) {
      candidates = await prisma.business.findMany({
        where: {
          id: { not: businessId },
          city: {
            equals: target.city,
            mode: 'insensitive',
          },
        },
        include: {
          websiteData: true,
          socialProfiles: true,
        },
      });
    }

    const scoredCandidates: CompetitorCandidate[] = [];

    for (const cand of candidates) {
      let score = 0;

      // A. Industry Relevance (max 40)
      if (target.industry && cand.industry) {
        if (target.industry.toLowerCase() === cand.industry.toLowerCase()) {
          score += 40;
        } else if (
          target.industry.toLowerCase().includes(cand.industry.toLowerCase()) ||
          cand.industry.toLowerCase().includes(target.industry.toLowerCase())
        ) {
          score += 25;
        }
      }

      // B. Geographic Relevance (max 50)
      if (target.latitude !== null && target.longitude !== null && cand.latitude !== null && cand.longitude !== null) {
        const dist = this.getHaversineDistance(
          target.latitude,
          target.longitude,
          cand.latitude,
          cand.longitude
        );
        if (dist <= 5) {
          score += 50;
        } else if (dist <= 15) {
          score += 30;
        } else if (dist <= 30) {
          score += 15;
        }
      } else if (target.city && cand.city && target.city.toLowerCase() === cand.city.toLowerCase()) {
        score += 30;
      }

      // C. Size/Review Similarity (max 10)
      if (target.reviewCount !== null && cand.reviewCount !== null) {
        const diff = Math.abs(target.reviewCount - cand.reviewCount);
        if (diff <= 20) {
          score += 10;
        } else if (diff <= 100) {
          score += 5;
        }
      }

      // Only keep candidate if they have some baseline relevance
      if (score >= 20) {
        scoredCandidates.push({ business: cand, score });
      }
    }

    // Sort by score descending and take top 5
    scoredCandidates.sort((a, b) => b.score - a.score);
    const topCandidates = scoredCandidates.slice(0, 5);

    const savedCompetitors: any[] = [];

    for (const cand of topCandidates) {
      const relScore = Number((cand.score / 100).toFixed(2));

      // Upsert Competitor relation
      let competitor = await prisma.competitor.findFirst({
        where: {
          businessId,
          competitorBusinessId: cand.business.id,
        },
      });

      if (!competitor) {
        competitor = await prisma.competitor.create({
          data: {
            businessId,
            competitorBusinessId: cand.business.id,
            relationshipScore: relScore,
          },
        });
      } else {
        competitor = await prisma.competitor.update({
          where: { id: competitor.id },
          data: { relationshipScore: relScore },
        });
      }

      savedCompetitors.push({
        ...competitor,
        competitorBusiness: cand.business,
      });
    }

    return savedCompetitors;
  }

  /**
   * Analyze gaps for each competitor and save logs
   */
  private async analyzeGaps(businessId: string, competitors: any[]): Promise<number> {
    const target = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        websiteData: true,
        socialProfiles: true,
      },
    });

    if (!target) return 0;

    let analysisCount = 0;

    for (const comp of competitors) {
      const compBiz = comp.competitorBusiness;

      // 1. Website Score Gap (Competitor Overall - Target Overall)
      const targetWebScore = target.websiteData?.overallScore ?? 0;
      const compWebScore = compBiz.websiteData?.overallScore ?? 70; // Fallback to benchmark
      const websiteScoreGap = compWebScore - targetWebScore;

      // 2. SEO Gap (Competitor SEO - Target SEO)
      const targetSeo = target.websiteData?.seoScore ?? 0;
      const compSeo = compBiz.websiteData?.seoScore ?? 70;
      const seoGap = compSeo - targetSeo;

      // 3. Review Gap (Competitor Reviews - Target Reviews)
      const targetReviews = target.reviewCount ?? 0;
      const compReviews = compBiz.reviewCount ?? 0;
      const reviewGap = compReviews - targetReviews;

      // 4. Social Gap (Scaled social profiles count difference)
      const targetSocials = target.socialProfiles.length;
      const compSocials = compBiz.socialProfiles.length;
      const socialGap = (compSocials - targetSocials) * 20;

      // 5. Brand Gap (Scaled rating difference)
      const targetRating = target.rating ?? 0.0;
      const compRating = compBiz.rating ?? 0.0;
      const brandGap = Math.round((compRating - targetRating) * 20);

      // Create a textual summary
      const summaryParts: string[] = [];
      if (websiteScoreGap > 15) summaryParts.push(`website score gap of ${websiteScoreGap} points`);
      if (reviewGap > 30) summaryParts.push(`holding ${reviewGap} more Google reviews`);
      if (compSocials > targetSocials) summaryParts.push(`stronger social media footprint`);
      if (!target.websiteData && compBiz.websiteData) summaryParts.push('possesses a web presence while target does not');

      const summary = summaryParts.length > 0 
        ? `Competitor has competitive advantages: ${summaryParts.join(', ')}.`
        : 'Competitor matches target closely with no significant gaps identified.';

      // Save CompetitorAnalysis
      await prisma.competitorAnalysis.deleteMany({
        where: {
          businessId,
          competitorId: comp.id,
        },
      });

      await prisma.competitorAnalysis.create({
        data: {
          businessId,
          competitorId: comp.id,
          websiteScoreGap,
          seoGap,
          socialGap,
          reviewGap,
          brandGap,
          summary,
        },
      });

      analysisCount++;
    }

    return analysisCount;
  }

  /**
   * Generate opportunities from aggregated competitor gaps
   */
  private async generateOpportunities(businessId: string, competitors: any[]): Promise<number> {
    const target = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        websiteData: true,
        socialProfiles: true,
      },
    });

    if (!target) return 0;

    const count = competitors.length;
    let sumOverall = 0;
    let sumSeo = 0;
    let sumReviews = 0;
    let compWithBooking = 0;
    let compWithSsl = 0;

    for (const comp of competitors) {
      const compBiz = comp.competitorBusiness;
      sumOverall += compBiz.websiteData?.overallScore ?? 70;
      sumSeo += compBiz.websiteData?.seoScore ?? 70;
      sumReviews += compBiz.reviewCount ?? 0;
      
      const techStack = (compBiz.websiteData?.technologyStack as string[]) || [];
      if (techStack.includes('Calendly') || techStack.includes('HubSpot') || techStack.includes('Intercom')) {
        compWithBooking++;
      }
      if (compBiz.websiteData?.sslEnabled) {
        compWithSsl++;
      }
    }

    const avgOverall = Math.round(sumOverall / count);
    const avgSeo = Math.round(sumSeo / count);
    const avgReviews = Math.round(sumReviews / count);

    const generatedOpps: any[] = [];

    // Opportunity A: Website Optimization
    const targetScore = target.websiteData?.overallScore ?? 0;
    if (targetScore < 70 || avgOverall - targetScore > 15 || !target.websiteData) {
      const gap = avgOverall - targetScore;
      generatedOpps.push({
        title: 'Website Performance & UX Optimization',
        description: target.websiteData 
          ? `Your website's overall performance score of ${targetScore}/100 lags behind local competitors (average: ${avgOverall}/100). We recommend page speed adjustments and responsive optimizations.`
          : `Top competitors average an overall website score of ${avgOverall}/100, while your business currently lacks a website record. We recommend building a responsive landing page.`,
        serviceType: ServiceType.WEBSITE,
        priority: gap > 30 || !target.websiteData ? TaskPriority.HIGH : TaskPriority.MEDIUM,
        estimatedValue: 1500.0,
        opportunityScore: Math.min(100, Math.max(10, 40 + gap)),
        status: OpportunityStatus.OPEN,
      });
    }

    // Opportunity B: Local SEO Visibility
    const targetSeo = target.websiteData?.seoScore ?? 0;
    const targetReviews = target.reviewCount ?? 0;
    if (targetSeo < 70 || avgSeo - targetSeo > 15 || avgReviews - targetReviews > 30) {
      const seoGap = avgSeo - targetSeo;
      const reviewGap = avgReviews - targetReviews;
      generatedOpps.push({
        title: 'Local SEO & Google Maps Visibility Campaign',
        description: `Your local search visibility is falling behind. Competitors average ${avgReviews} Google reviews (vs your ${targetReviews}) and an SEO score of ${avgSeo}/100 (vs your ${targetSeo}/100). We recommend schema optimizations and citations.`,
        serviceType: ServiceType.SEO,
        priority: reviewGap > 100 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
        estimatedValue: 1000.0,
        opportunityScore: Math.min(100, Math.max(10, 50 + seoGap)),
        status: OpportunityStatus.OPEN,
      });
    }

    // Opportunity C: Lead Capture & Booking Automation
    const targetTechStack = (target.websiteData?.technologyStack as string[]) || [];
    const targetHasBooking = targetTechStack.includes('Calendly') || targetTechStack.includes('HubSpot') || targetTechStack.includes('Intercom');
    if (!targetHasBooking && compWithBooking > 0) {
      generatedOpps.push({
        title: 'Lead Capture & Online Booking Automation',
        description: 'Top local competitors are using automated booking/lead capture widgets on their sites to secure instant bookings. We recommend integrating Calendly/HubSpot widgets to lower friction.',
        serviceType: ServiceType.AUTOMATION,
        priority: TaskPriority.MEDIUM,
        estimatedValue: 800.0,
        opportunityScore: 75,
        status: OpportunityStatus.OPEN,
      });
    }

    // Opportunity D: SSL Security Implementation
    if (target.websiteData && !target.websiteData.sslEnabled && compWithSsl > 0) {
      generatedOpps.push({
        title: 'SSL Security Setup',
        description: 'Your website is currently served over insecure HTTP, while competitors are secured under HTTPS. Implementing SSL will protect user data and boost Google search ranking signals.',
        serviceType: ServiceType.WEBSITE,
        priority: TaskPriority.HIGH,
        estimatedValue: 300.0,
        opportunityScore: 95,
        status: OpportunityStatus.OPEN,
      });
    }

    // Save Opportunities
    let countSaved = 0;
    for (const opp of generatedOpps) {
      const existing = await prisma.opportunity.findFirst({
        where: {
          businessId,
          title: opp.title,
        },
      });

      if (existing) {
        await prisma.opportunity.update({
          where: { id: existing.id },
          data: opp,
        });
      } else {
        await prisma.opportunity.create({
          data: {
            ...opp,
            business: {
              connect: { id: businessId },
            },
          },
        });
      }

      // Log opportunity generated activity
      if (!existing) {
        await prisma.activity.create({
          data: {
            businessId,
            type: 'OPPORTUNITY_GENERATED',
            metadata: {
              title: opp.title,
              serviceType: opp.serviceType,
              estimatedValue: opp.estimatedValue,
              opportunityScore: opp.opportunityScore,
            },
          },
        });
      }

      countSaved++;
    }

    return countSaved;
  }

  /**
   * Helper: Haversine distance formula between two GPS coordinates in kilometers
   */
  private getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
