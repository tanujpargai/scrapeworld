import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type SegmentId = 
  | 'NO_WEBSITE'
  | 'WEBSITE_WITHOUT_SEO'
  | 'WEBSITE_WITHOUT_SSL'
  | 'OUTDATED_WEBSITE'
  | 'SLOW_WEBSITE'
  | 'NO_ANALYTICS'
  | 'NO_CONTACT_FORM'
  | 'NO_BOOKING_SYSTEM'
  | 'NO_LEAD_CAPTURE'
  | 'NO_WHATSAPP_AUTOMATION'
  | 'SOCIAL_ONLY'
  | 'INSTAGRAM_ACTIVE_NO_WEBSITE'
  | 'FACEBOOK_ACTIVE_NO_WEBSITE'
  | 'SOCIAL_GROWING'
  | 'HIGH_REVIEWS_NO_WEBSITE'
  | 'HIGH_REVIEWS_WEAK_WEBSITE'
  | 'HIGH_REVIEWS_POOR_WEBSITE'
  | 'HIGH_SOCIAL_WEAK_WEBSITE'
  | 'HIGH_RATING_LOW_DIGITAL_PRESENCE'
  | 'HIGH_ABILITY_TO_PAY'
  | 'OWNER_FOUND'
  | 'VERIFIED_WEBSITE'
  | 'COMPETITORS_OUTPERFORMING'
  | 'COMPETITOR_SEO_GAP'
  | 'COMPETITOR_REVIEW_GAP'
  | 'READY_TO_CONTACT';

export interface SegmentAnalytics {
  segmentId: SegmentId;
  name: string;
  leadCount: number;
  avgReachability: number;
  avgAbilityToPay: string; // E.g., 'HIGH' if most are HIGH
  avgClosingProbability: number;
  avgOpportunityScore: number;
  recommendedOffer: string;
}

export class SegmentationService {
  
  static getSegmentWhereClause(segmentId: SegmentId, collectionId?: string): Prisma.BusinessWhereInput {
    const baseWhere: Prisma.BusinessWhereInput = collectionId ? { collectionId } : {};
    
    switch (segmentId) {
      case 'NO_WEBSITE':
        return { ...baseWhere, website: null };
      
      case 'WEBSITE_WITHOUT_SEO':
        return { ...baseWhere, website: { not: null }, websiteData: { seoScore: { lt: 40 } } };
        
      case 'WEBSITE_WITHOUT_SSL':
        return { ...baseWhere, website: { not: null }, websiteData: { sslEnabled: false } };
        
      case 'OUTDATED_WEBSITE':
        return { ...baseWhere, website: { not: null }, websiteData: { overallScore: { lt: 50 } } };

      case 'SLOW_WEBSITE':
        return { ...baseWhere, website: { not: null }, websiteData: { performanceScore: { lt: 50 } } };

      case 'NO_ANALYTICS':
        return { ...baseWhere, website: { not: null }, websiteData: { issues: { some: { type: 'MISSING_ANALYTICS' } } } };

      case 'NO_CONTACT_FORM':
        return { ...baseWhere, website: { not: null }, websiteData: { issues: { some: { type: 'NO_CONTACT_FORM' } } } };

      case 'SOCIAL_ONLY':
        return { ...baseWhere, website: null, socialProfiles: { some: {} } };

      case 'INSTAGRAM_ACTIVE_NO_WEBSITE':
        return { ...baseWhere, website: null, socialProfiles: { some: { platform: 'INSTAGRAM' } } };

      case 'FACEBOOK_ACTIVE_NO_WEBSITE':
        return { ...baseWhere, website: null, socialProfiles: { some: { platform: 'FACEBOOK' } } };

      case 'SOCIAL_GROWING':
        return { ...baseWhere, websiteData: { overallScore: { lt: 50 } }, socialProfiles: { some: { activityScore: { gt: 70 } } } };

      case 'HIGH_REVIEWS_NO_WEBSITE':
        return { ...baseWhere, reviewCount: { gt: 100 }, website: null };

      case 'HIGH_REVIEWS_WEAK_WEBSITE':
        return { ...baseWhere, reviewCount: { gt: 100 }, websiteData: { overallScore: { lt: 50 } } };

      case 'HIGH_REVIEWS_POOR_WEBSITE':
        return { ...baseWhere, reviewCount: { gt: 100 }, websiteData: { overallScore: { lt: 30 } } };

      case 'HIGH_SOCIAL_WEAK_WEBSITE':
        return { ...baseWhere, socialProfiles: { some: { followers: { gt: 1000 } } }, websiteData: { overallScore: { lt: 50 } } };

      case 'HIGH_RATING_LOW_DIGITAL_PRESENCE':
        return { 
          ...baseWhere, 
          rating: { gt: 4.5 }, 
          OR: [
            { website: null },
            { websiteData: { seoScore: { lt: 40 } } }
          ]
        };

      case 'HIGH_ABILITY_TO_PAY':
        return { ...baseWhere, leadIntelligence: { abilityToPay: 'HIGH' } };

      case 'COMPETITORS_OUTPERFORMING':
        return { ...baseWhere, analyses: { some: { websiteScoreGap: { lt: -20 } } } };

      case 'COMPETITOR_SEO_GAP':
        return { ...baseWhere, analyses: { some: { seoGap: { lt: -20 } } } };

      case 'COMPETITOR_REVIEW_GAP':
        return { ...baseWhere, analyses: { some: { reviewGap: { lt: -20 } } } };

      case 'NO_BOOKING_SYSTEM':
        return { ...baseWhere, opportunities: { some: { title: { contains: 'Booking', mode: 'insensitive' } } } };

      case 'NO_LEAD_CAPTURE':
        return { ...baseWhere, opportunities: { some: { title: { contains: 'Lead Capture', mode: 'insensitive' } } } };

      case 'NO_WHATSAPP_AUTOMATION':
        return { ...baseWhere, opportunities: { some: { title: { contains: 'WhatsApp', mode: 'insensitive' } } } };

      case 'OWNER_FOUND':
        return { ...baseWhere, ownerName: { not: null } };

      case 'VERIFIED_WEBSITE':
        return { ...baseWhere, verifiedWebsite: { not: null } };

      case 'READY_TO_CONTACT':
        return {
          ...baseWhere,
          leadIntelligence: { reachabilityScore: { gte: 60 }, abilityToPay: { in: ['MEDIUM', 'HIGH'] } },
          enterpriseFlag: false,
          franchiseFlag: false,
          excludedFromOutreach: false,
          OR: [
            { ownerName: { not: null } },
            { verifiedWebsite: { not: null } }
          ]
        };

      default:
        return baseWhere;
    }
  }

  static getSegmentName(segmentId: SegmentId): string {
    return segmentId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  static getRecommendedOffer(segmentId: SegmentId): string {
    const offers: Record<SegmentId, string> = {
      'NO_WEBSITE': 'Website Development Package',
      'WEBSITE_WITHOUT_SEO': 'Local SEO Jumpstart',
      'WEBSITE_WITHOUT_SSL': 'SSL & Security Fix',
      'OUTDATED_WEBSITE': 'Website Redesign & Modernization',
      'SLOW_WEBSITE': 'Page Speed Optimization',
      'NO_ANALYTICS': 'Analytics & Tracking Setup',
      'NO_CONTACT_FORM': 'Conversion Rate Optimization',
      'NO_BOOKING_SYSTEM': 'Automated Booking System',
      'NO_LEAD_CAPTURE': 'Lead Capture Funnel',
      'NO_WHATSAPP_AUTOMATION': 'WhatsApp Automation System',
      'SOCIAL_ONLY': 'Landing Page + Booking System',
      'INSTAGRAM_ACTIVE_NO_WEBSITE': 'Instagram Link-in-Bio Landing Page',
      'FACEBOOK_ACTIVE_NO_WEBSITE': 'Facebook Lead Capture Page',
      'SOCIAL_GROWING': 'Social Media to Website Funnel',
      'HIGH_REVIEWS_NO_WEBSITE': 'Premium Website for Top Rated Business',
      'HIGH_REVIEWS_WEAK_WEBSITE': 'Reputation-Driven Website Redesign',
      'HIGH_REVIEWS_POOR_WEBSITE': 'Urgent Website Overhaul',
      'HIGH_SOCIAL_WEAK_WEBSITE': 'Social-First Website Redesign',
      'HIGH_RATING_LOW_DIGITAL_PRESENCE': 'Digital Presence Expansion',
      'HIGH_ABILITY_TO_PAY': 'Comprehensive Growth Retainer',
      'OWNER_FOUND': 'Direct Owner Outreach Pitch',
      'VERIFIED_WEBSITE': 'Advanced Digital Expansion',
      'COMPETITORS_OUTPERFORMING': 'Competitor Gap Analysis & Overhaul',
      'COMPETITOR_SEO_GAP': 'Aggressive SEO Catch-up',
      'COMPETITOR_REVIEW_GAP': 'Review Generation System',
      'READY_TO_CONTACT': 'Custom Initial Value Pitch'
    };
    return offers[segmentId] || 'Custom Consultation';
  }

  static async getSegmentAnalytics(segmentId: SegmentId, collectionId?: string): Promise<SegmentAnalytics> {
    const where = this.getSegmentWhereClause(segmentId, collectionId);
    
    const leads = await prisma.business.findMany({
      where,
      select: {
        id: true,
        leadIntelligence: {
          select: {
            reachabilityScore: true,
            abilityToPay: true,
            closingProbability: true,
            opportunityScore: true,
          }
        }
      }
    });

    const leadCount = leads.length;
    if (leadCount === 0) {
      return {
        segmentId,
        name: this.getSegmentName(segmentId),
        leadCount: 0,
        avgReachability: 0,
        avgAbilityToPay: 'LOW',
        avgClosingProbability: 0,
        avgOpportunityScore: 0,
        recommendedOffer: this.getRecommendedOffer(segmentId)
      };
    }

    let totalReach = 0;
    let totalClosing = 0;
    let totalOppScore = 0;
    const abilityCounts = { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };

    leads.forEach(l => {
      const intel = l.leadIntelligence;
      if (intel) {
        totalReach += intel.reachabilityScore || 0;
        totalClosing += intel.closingProbability || 0;
        totalOppScore += intel.opportunityScore || 0;
        
        const atp = intel.abilityToPay?.toUpperCase() || 'UNKNOWN';
        if (abilityCounts[atp as keyof typeof abilityCounts] !== undefined) {
          abilityCounts[atp as keyof typeof abilityCounts]++;
        } else {
          abilityCounts.UNKNOWN++;
        }
      }
    });

    const avgReachability = Math.round(totalReach / leadCount);
    const avgClosingProbability = Math.round(totalClosing / leadCount);
    const avgOpportunityScore = Math.round(totalOppScore / leadCount);
    
    let majorityAbility = 'LOW';
    let maxCount = -1;
    for (const [key, val] of Object.entries(abilityCounts)) {
      if (val > maxCount && key !== 'UNKNOWN') {
        maxCount = val;
        majorityAbility = key;
      }
    }

    return {
      segmentId,
      name: this.getSegmentName(segmentId),
      leadCount,
      avgReachability,
      avgAbilityToPay: majorityAbility,
      avgClosingProbability,
      avgOpportunityScore,
      recommendedOffer: this.getRecommendedOffer(segmentId)
    };
  }

  static getCollectionSegments(collectionId: string): Promise<SegmentAnalytics[]> {
    // Top level quick segments
    const allSegments: SegmentId[] = [
      'NO_WEBSITE', 'WEBSITE_WITHOUT_SEO', 'OUTDATED_WEBSITE', 'INSTAGRAM_ACTIVE_NO_WEBSITE',
      'HIGH_REVIEWS_NO_WEBSITE', 'HIGH_REVIEWS_WEAK_WEBSITE', 'COMPETITORS_OUTPERFORMING', 'READY_TO_CONTACT',
      'HIGH_REVIEWS_POOR_WEBSITE', 'HIGH_SOCIAL_WEAK_WEBSITE', 'HIGH_ABILITY_TO_PAY', 'OWNER_FOUND', 'VERIFIED_WEBSITE'
    ]; 
    
    return Promise.all(allSegments.map(seg => this.getSegmentAnalytics(seg, collectionId))).then(res => res.filter(a => a.leadCount > 0));
  }

  static getBusinessSegments(business: any): SegmentId[] {
    const segments: SegmentId[] = [];
    const wd = business.websiteData;
    const intel = business.leadIntelligence;
    const reviews = business.reviewCount || 0;
    
    if (!business.website) segments.push('NO_WEBSITE');
    if (business.website && wd && wd.seoScore < 40) segments.push('WEBSITE_WITHOUT_SEO');
    if (business.website && wd && wd.sslEnabled === false) segments.push('WEBSITE_WITHOUT_SSL');
    if (business.website && wd && wd.overallScore < 50) segments.push('OUTDATED_WEBSITE');
    if (business.website && wd && wd.performanceScore < 50) segments.push('SLOW_WEBSITE');
    
    const hasInsta = business.socialProfiles?.some((p: any) => p.platform === 'INSTAGRAM');
    if (!business.website && hasInsta) segments.push('INSTAGRAM_ACTIVE_NO_WEBSITE');
    
    if (!business.website && reviews > 100) segments.push('HIGH_REVIEWS_NO_WEBSITE');
    if (reviews > 100 && wd && wd.overallScore < 50) segments.push('HIGH_REVIEWS_WEAK_WEBSITE');
    if (reviews > 100 && wd && wd.overallScore < 30) segments.push('HIGH_REVIEWS_POOR_WEBSITE');
    
    const hasBigSocial = business.socialProfiles?.some((p: any) => (p.followers || 0) > 1000);
    if (hasBigSocial && wd && wd.overallScore < 50) segments.push('HIGH_SOCIAL_WEAK_WEBSITE');
    
    if (intel?.reachabilityScore >= 60 && ['MEDIUM', 'HIGH'].includes(intel?.abilityToPay) && !business.enterpriseFlag && !business.franchiseFlag && (business.ownerName || business.verifiedWebsite)) {
      segments.push('READY_TO_CONTACT');
    }
    
    return segments;
  }

  static calculateOpportunityScore(business: Prisma.BusinessGetPayload<{ include: { websiteData: true, leadIntelligence: true, analyses: true, socialProfiles: true } }>): number {
    let score = 50; // Base score
    
    // Website penalties/opportunities
    if (!business.websiteData && !business.website) {
      score += 20; // High opportunity if they don't have a website
    } else if (business.websiteData) {
      if ((business.websiteData.overallScore || 100) < 50) score += 15;
      if ((business.websiteData.seoScore || 100) < 40) score += 10;
    }

    // Reputation multipliers
    if ((business.reviewCount || 0) > 100) {
      score += 15;
    }
    if ((business.rating || 0) >= 4.5) {
      score += 10;
    }

    // Social
    if (business.socialProfiles?.length > 0) {
      if (!business.website) score += 15; // Social active but no site is a huge opportunity
    }

    // Competitor
    if (business.analyses && business.analyses.length > 0) {
      const worstGap = Math.min(...business.analyses.map(a => a.websiteScoreGap || 0));
      if (worstGap < -20) score += 15;
    }

    // Ability to Pay
    if (business.leadIntelligence?.abilityToPay === 'HIGH') score += 20;
    else if (business.leadIntelligence?.abilityToPay === 'LOW') score -= 20;

    return Math.min(Math.max(score, 0), 100);
  }
}
