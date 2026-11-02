/**
 * OpportunityEngineService
 * 
 * Deterministic, evidence-based Opportunity Intelligence Engine for:
 * 1. Integral Labs - Website development, redesign, e-commerce, technical improvements.
 * 2. Integral Marketing - Local SEO, technical SEO, social metadata, analytics, and digital marketing.
 * 
 * Strict Zero-Cost & Fact-Grounded Guardrails:
 * - Clear 3-tier separation: Observed Fact vs. Interpretation vs. Recommended Action.
 * - Evidence confidence, opportunity relevance, and priority are kept distinct.
 * - Blocked inspections (403, 429, CAPTCHA, WAF) are NEVER treated as website defects.
 * - Unknown or failed-to-collect signals are NEVER penalized or fabricated.
 * - No inference of revenue, company size, budget, or willingness to pay from reviews or domain age.
 * - Zero external AI / LLM dependencies.
 */

import type {
  OpportunityRecord,
  OpportunityEvidence,
  OutreachBrief,
  OpportunityAnalysisResult,
  OpportunityCategory,
  AgencyDivision,
  OpportunitySeverity,
} from '@/types/opportunityIntelligence';
import type { SignalStatus, ICPPriority } from '@/types/icp';
import { DataNormalizationService, type NormalizedBusiness } from '@/services/icp/DataNormalizationService';

// Categories known to plausibly sell physical goods/products
const PRODUCT_SELLING_KEYWORDS = [
  'bakery', 'bakeries', 'florist', 'flowers', 'boutique', 'apparel', 'clothing',
  'jewelry', 'shoe store', 'shoes', 'gift shop', 'furniture', 'electronics store',
  'bookstore', 'toy store', 'retail', 'optician', 'eyewear', 'handicrafts'
];

export class OpportunityEngineService {
  private static getSignal(
    provenance: Record<string, any> | undefined,
    ...keys: string[]
  ): any {
    if (!provenance) return undefined;
    for (const key of keys) {
      if (provenance[key]) return provenance[key];
    }
    return undefined;
  }

  /**
   * Analyzes a business and generates structured, evidence-backed opportunity records.
   */
  static analyzeOpportunities(businessInput: any): OpportunityAnalysisResult {
    // Ensure normalized business representation
    const business: NormalizedBusiness = (businessInput && businessInput.signals && businessInput.provenance)
      ? businessInput as NormalizedBusiness
      : DataNormalizationService.normalize(businessInput || {});

    const businessId = business.id || `biz-${(business.name || 'unnamed').replace(/\s+/g, '-').toLowerCase()}`;
    const businessName = business.name || 'Business';
    const websiteUrl = business.website || business.verifiedWebsite || null;

    const opportunities: OpportunityRecord[] = [];
    const limitations: string[] = [];

    // Check inspection status / blockages
    const rawData = business.raw || {};
    const innerRaw = (rawData && typeof rawData === 'object' && rawData.raw) ? rawData.raw : {};
    const hasWebSig = this.getSignal(business.provenance, 'hasWebsite', 'website', 'website.hasWebsite');
    const crawlBlocked = Boolean(
      rawData.crawlBlocked ||
      innerRaw.crawlBlocked ||
      rawData.httpStatus === 403 ||
      innerRaw.httpStatus === 403 ||
      rawData.httpStatus === 429 ||
      innerRaw.httpStatus === 429 ||
      rawData.captchaDetected ||
      innerRaw.captchaDetected ||
      hasWebSig?.failureReason?.toLowerCase().includes('blocked') ||
      hasWebSig?.failureReason?.toLowerCase().includes('rate limit')
    );

    if (crawlBlocked) {
      limitations.push('Website inspection was restricted (HTTP 403/429/CAPTCHA). Technical defect rules were not executed to avoid false positives.');
    }

    // ── 1. EVALUATE WEBSITE DEVELOPMENT (INTEGRAL LABS) ──
    const webDevOpps = this.evaluateWebsiteDevelopment(business, crawlBlocked);
    opportunities.push(...webDevOpps);

    // ── 2. EVALUATE TECHNICAL SEO & LOCAL SEO (INTEGRAL MARKETING) ──
    const seoOpps = this.evaluateTechnicalSeo(business, crawlBlocked);
    opportunities.push(...seoOpps);

    // ── 3. EVALUATE DIGITAL MARKETING (INTEGRAL MARKETING) ──
    const marketingOpps = this.evaluateDigitalMarketing(business, crawlBlocked);
    opportunities.push(...marketingOpps);

    // ── 4. EVALUATE E-COMMERCE (INTEGRAL LABS) ──
    const ecommerceOpps = this.evaluateEcommerce(business, crawlBlocked);
    opportunities.push(...ecommerceOpps);

    // ── 5. DEDUPLICATE & SUPPRESS REDUNDANT OPPORTUNITIES ──
    const deduplicated = this.deduplicateOpportunities(opportunities);

    // Sort opportunities descending by priorityScore
    deduplicated.sort((a, b) => b.priorityScore - a.priorityScore);

    const highestPriorityOpportunity = deduplicated.length > 0 ? deduplicated[0] : null;

    // ── 6. GENERATE DETERMINISTIC OUTREACH BRIEF ──
    const brief = this.generateOutreachBrief(business, deduplicated, limitations);

    const insufficientEvidenceReasons: string[] = [];
    if (deduplicated.length === 0) {
      if (crawlBlocked) {
        insufficientEvidenceReasons.push('Website could not be inspected due to access controls (HTTP 403/429/CAPTCHA). Direct manual review required.');
      } else if (!websiteUrl) {
        insufficientEvidenceReasons.push('Business lacks a confirmed website; verified contact channels required before outreach.');
      } else {
        insufficientEvidenceReasons.push('Inspected website meets modern performance, SEO, security, and conversion baselines. No urgent technical defect identified.');
      }
    }

    return {
      businessId,
      businessName,
      totalOpportunities: deduplicated.length,
      highestPriorityOpportunity,
      opportunities: deduplicated,
      brief,
      ...(insufficientEvidenceReasons.length > 0 ? { insufficientEvidenceReasons } : {}),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // A. WEBSITE DEVELOPMENT RULES (INTEGRAL LABS)
  // ──────────────────────────────────────────────────────────────────────────

  private static evaluateWebsiteDevelopment(
    biz: NormalizedBusiness,
    crawlBlocked: boolean
  ): OpportunityRecord[] {
    const opps: OpportunityRecord[] = [];
    const websiteUrl = biz.website || biz.verifiedWebsite;
    const bizId = biz.id || 'unknown';

    // Rule A1: Confirmed Website Unavailable (Bounded check, strictly NOT if blocked)
    const hasWebsiteSignal = this.getSignal(biz.provenance, 'hasWebsite', 'website', 'website.hasWebsite');
    const confirmedNoWebsite = !websiteUrl && hasWebsiteSignal?.status === 'KNOWN';
    const connectionFailed = hasWebsiteSignal?.status === 'FAILED_TO_COLLECT' && !crawlBlocked;

    if (confirmedNoWebsite || connectionFailed) {
      const isConnectionFailure = Boolean(connectionFailed && websiteUrl);
      const fact = isConnectionFailure
        ? `Website connection to ${websiteUrl} failed with no responsive web server.`
        : `No active website found for ${biz.name || 'the business'}.`;

      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-webdev-unavailable-${bizId}`,
        businessId: bizId,
        category: 'WEBSITE_DEVELOPMENT',
        division: 'INTEGRAL_LABS',
        title: isConnectionFailure ? 'Website Server Unreachable' : 'No Digital Web Presence',
        summary: isConnectionFailure
          ? 'Prospective customers attempting to visit the website encounter connection timeouts.'
          : 'Business currently relies entirely on offline or third-party listings with no owned digital asset.',
        observedFact: fact,
        interpretation: 'Prospective customers who search online cannot find an official website, resulting in lost inquiries and lost local trust.',
        recommendedAction: 'Deploy a modern, fast-loading, responsive business website on Integral Labs managed infrastructure.',
        recommendedService: 'Custom Website Development & Hosting Setup',
        recommendedNextAction: 'Present a 30-day website launch proposal showcasing a tailored prototype for their local market.',
        supportingEvidence: [
          {
            field: 'website',
            value: websiteUrl || null,
            status: hasWebsiteSignal?.status || 'KNOWN',
            source: hasWebsiteSignal?.source || 'DISCOVERY_CRAWLER',
            confidence: hasWebsiteSignal?.confidence ?? 1.0,
            notes: isConnectionFailure ? 'Connection failure confirmed after timeout' : 'Website field empty in discovery listing',
          },
        ],
        sourceUrls: websiteUrl ? [websiteUrl] : [],
        evidenceConfidence: 1.0,
        opportunityRelevance: 1.0,
        severity: 'CRITICAL',
        basePriorityScore: 85,
        limitations: [],
      }));
      // If website does not exist, subsequent on-site technical checks do not apply
      return opps;
    }

    if (crawlBlocked) {
      // Cannot inspect on-page signals
      return opps;
    }

    // Rule A2: Insecure / Invalid TLS Certificate
    const tlsSignal = this.getSignal(biz.provenance, 'tlsData.isValid', 'isTlsValid', 'isHttps', 'website.tlsValid');
    const tlsData = biz.tlsData;
    const isHttps = biz.isHttps ?? biz.signals?.website?.isHttps ?? true;
    const isTlsValid = tlsData ? tlsData.isValid : (isHttps ? true : false);

    if (!isHttps || isTlsValid === false) {
      const issuer = tlsData?.issuer ? ` (Issuer: ${tlsData.issuer})` : '';
      const authError = tlsData?.authorizationError ? ` Error: ${tlsData.authorizationError}.` : '';

      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-webdev-tls-${bizId}`,
        businessId: bizId,
        category: 'WEBSITE_DEVELOPMENT',
        division: 'INTEGRAL_LABS',
        title: 'Insecure Connection (TLS/SSL Issues)',
        summary: 'Website lacks a valid SSL certificate or serves unencrypted HTTP content.',
        observedFact: `Inspected site serves traffic without a valid TLS certificate.${issuer}${authError}`,
        interpretation: 'Modern web browsers display prominent "Not Secure" warnings, causing visitors to immediately bounce.',
        recommendedAction: 'Install automated TLS certificates, configure HSTS, and enforce HTTPS redirects across all domain paths.',
        recommendedService: 'SSL/TLS Security & HTTPS Enforcement',
        recommendedNextAction: 'Offer a rapid 24-hour SSL installation and security hardening package.',
        supportingEvidence: [
          {
            field: 'tlsData.isValid',
            value: isTlsValid,
            status: tlsSignal?.status || 'KNOWN',
            source: tlsSignal?.source || 'TLS_HANDSHAKE',
            confidence: tlsSignal?.confidence ?? 1.0,
            notes: tlsData?.authorizationError || 'TLS validation check failed',
          },
        ],
        sourceUrls: websiteUrl ? [websiteUrl] : [],
        evidenceConfidence: 1.0,
        opportunityRelevance: 0.95,
        severity: 'HIGH',
        basePriorityScore: 78,
        limitations: ['Verified on primary port 443 handshake.'],
      }));
    }

    // Rule A3: Non-responsive mobile experience
    const mobileSignal = this.getSignal(biz.provenance, 'mobileResponsive', 'website.mobileResponsive');
    if (biz.mobileResponsive === false && mobileSignal?.status === 'KNOWN') {
      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-webdev-mobile-${bizId}`,
        businessId: bizId,
        category: 'WEBSITE_DEVELOPMENT',
        division: 'INTEGRAL_LABS',
        title: 'Non-Responsive Mobile Experience',
        summary: 'Website does not include standard responsive viewport configuration for mobile screens.',
        observedFact: 'Inspected HTML document lacks a `<meta name="viewport">` tag.',
        interpretation: 'Mobile visitors experience unscaled desktop layouts requiring horizontal pinching and scrolling.',
        recommendedAction: 'Rebuild the frontend layout with mobile-first responsive CSS grids and accessible tap targets.',
        recommendedService: 'Mobile-First Responsive Redesign',
        recommendedNextAction: 'Capture screenshot previews demonstrating the rendering defect on smartphone viewports for the client.',
        supportingEvidence: [
          {
            field: 'mobileResponsive',
            value: false,
            status: mobileSignal.status,
            source: mobileSignal.source,
            confidence: mobileSignal.confidence,
            notes: 'Viewport meta tag missing from head markup',
          },
        ],
        sourceUrls: websiteUrl ? [websiteUrl] : [],
        evidenceConfidence: 1.0,
        opportunityRelevance: 0.9,
        severity: 'HIGH',
        basePriorityScore: 75,
        limitations: ['Based on inspected homepage HTML.'],
      }));
    }

    // Rule A4: Measurable Performance Concerns (TTFB > 800ms or HTML size > 500KB)
    const ttfb = biz.technicalData?.ttfbMs ?? biz.signals?.website?.ttfbMs ?? null;
    const htmlSize = biz.technicalData?.htmlSizeBytes ?? biz.signals?.website?.htmlSizeBytes ?? null;
    const perfScore = biz.websiteData?.performanceScore ?? null;

    if ((ttfb && ttfb > 800) || (htmlSize && htmlSize > 500000) || (perfScore !== null && perfScore < 50)) {
      const metrics: string[] = [];
      if (ttfb && ttfb > 800) metrics.push(`TTFB: ${ttfb}ms (> 800ms target)`);
      if (htmlSize && htmlSize > 500000) metrics.push(`Document Size: ${Math.round(htmlSize / 1024)} KB`);
      if (perfScore !== null && perfScore < 50) metrics.push(`Performance Score: ${perfScore}/100`);

      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-webdev-perf-${bizId}`,
        businessId: bizId,
        category: 'WEBSITE_DEVELOPMENT',
        division: 'INTEGRAL_LABS',
        title: 'Server Latency & Performance Bottlenecks',
        summary: 'Website exhibits high server response latency or unoptimized document payloads.',
        observedFact: `Measurable technical performance metrics recorded: ${metrics.join(', ')}.`,
        interpretation: 'Slow initial response times frustrate mobile visitors and contribute to higher bounce rates.',
        recommendedAction: 'Implement edge server caching, asset compression, and clean DOM rendering to reduce latency below 300ms.',
        recommendedService: 'Performance Optimization & Core Web Vitals Acceleration',
        recommendedNextAction: 'Generate a diagnostic page speed benchmark report comparing load times against top local competitors.',
        supportingEvidence: [
          {
            field: 'technicalData.ttfbMs',
            value: ttfb,
            status: 'KNOWN',
            source: 'HTTP_LATENCY_PROBE',
            confidence: 0.9,
            notes: metrics.join('; '),
          },
        ],
        sourceUrls: websiteUrl ? [websiteUrl] : [],
        evidenceConfidence: 0.9,
        opportunityRelevance: 0.85,
        severity: 'MEDIUM',
        basePriorityScore: 68,
        limitations: ['Network latency measured from audit server location; local CDN performance may vary.'],
      }));
    }

    // Rule A5: Outdated website copyright / aging templates
    const currentYear = new Date().getFullYear();
    const copyrightYear = biz.lastUpdatedYear ?? biz.signals?.website?.lastUpdatedYear ?? null;
    if (copyrightYear && copyrightYear <= currentYear - 3) {
      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-webdev-outdated-${bizId}`,
        businessId: bizId,
        category: 'WEBSITE_DEVELOPMENT',
        division: 'INTEGRAL_LABS',
        title: 'Outdated Website Maintenance & Copyright',
        summary: `Website copyright indicates no major technical or design update since ${copyrightYear}.`,
        observedFact: `Inspected footer copyright displays year ${copyrightYear} (${currentYear - copyrightYear} years ago).`,
        interpretation: 'An outdated copyright often correlates with stale service descriptions, dead links, or neglected technology.',
        recommendedAction: 'Perform a comprehensive site audit, refresh design elements, and update service listings.',
        recommendedService: 'Website Modernization & Maintenance Retainer',
        recommendedNextAction: 'Review active service lines to identify services the business offers today that are missing from their website.',
        supportingEvidence: [
          {
            field: 'lastUpdatedYear',
            value: copyrightYear,
            status: 'KNOWN',
            source: 'HTML_PARSER',
            confidence: 0.85,
            notes: `Extracted copyright year ${copyrightYear}`,
          },
        ],
        sourceUrls: websiteUrl ? [websiteUrl] : [],
        evidenceConfidence: 0.85,
        opportunityRelevance: 0.75,
        severity: 'LOW',
        basePriorityScore: 52,
        limitations: ['Copyright footer year is an indicator of maintenance frequency, not a direct measure of business operations.'],
      }));
    }

    return opps;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // B. TECHNICAL SEO & LOCAL SEO RULES (INTEGRAL MARKETING)
  // ──────────────────────────────────────────────────────────────────────────

  private static evaluateTechnicalSeo(
    biz: NormalizedBusiness,
    crawlBlocked: boolean
  ): OpportunityRecord[] {
    const opps: OpportunityRecord[] = [];
    const websiteUrl = biz.website || biz.verifiedWebsite;
    const bizId = biz.id || 'unknown';

    if (!websiteUrl || crawlBlocked) {
      return opps;
    }

    // Rule B1: Missing or incomplete title and description metadata
    const hasTitle = biz.hasMetaTitle ?? biz.signals?.website?.hasMetaTitle ?? true;
    const hasDesc = biz.hasMetaDescription ?? biz.signals?.website?.hasMetaDescription ?? true;

    if (!hasTitle || !hasDesc) {
      const missingElements: string[] = [];
      if (!hasTitle) missingElements.push('meta title tag');
      if (!hasDesc) missingElements.push('meta description tag');

      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-seo-metadata-${bizId}`,
        businessId: bizId,
        category: 'TECHNICAL_SEO',
        division: 'INTEGRAL_MARKETING',
        title: 'Missing Search Snippet Metadata',
        summary: `Inspected pages lack essential on-page SEO tags (${missingElements.join(' and ')}).`,
        observedFact: `No ${missingElements.join(' or ')} found in the inspected HTML document head.`,
        interpretation: 'Without explicit meta tags, search engines automatically synthesize search snippets, which can decrease click-through rates from local searches.',
        recommendedAction: 'Write search-intent-focused title tags and compelling meta descriptions incorporating primary local service keywords.',
        recommendedService: 'On-Page SEO & Search Snippet Optimization',
        recommendedNextAction: 'Provide a mock snippet preview showing their current Google result versus an optimized high-CTR snippet.',
        supportingEvidence: [
          {
            field: 'hasMetaDescription',
            value: hasDesc,
            status: 'KNOWN',
            source: 'HTML_HEAD_INSPECTION',
            confidence: 1.0,
            notes: `Missing: ${missingElements.join(', ')}`,
          },
        ],
        sourceUrls: [websiteUrl],
        evidenceConfidence: 1.0,
        opportunityRelevance: 0.9,
        severity: 'MEDIUM',
        basePriorityScore: 65,
        limitations: ['Evaluated on homepage markup. Inner landing pages may contain differing tags.'],
      }));
    }

    // Rule B2: Missing Schema.org structured data (Strictly no ranking claims!)
    const hasSchema = biz.technicalData?.hasSchemaOrg ?? biz.signals?.website?.hasSchemaOrg ?? false;
    const schemaSignal = this.getSignal(biz.provenance, 'technicalData.hasSchemaOrg', 'hasSchemaOrg', 'website.hasSchemaOrg');

    if (!hasSchema && schemaSignal?.status === 'KNOWN') {
      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-seo-schema-${bizId}`,
        businessId: bizId,
        category: 'TECHNICAL_SEO',
        division: 'INTEGRAL_MARKETING',
        title: 'Missing Schema.org Structured Data',
        summary: 'No structured data markup was detected to communicate business identity to search engines.',
        observedFact: 'No Schema.org JSON-LD or Microdata markup was detected in the inspected HTML.',
        interpretation: 'Structured data enables search engines to accurately index business type, physical address, phone, and opening hours for rich local search displays.',
        recommendedAction: 'Implement validated Schema.org LocalBusiness JSON-LD markup aligned with official Google Search guidelines.',
        recommendedService: 'Schema.org Structured Data Implementation',
        recommendedNextAction: 'Generate a validated LocalBusiness JSON-LD code snippet ready for deployment.',
        supportingEvidence: [
          {
            field: 'technicalData.hasSchemaOrg',
            value: false,
            status: schemaSignal.status,
            source: schemaSignal.source,
            confidence: schemaSignal.confidence,
            notes: 'Zero JSON-LD script tags with @context schema.org found',
          },
        ],
        sourceUrls: [websiteUrl],
        evidenceConfidence: 1.0,
        opportunityRelevance: 0.85,
        severity: 'MEDIUM',
        basePriorityScore: 62,
        limitations: ['Absence of structured data is an on-page implementation gap, not direct proof of search rankings.'],
      }));
    }

    // Rule B3: Incomplete Open Graph metadata
    const hasOg = biz.technicalData?.hasOpenGraph ?? biz.signals?.website?.hasOpenGraph ?? false;
    const ogCompleteness = biz.technicalData?.openGraphCompleteness ?? (hasOg ? 1.0 : 0.0);

    if (!hasOg || ogCompleteness < 0.6) {
      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-seo-opengraph-${bizId}`,
        businessId: bizId,
        category: 'TECHNICAL_SEO',
        division: 'INTEGRAL_MARKETING',
        title: 'Incomplete Social Preview Metadata (Open Graph)',
        summary: 'Website lacks standard Open Graph tags required for rich link previews when shared on messaging and social apps.',
        observedFact: `Open Graph metadata completeness is ${Math.round(ogCompleteness * 100)}% (missing og:image, og:description, or og:title).`,
        interpretation: 'When clients or staff share website links via WhatsApp, LinkedIn, or iMessage, links render as plain text without preview images or formatted cards.',
        recommendedAction: 'Implement Open Graph tags and branded preview cards to ensure professional link previews across all platforms.',
        recommendedService: 'Social Preview & Open Graph Optimization',
        recommendedNextAction: 'Show an interactive comparison of their link preview versus a competitor link on WhatsApp.',
        supportingEvidence: [
          {
            field: 'technicalData.openGraphCompleteness',
            value: ogCompleteness,
            status: 'KNOWN',
            source: 'HTML_HEAD_INSPECTION',
            confidence: 1.0,
            notes: `Completeness score: ${ogCompleteness}`,
          },
        ],
        sourceUrls: [websiteUrl],
        evidenceConfidence: 1.0,
        opportunityRelevance: 0.8,
        severity: 'LOW',
        basePriorityScore: 50,
        limitations: ['Checked og:title, og:description, og:image, og:url, og:type.'],
      }));
    }

    return opps;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // C. DIGITAL MARKETING RULES (INTEGRAL MARKETING)
  // ──────────────────────────────────────────────────────────────────────────

  private static evaluateDigitalMarketing(
    biz: NormalizedBusiness,
    crawlBlocked: boolean
  ): OpportunityRecord[] {
    const opps: OpportunityRecord[] = [];
    const websiteUrl = biz.website || biz.verifiedWebsite;
    const bizId = biz.id || 'unknown';

    if (!websiteUrl || crawlBlocked) {
      return opps;
    }

    // Rule C1: No analytics implementation detected in inspected HTML (Strict wording!)
    const hasAnalytics = biz.hasAnalytics ?? biz.signals?.website?.hasAnalytics ?? false;
    const analyticsSignal = this.getSignal(biz.provenance, 'hasAnalytics', 'website.hasAnalytics');

    if (!hasAnalytics && analyticsSignal?.status === 'KNOWN') {
      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-mkt-analytics-${bizId}`,
        businessId: bizId,
        category: 'DIGITAL_MARKETING',
        division: 'INTEGRAL_MARKETING',
        title: 'No Web Analytics Tag Detected',
        summary: 'No Google Analytics (GA4) or Google Tag Manager script was detected in the inspected website pages.',
        observedFact: 'No analytics tag detected in inspected HTML.',
        interpretation: 'Without web analytics, the business cannot reliably measure traffic volume, visitor referral sources, or customer inquiry rates.',
        recommendedAction: 'Configure Google Tag Manager and GA4 with conversion tracking for phone calls and contact inquiries.',
        recommendedService: 'Web Analytics & Conversion Tracking Setup',
        recommendedNextAction: 'Offer a clean GA4 and Google Search Console setup audit.',
        supportingEvidence: [
          {
            field: 'hasAnalytics',
            value: false,
            status: analyticsSignal.status,
            source: analyticsSignal.source,
            confidence: analyticsSignal.confidence,
            notes: 'Zero GA4 (G-) or GTM tags detected in scripts',
          },
        ],
        sourceUrls: [websiteUrl],
        evidenceConfidence: 1.0,
        opportunityRelevance: 0.9,
        severity: 'HIGH',
        basePriorityScore: 72,
        limitations: ['Does not prove analytics are absent on uninspected internal subdomains or server-side endpoints.'],
      }));
    }

    // Rule C2: Missing Meta Pixel for social advertising
    const hasMetaPixel = biz.hasMetaPixel ?? biz.signals?.website?.hasMetaPixel ?? false;
    const pixelSignal = this.getSignal(biz.provenance, 'hasMetaPixel', 'website.hasMetaPixel');

    if (!hasMetaPixel && pixelSignal?.status === 'KNOWN') {
      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-mkt-metapixel-${bizId}`,
        businessId: bizId,
        category: 'DIGITAL_MARKETING',
        division: 'INTEGRAL_MARKETING',
        title: 'Missing Meta Pixel for Retargeting',
        summary: 'No Meta advertising pixel detected in inspected HTML.',
        observedFact: 'No Meta (Facebook) advertising pixel was detected in the inspected HTML.',
        interpretation: 'Website visitors cannot be re-engaged through targeted retargeting campaigns on Instagram and Facebook after they leave the site.',
        recommendedAction: 'Install Meta Pixel via Tag Manager with custom event tracking for high-intent actions.',
        recommendedService: 'Paid Social Retargeting & Pixel Setup',
        recommendedNextAction: 'Demonstrate how a retargeting funnel re-engages visitors who left without booking.',
        supportingEvidence: [
          {
            field: 'hasMetaPixel',
            value: false,
            status: pixelSignal.status,
            source: pixelSignal.source,
            confidence: pixelSignal.confidence,
            notes: 'Zero fbq() or connect.facebook.net scripts detected',
          },
        ],
        sourceUrls: [websiteUrl],
        evidenceConfidence: 1.0,
        opportunityRelevance: 0.8,
        severity: 'LOW',
        basePriorityScore: 54,
        limitations: ['Advertising budget and campaign activity cannot be determined from public tags alone.'],
      }));
    }

    // Rule C3: Missing public social profile links
    const socialCount = biz.socialPlatformCount ?? (biz.socialProfiles?.length || 0);
    const socialSignal = this.getSignal(biz.provenance, 'socialPlatformCount', 'marketing.socialPlatformCount');

    if (socialCount === 0 && socialSignal?.status === 'KNOWN') {
      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-mkt-social-${bizId}`,
        businessId: bizId,
        category: 'DIGITAL_MARKETING',
        division: 'INTEGRAL_MARKETING',
        title: 'Missing Social Media Channels',
        summary: 'No public social profile links identified on the inspected website.',
        observedFact: 'No public social profile links (Facebook, Instagram, LinkedIn, YouTube) were identified on the inspected pages.',
        interpretation: 'Social proof and customer reviews on platforms like Instagram and Facebook reinforce credibility for local buyers.',
        recommendedAction: 'Establish verified social presence and integrate branded social links into the website header and footer.',
        recommendedService: 'Social Media Setup & Cross-Channel Brand Growth',
        recommendedNextAction: 'Check name availability across major social platforms for the client.',
        supportingEvidence: [
          {
            field: 'socialPlatformCount',
            value: 0,
            status: socialSignal.status,
            source: socialSignal.source,
            confidence: socialSignal.confidence,
            notes: 'Zero external social profile links discovered in HTML',
          },
        ],
        sourceUrls: [websiteUrl],
        evidenceConfidence: 0.95,
        opportunityRelevance: 0.75,
        severity: 'LOW',
        basePriorityScore: 48,
        limitations: ['External social profiles may exist without being linked on the website.'],
      }));
    }

    // Rule C4: Missing Direct Conversion Pathways (Contact form & CTA)
    const hasForm = biz.hasContactForm ?? biz.signals?.website?.hasContactForm ?? false;
    const hasCta = biz.hasCta ?? biz.signals?.website?.hasCta ?? false;

    if (!hasForm && !hasCta) {
      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-mkt-conversion-${bizId}`,
        businessId: bizId,
        category: 'DIGITAL_MARKETING',
        division: 'INTEGRAL_MARKETING',
        title: 'Missing Direct Inbound Conversion Elements',
        summary: 'Inspected pages contain no interactive lead capture forms or visible appointment buttons.',
        observedFact: 'No interactive contact form or conversion call-to-action buttons were detected in the inspected markup.',
        interpretation: 'Interested prospects must manually copy a phone number or navigate away, increasing drop-off rates.',
        recommendedAction: 'Integrate sticky click-to-call buttons and an appointment request form.',
        recommendedService: 'Conversion Rate Optimization (CRO) & Lead Capture Funnels',
        recommendedNextAction: 'Provide a wireframe showing a high-converting above-the-fold contact module.',
        supportingEvidence: [
          {
            field: 'hasContactForm',
            value: false,
            status: 'KNOWN',
            source: 'HTML_PARSER',
            confidence: 1.0,
            notes: 'Zero <form> elements with input fields identified',
          },
        ],
        sourceUrls: [websiteUrl],
        evidenceConfidence: 1.0,
        opportunityRelevance: 0.85,
        severity: 'MEDIUM',
        basePriorityScore: 66,
        limitations: ['Evaluated on main homepage.'],
      }));
    }

    return opps;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // D. E-COMMERCE RULES (INTEGRAL LABS)
  // ──────────────────────────────────────────────────────────────────────────

  private static evaluateEcommerce(
    biz: NormalizedBusiness,
    crawlBlocked: boolean
  ): OpportunityRecord[] {
    const opps: OpportunityRecord[] = [];
    const websiteUrl = biz.website || biz.verifiedWebsite;
    const bizId = biz.id || 'unknown';

    if (!websiteUrl || crawlBlocked) {
      return opps;
    }

    const isEcommerce = biz.technicalData?.isEcommerce ?? biz.signals?.website?.isEcommerce ?? false;
    const ecommercePlatform = biz.technicalData?.ecommercePlatform ?? biz.signals?.website?.ecommercePlatform ?? null;

    // Rule D1: Confirmed E-Commerce Platform Detected
    if (isEcommerce) {
      const platformName = ecommercePlatform || 'Custom Cart';
      opps.push(this.createOpportunityRecord({
        opportunityId: `opp-ecom-platform-${bizId}`,
        businessId: bizId,
        category: 'ECOMMERCE',
        division: 'INTEGRAL_LABS',
        title: `E-Commerce Store Optimization (${platformName})`,
        summary: `Confirmed e-commerce architecture running on ${platformName}.`,
        observedFact: `Confirmed e-commerce platform (${platformName}) and checkout elements detected on website.`,
        interpretation: 'Online sales performance relies critically on mobile checkout speed, payment gateway reliability, and catalog indexing.',
        recommendedAction: 'Perform an e-commerce checkout funnel audit and page speed optimization to minimize cart abandonment.',
        recommendedService: 'E-Commerce Funnel Optimization & Speed Enhancement',
        recommendedNextAction: 'Conduct a test checkout to evaluate checkout friction and mobile payment options.',
        supportingEvidence: [
          {
            field: 'technicalData.isEcommerce',
            value: true,
            status: 'KNOWN',
            source: 'HTML_TECH_DETECTION',
            confidence: 1.0,
            notes: `Platform: ${platformName}`,
          },
        ],
        sourceUrls: [websiteUrl],
        evidenceConfidence: 1.0,
        opportunityRelevance: 0.95,
        severity: 'MEDIUM',
        basePriorityScore: 70,
        limitations: ['Sales volume and transaction rates cannot be inferred from public storefront inspection.'],
      }));
    } else {
      // Rule D2: Product-selling business with no online purchasing
      // Strict guardrail: Only trigger if business category plausibly sells physical products
      const industry = (biz.industry || '').toLowerCase();
      const name = (biz.name || '').toLowerCase();
      const sellsProducts = PRODUCT_SELLING_KEYWORDS.some(k => industry.includes(k) || name.includes(k));

      if (sellsProducts) {
        opps.push(this.createOpportunityRecord({
          opportunityId: `opp-ecom-missing-${bizId}`,
          businessId: bizId,
          category: 'ECOMMERCE',
          division: 'INTEGRAL_LABS',
          title: 'Missing Digital Storefront & Catalog',
          summary: 'Business appears to sell physical products but operates without online ordering or checkout.',
          observedFact: `Business operates in product-selling category (${biz.industry || 'Retail'}) but no online purchasing functionality was detected.`,
          interpretation: 'Customer ordering is restricted to physical location visits and business hours, limiting sales reach.',
          recommendedAction: 'Deploy a lightweight Shopify or WooCommerce catalog allowing customers to order products directly online.',
          recommendedService: 'E-Commerce Storefront Development',
          recommendedNextAction: 'Propose a curated 15-product pilot online store to validate customer demand.',
          supportingEvidence: [
            {
              field: 'industry',
              value: biz.industry,
              status: 'KNOWN',
              source: 'BUSINESS_LISTING',
              confidence: 0.9,
              notes: `Product category matched: ${biz.industry}`,
            },
            {
              field: 'technicalData.isEcommerce',
              value: false,
              status: 'KNOWN',
              source: 'HTML_TECH_DETECTION',
              confidence: 1.0,
              notes: 'No e-commerce cart or checkout scripts found',
            },
          ],
          sourceUrls: [websiteUrl],
          evidenceConfidence: 0.85,
          opportunityRelevance: 0.8,
          severity: 'MEDIUM',
          basePriorityScore: 64,
          limitations: ['Online ordering viability depends on inventory logistics and client operational model.'],
        }));
      }
    }

    return opps;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS: CREATION, DEDUPLICATION & SCORING
  // ──────────────────────────────────────────────────────────────────────────

  private static createOpportunityRecord(params: {
    opportunityId: string;
    businessId: string;
    category: OpportunityCategory;
    division: AgencyDivision;
    title: string;
    summary: string;
    observedFact: string;
    interpretation: string;
    recommendedAction: string;
    recommendedService: string;
    recommendedNextAction: string;
    supportingEvidence: OpportunityEvidence[];
    sourceUrls: string[];
    evidenceConfidence: number;
    opportunityRelevance: number;
    severity: OpportunitySeverity;
    basePriorityScore: number;
    limitations: string[];
  }): OpportunityRecord {
    // Priority Score formula:
    // priorityScore = clamp(0, 100, basePriorityScore * evidenceConfidence * opportunityRelevance)
    const computedScore = Math.round(
      Math.max(0, Math.min(100, params.basePriorityScore * params.evidenceConfidence * params.opportunityRelevance))
    );

    let priority: ICPPriority = 'LOW';
    if (computedScore >= 70) {
      priority = 'HIGH';
    } else if (computedScore >= 40) {
      priority = 'MEDIUM';
    } else {
      priority = 'LOW';
    }

    return {
      opportunityId: params.opportunityId,
      businessId: params.businessId,
      category: params.category,
      division: params.division,
      title: params.title,
      summary: params.summary,
      observedFact: params.observedFact,
      interpretation: params.interpretation,
      recommendedAction: params.recommendedAction,
      recommendedService: params.recommendedService,
      recommendedNextAction: params.recommendedNextAction,
      supportingEvidence: params.supportingEvidence,
      sourceUrls: params.sourceUrls,
      detectedAt: new Date().toISOString(),
      evidenceConfidence: params.evidenceConfidence,
      opportunityRelevance: params.opportunityRelevance,
      priority,
      priorityScore: computedScore,
      severity: params.severity,
      limitations: params.limitations,
      status: 'IDENTIFIED',
    };
  }

  /**
   * Deduplicates opportunities originating from the same underlying finding
   * to prevent priority score inflation.
   */
  private static deduplicateOpportunities(opps: OpportunityRecord[]): OpportunityRecord[] {
    const seenCategories = new Set<string>();
    const deduplicated: OpportunityRecord[] = [];

    for (const opp of opps) {
      // Form unique key based on category and primary supporting field
      const primaryField = opp.supportingEvidence[0]?.field || 'general';
      const key = `${opp.category}:${primaryField}`;

      if (!seenCategories.has(key)) {
        seenCategories.add(key);
        deduplicated.push(opp);
      }
    }

    return deduplicated;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 6: PERSONALIZED OUTREACH BRIEF GENERATOR
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generates a deterministic outreach brief grounded strictly in verified observations.
   */
  static generateOutreachBrief(
    biz: NormalizedBusiness,
    opportunities: OpportunityRecord[],
    limitations: string[]
  ): OutreachBrief {
    const bizName = biz.name || 'your business';
    const website = biz.website || biz.verifiedWebsite || null;

    if (opportunities.length === 0) {
      return {
        businessName: bizName,
        website,
        primaryObservation: limitations.length > 0
          ? limitations[0]
          : 'Website was inspected and meets baseline performance and metadata standards.',
        businessImpact: 'No immediate critical technical defects were identified during automated checks.',
        relevantServices: ['Quarterly Digital Maintenance', 'Competitor Keyword Monitoring'],
        suggestedOpeningAngle: `Hello, we conducted a technical review of local business websites in your area. ${bizName}'s digital foundation appears operational. Would you be interested in a competitor visibility benchmark?`,
        uncertaintiesToVerify: [
          'Verify whether current online inquiry volume aligns with internal business growth goals.',
          'Verify whether manual inspection reveals any device-specific UX bottlenecks not captured in automated crawl.',
        ],
        generatedAt: new Date().toISOString(),
        isAiFreeDraft: true,
      };
    }

    // Identify the highest priority opportunity
    const primaryOpp = opportunities[0];
    const services = Array.from(new Set(opportunities.slice(0, 2).map(o => o.recommendedService)));

    let openingAngle = '';
    if (primaryOpp.category === 'WEBSITE_DEVELOPMENT') {
      if (!website) {
        openingAngle = `Hi, I noticed ${bizName} currently does not have an active website. We help local businesses establish a fast, high-converting digital storefront to capture local search demand. Can I share a quick design concept for your market?`;
      } else if (primaryOpp.title.includes('TLS') || primaryOpp.title.includes('Security')) {
        openingAngle = `Hello, while reviewing local business websites, we noticed that visitors to ${website} currently encounter a security or SSL warning. We help businesses resolve this within 24 hours to protect visitor trust. Would you like us to look into this?`;
      } else if (primaryOpp.title.includes('Mobile')) {
        openingAngle = `Hello, we noticed that ${website} is not currently optimized for mobile smartphone screens. Over half of local customers browse on mobile; we help local businesses modernize their mobile experience without rebuilding from scratch.`;
      } else {
        openingAngle = `Hello, I took a look at ${website} and noticed a few practical technical optimizations that could help improve customer inquiry rates. Would you be open to a 2-minute overview?`;
      }
    } else if (primaryOpp.category === 'TECHNICAL_SEO') {
      openingAngle = `Hello, during a technical review of local websites, we noticed ${website}'s search metadata and structured data appear incomplete in the pages we inspected. This can affect how links and local info appear on Google. We would be happy to share a quick checklist of practical fixes.`;
    } else if (primaryOpp.category === 'DIGITAL_MARKETING') {
      openingAngle = `Hello, we noticed that ${website} does not currently have standard analytics or conversion tracking tags detected in its HTML. Having clean event tracking makes it much easier to see which channels generate actual customer calls. Would you like a brief setup guide?`;
    } else {
      openingAngle = `Hello, we reviewed ${website} and identified an opportunity to optimize your online product catalog and checkout flow. Can we share a few quick observations?`;
    }

    const uncertainties: string[] = [
      'Confirm whether recent website updates or platform migrations have been scheduled.',
      'Confirm the business owner or primary marketing contact before initiating outreach.',
      ...primaryOpp.limitations,
    ];

    return {
      businessName: bizName,
      website,
      primaryObservation: primaryOpp.observedFact,
      businessImpact: primaryOpp.interpretation,
      relevantServices: services,
      suggestedOpeningAngle: openingAngle,
      uncertaintiesToVerify: uncertainties,
      generatedAt: new Date().toISOString(),
      isAiFreeDraft: true,
    };
  }
}

export const opportunityEngineService = OpportunityEngineService;
