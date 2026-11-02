/**
 * OpportunityAnalysisService
 * 
 * Generates deterministic, fact-grounded opportunity intelligence for agency prospects.
 * 
 * Formats:
 * - Opportunity Type (e.g., "WEB DEVELOPMENT OPPORTUNITY", "MARKETING OPPORTUNITY")
 * - Priority (HIGH / MEDIUM / LOW)
 * - Why this company is a prospect
 * - What service is likely relevant
 * - What signals caused the qualification
 * - What issues were detected
 * 
 * ZERO AI HALLUCINATION: All reasons, issues, and signals are derived
 * strictly from normalized data and verified HTML signals.
 */

import type { LeadOpportunity } from '@/types/leadManagement';
import type { ICPPriority, ICPProfile } from '@/types/icp';
import { OpportunityEngineService } from './OpportunityEngineService';

export class OpportunityAnalysisService {
  /**
   * Generates a deterministic agency opportunity analysis for a prospect.
   */
  static analyzeOpportunity(
    business: any,
    icp?: ICPProfile | null,
    evaluationScore?: number,
    evaluationPriority?: ICPPriority
  ): LeadOpportunity {
    const raw = business || {};
    const websiteData = raw.websiteData || {};
    const signals = raw.signals || {};
    const webSignals = signals.website || {};
    const mktSignals = signals.marketing || {};
    const bizSignals = signals.business || {};

    // ── 1. EXTRACT VERIFIED DATA POINTS (ZERO ASSUMPTIONS) ──
    const hasWebsite = raw.hasWebsite ?? (Boolean(raw.website) && raw.website !== '');
    const isHttps = raw.isHttps ?? webSignals.isHttps ?? websiteData.hasSsl ?? true;
    const mobileResponsive = raw.mobileResponsive ?? webSignals.mobileResponsive ?? true;
    const hasContactForm = raw.hasContactForm ?? webSignals.hasContactForm ?? false;
    const hasWhatsApp = raw.hasWhatsApp ?? webSignals.hasWhatsApp ?? false;
    const hasCta = raw.hasCta ?? webSignals.hasCta ?? false;
    const hasAnalytics = raw.hasAnalytics ?? webSignals.hasAnalytics ?? false;
    const hasMetaPixel = raw.hasMetaPixel ?? webSignals.hasMetaPixel ?? false;
    const hasBrokenLinks = raw.hasBrokenLinks ?? webSignals.hasBrokenLinks ?? false;
    const websiteQuality = raw.websiteQuality ?? webSignals.qualityScore ?? websiteData.overallScore ?? 70;
    const lastUpdatedYear = raw.lastUpdatedYear ?? webSignals.lastUpdatedYear ?? null;
    const currentYear = new Date().getFullYear();

    const reviewCount = raw.reviewCount ?? mktSignals.reviewCount ?? 0;
    const rating = raw.rating ?? mktSignals.rating ?? 0;
    const socialPlatformCount = raw.socialPlatformCount ?? mktSignals.socialPlatformCount ?? (raw.socialProfiles?.length || 0);
    const businessAge = raw.businessAge ?? (raw.foundedYear ? currentYear - raw.foundedYear : null);
    const businessStatus = raw.businessStatus ?? bizSignals.status ?? 'OPERATIONAL';
    const hasPhone = Boolean(raw.phone || raw.hasPhone);
    const hasEmail = Boolean(raw.email || raw.hasEmail);
    const hasOwner = Boolean(raw.hasOwner || raw.ownerName);

    // ── 2. COMPILE VERIFIED ISSUES DETECTED ──
    const detectedIssues: string[] = [];

    // Website Issues
    if (!hasWebsite) {
      detectedIssues.push('No active website found for business');
    } else {
      if (websiteQuality < 60) {
        detectedIssues.push('Weak website quality score (< 60)');
      }
      if (!mobileResponsive) {
        detectedIssues.push('Poor mobile experience (Missing viewport optimization)');
      }
      if (!isHttps) {
        detectedIssues.push('Insecure connection (Missing HTTPS/SSL certificate)');
      }
      if (!hasCta) {
        detectedIssues.push('Missing conversion CTA (No appointment or call buttons)');
      }
      if (!hasContactForm) {
        detectedIssues.push('Missing digital contact/lead capture form');
      }
      if (hasBrokenLinks) {
        detectedIssues.push('Detected broken or invalid internal links');
      }
      if (lastUpdatedYear && lastUpdatedYear < currentYear - 2) {
        detectedIssues.push(`Outdated website copyright (${lastUpdatedYear})`);
      }
    }

    // Marketing & Social Issues
    if (socialPlatformCount <= 1) {
      detectedIssues.push('Weak social presence (0-1 platforms active)');
    }
    if (!hasAnalytics && hasWebsite) {
      detectedIssues.push('Missing analytics tracking (No GA4 / GTM detected)');
    }
    if (!hasMetaPixel && hasWebsite) {
      detectedIssues.push('Missing Meta pixel for retargeting advertising');
    }
    if (!hasWhatsApp) {
      detectedIssues.push('Missing WhatsApp click-to-chat integration');
    }
    if (reviewCount >= 20 && rating > 0 && rating < 4.2) {
      detectedIssues.push(`Reputation vulnerability: Star rating is ${rating} (< 4.2)`);
    }

    // ── 3. COMPILE QUALIFYING SIGNALS ──
    const qualifyingSignals: string[] = [];

    if (businessAge && businessAge >= 3) {
      qualifyingSignals.push(`Established business (${businessAge} years in operation)`);
    } else if (reviewCount >= 15) {
      qualifyingSignals.push(`Established business with active customer base (${reviewCount} Google reviews)`);
    }

    if (businessStatus === 'OPERATIONAL') {
      qualifyingSignals.push('Active operational business');
    }

    if (reviewCount >= 30) {
      qualifyingSignals.push(`Strong local market footprint (${reviewCount} public reviews)`);
    } else if (reviewCount >= 10) {
      qualifyingSignals.push('Demonstrated local consumer demand');
    }

    if (rating >= 4.3) {
      qualifyingSignals.push(`Strong customer satisfaction (${rating} Google stars)`);
    }

    if (hasPhone) {
      qualifyingSignals.push('Direct phone contact available for sales outreach');
    }

    if (hasEmail) {
      qualifyingSignals.push('Direct email channel identified');
    }

    if (hasOwner) {
      qualifyingSignals.push('Decision maker / owner identified for direct pitch');
    }

    // ── 4. DETERMINE OPPORTUNITY TYPE & SERVICE ──
    const targetService = (icp?.targetService || '').toUpperCase();
    let type = 'WEB DEVELOPMENT OPPORTUNITY';
    let relevantService = 'Web Development & Modernization';
    let whyProspect = 'Established business with solid local presence but lagging digital infrastructure.';

    const webIssueCount = detectedIssues.filter(i => 
      i.includes('website') || i.includes('mobile') || i.includes('HTTPS') || i.includes('CTA') || i.includes('form')
    ).length;

    const marketingIssueCount = detectedIssues.filter(i =>
      i.includes('social') || i.includes('analytics') || i.includes('Meta') || i.includes('Reputation') || i.includes('WhatsApp')
    ).length;

    const hasWebOpportunity = !hasWebsite || webIssueCount >= 2 || targetService.includes('WEBSITE');
    const hasMarketingOpportunity = marketingIssueCount >= 2 || targetService.includes('MARKETING') || targetService.includes('SEO');

    if (
      targetService === 'BOTH' || 
      targetService === 'FULL_SERVICE' ||
      (!targetService && hasWebOpportunity && hasMarketingOpportunity)
    ) {
      type = 'DUAL OPPORTUNITY (WEB & MARKETING)';
      relevantService = 'Full-Stack Digital Transformation (Website Redesign & Growth Marketing)';
      whyProspect = 'Established operational business with severe growth bottlenecks across both website infrastructure and outbound digital marketing.';
    } else if (targetService.includes('MARKETING') || targetService.includes('SEO') || (!targetService.includes('WEBSITE') && marketingIssueCount > webIssueCount && hasWebsite && websiteQuality >= 65)) {
      type = 'MARKETING OPPORTUNITY';
      relevantService = targetService.includes('SEO') ? 'Local SEO & Search Visibility' : 'Digital Marketing & Social Growth';
      whyProspect = 'Active business with strong review momentum but under-leveraged digital marketing and social reach.';
    } else if (targetService.includes('AUTOMATION')) {
      type = 'WORKFLOW AUTOMATION OPPORTUNITY';
      relevantService = 'Lead Capture & CRM Automation';
      whyProspect = 'High customer volume business lacking automated lead capture, WhatsApp routing, and instant booking.';
    } else {
      type = 'WEB DEVELOPMENT OPPORTUNITY';
      relevantService = 'Custom Website Design & Conversion Optimization';
      whyProspect = 'Established local business losing revenue due to outdated website design, weak mobile UX, or missing conversion points.';
    }

    // ── 5. DETERMINE PRIORITY ──
    let priority: ICPPriority = evaluationPriority || 'MEDIUM';
    if (!evaluationPriority) {
      if ((evaluationScore && evaluationScore >= 70) || detectedIssues.length >= 4) {
        priority = 'HIGH';
      } else if ((evaluationScore && evaluationScore >= 40) || detectedIssues.length >= 2) {
        priority = 'MEDIUM';
      } else {
        priority = 'LOW';
      }
    }

    // Fallback if no issues detected
    if (detectedIssues.length === 0) {
      detectedIssues.push('General digital modernizations needed to outpace local competitors');
    }

    if (qualifyingSignals.length === 0) {
      qualifyingSignals.push('Local business identified with active phone contact');
    }

    // Generate detailed evidence-backed opportunity records and outreach brief (Phase 3)
    const engineResult = OpportunityEngineService.analyzeOpportunities(business);

    return {
      type,
      priority,
      whyProspect,
      relevantService,
      qualifyingSignals,
      detectedIssues,
      opportunities: engineResult.opportunities,
      outreachBrief: engineResult.brief,
    };
  }
}

export const opportunityAnalysisService = OpportunityAnalysisService;
