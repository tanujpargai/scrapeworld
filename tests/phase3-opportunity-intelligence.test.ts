import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { OpportunityEngineService } from '../src/services/lead/OpportunityEngineService';
import { OpportunityAnalysisService } from '../src/services/lead/OpportunityAnalysisService';
import { DataNormalizationService } from '../src/services/icp/DataNormalizationService';
import { ICPEngineService } from '../src/services/icp/ICPEngineService';
import type { ICPProfile } from '../src/types/icp';

describe('Phase 3: Opportunity Intelligence Engine & Outreach Intelligence', () => {

  // =========================================================================
  // SUITE 1: WEBSITE DEVELOPMENT OPPORTUNITIES (INTEGRAL LABS)
  // =========================================================================
  describe('1. Website Development Opportunities (Integral Labs)', () => {
    it('should generate critical opportunity when website is confirmed unavailable after bounded check', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-no-web-1',
        name: 'Metro Electrical Contractors',
        website: null,
        phone: '555-0199',
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      assert.ok(result.totalOpportunities >= 1);

      const noWebOpp = result.opportunities.find(o => o.title === 'No Digital Web Presence');
      assert.ok(noWebOpp);
      assert.equal(noWebOpp.category, 'WEBSITE_DEVELOPMENT');
      assert.equal(noWebOpp.division, 'INTEGRAL_LABS');
      assert.equal(noWebOpp.severity, 'CRITICAL');
      assert.equal(noWebOpp.priority, 'HIGH');
      assert.ok(noWebOpp.priorityScore >= 70);

      // Verify strict 3-tier separation
      assert.ok(noWebOpp.observedFact.includes('No active website found'));
      assert.ok(noWebOpp.interpretation.includes('cannot find an official website'));
      assert.ok(noWebOpp.recommendedAction.includes('Deploy a modern, fast-loading, responsive business website'));
      assert.equal(noWebOpp.recommendedService, 'Custom Website Development & Hosting Setup');
    });

    it('should generate TLS opportunity when certificate is invalid or insecure', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-tls-fail-1',
        name: 'Cedar Valley Dental',
        website: 'https://cedardental.example.com',
        tlsData: {
          isValid: false,
          httpsConfigured: true,
          issuer: 'Untrusted CA',
          authorizationError: 'CERT_HAS_EXPIRED',
        },
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const tlsOpp = result.opportunities.find(o => o.title.includes('TLS/SSL'));
      assert.ok(tlsOpp);
      assert.equal(tlsOpp.category, 'WEBSITE_DEVELOPMENT');
      assert.equal(tlsOpp.division, 'INTEGRAL_LABS');
      assert.equal(tlsOpp.severity, 'HIGH');
      assert.ok(tlsOpp.observedFact.includes('without a valid TLS certificate'));
      assert.ok(tlsOpp.interpretation.includes('Not Secure'));
      assert.ok(tlsOpp.recommendedAction.includes('Install automated TLS certificates'));
    });

    it('should generate mobile responsiveness opportunity when viewport is missing', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-mobile-fail-1',
        name: 'Hilltop Accounting Services',
        website: 'https://hilltopaccounting.example.com',
        mobileResponsive: false,
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const mobileOpp = result.opportunities.find(o => o.title.includes('Non-Responsive Mobile'));
      assert.ok(mobileOpp);
      assert.equal(mobileOpp.division, 'INTEGRAL_LABS');
      assert.ok(mobileOpp.observedFact.includes('viewport'));
      assert.ok(mobileOpp.interpretation.includes('Mobile visitors experience unscaled desktop layouts'));
    });

    it('should generate performance opportunity when TTFB or document size exceeds threshold', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-slow-1',
        name: 'Riverside Law Associates',
        website: 'https://riversidelaw.example.com',
        technicalData: {
          ttfbMs: 1450,
          htmlSizeBytes: 650000,
        },
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const perfOpp = result.opportunities.find(o => o.title.includes('Server Latency'));
      assert.ok(perfOpp);
      assert.equal(perfOpp.division, 'INTEGRAL_LABS');
      assert.ok(perfOpp.observedFact.includes('TTFB: 1450ms'));
      assert.ok(perfOpp.interpretation.includes('Slow initial response times frustrate mobile visitors'));
    });
  });

  // =========================================================================
  // SUITE 2: TECHNICAL SEO & LOCAL SEO OPPORTUNITIES (INTEGRAL MARKETING)
  // =========================================================================
  describe('2. Technical SEO & Local SEO Opportunities (Integral Marketing)', () => {
    it('should identify missing title and meta description metadata', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-seo-meta-1',
        name: 'Apex Orthodontics',
        website: 'https://apexortho.example.com',
        hasMetaTitle: true,
        hasMetaDescription: false,
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const seoOpp = result.opportunities.find(o => o.title.includes('Missing Search Snippet Metadata'));
      assert.ok(seoOpp);
      assert.equal(seoOpp.category, 'TECHNICAL_SEO');
      assert.equal(seoOpp.division, 'INTEGRAL_MARKETING');
      assert.ok(seoOpp.observedFact.includes('meta description tag'));
      assert.ok(seoOpp.interpretation.includes('search engines automatically synthesize search snippets'));
    });

    it('should identify missing Schema.org structured data without claiming poor rankings', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-no-schema-1',
        name: 'Blue Ridge Veterinary',
        website: 'https://blueridgevet.example.com',
        technicalData: {
          hasSchemaOrg: false,
        },
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const schemaOpp = result.opportunities.find(o => o.title.includes('Missing Schema.org'));
      assert.ok(schemaOpp);
      assert.equal(schemaOpp.division, 'INTEGRAL_MARKETING');

      // Guardrail: must NOT claim missing Schema.org proves poor rankings
      assert.ok(!schemaOpp.observedFact.includes('poor rankings'));
      assert.ok(!schemaOpp.interpretation.includes('poor rankings'));
      assert.ok(schemaOpp.limitations.some(l => l.includes('not direct proof of search rankings')));
      assert.ok(schemaOpp.observedFact.includes('No Schema.org JSON-LD or Microdata markup was detected'));
    });

    it('should identify incomplete Open Graph metadata', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-og-partial-1',
        name: 'Summit Physical Therapy',
        website: 'https://summitpt.example.com',
        technicalData: {
          hasOpenGraph: false,
          openGraphCompleteness: 0.2,
        },
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const ogOpp = result.opportunities.find(o => o.title.includes('Open Graph'));
      assert.ok(ogOpp);
      assert.equal(ogOpp.division, 'INTEGRAL_MARKETING');
      assert.ok(ogOpp.observedFact.includes('20%'));
      assert.ok(ogOpp.interpretation.includes('render as plain text without preview images'));
    });
  });

  // =========================================================================
  // SUITE 3: DIGITAL MARKETING OPPORTUNITIES (INTEGRAL MARKETING)
  // =========================================================================
  describe('3. Digital Marketing Opportunities (Integral Marketing)', () => {
    it('should identify missing analytics using strict factual phrasing', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-no-ga4-1',
        name: 'Oakwood Family Practice',
        website: 'https://oakwoodfp.example.com',
        hasAnalytics: false,
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const mktOpp = result.opportunities.find(o => o.title.includes('No Web Analytics'));
      assert.ok(mktOpp);
      assert.equal(mktOpp.category, 'DIGITAL_MARKETING');
      assert.equal(mktOpp.division, 'INTEGRAL_MARKETING');

      // Guardrail: Factual phrasing "No analytics tag detected in inspected HTML"
      assert.equal(mktOpp.observedFact, 'No analytics tag detected in inspected HTML.');
      // Guardrail: Must not assert company has no marketing budget
      assert.ok(!mktOpp.interpretation.includes('no budget'));
    });

    it('should identify missing Meta advertising pixel', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-no-pixel-1',
        name: 'ClearView Eye Institute',
        website: 'https://clearvieweye.example.com',
        hasMetaPixel: false,
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const pixelOpp = result.opportunities.find(o => o.title.includes('Meta Pixel'));
      assert.ok(pixelOpp);
      assert.equal(pixelOpp.division, 'INTEGRAL_MARKETING');
      assert.ok(pixelOpp.observedFact.includes('No Meta (Facebook) advertising pixel was detected'));
    });

    it('should identify missing public social channel links', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-no-social-1',
        name: 'Premier Dental Care',
        website: 'https://premierdental.example.com',
        socialPlatformCount: 0,
        socialProfiles: [],
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const socialOpp = result.opportunities.find(o => o.title.includes('Missing Social Media'));
      assert.ok(socialOpp);
      assert.equal(socialOpp.division, 'INTEGRAL_MARKETING');
      assert.ok(socialOpp.observedFact.includes('No public social profile links'));
    });

    it('should identify missing inbound conversion elements (forms and CTAs)', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-no-cta-1',
        name: 'Pinnacle Chiropractic',
        website: 'https://pinnaclechiro.example.com',
        hasContactForm: false,
        hasCta: false,
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const ctaOpp = result.opportunities.find(o => o.title.includes('Missing Direct Inbound Conversion'));
      assert.ok(ctaOpp);
      assert.ok(ctaOpp.observedFact.includes('No interactive contact form or conversion call-to-action buttons'));
    });
  });

  // =========================================================================
  // SUITE 4: E-COMMERCE OPPORTUNITIES (INTEGRAL LABS)
  // =========================================================================
  describe('4. E-Commerce Opportunities (Integral Labs)', () => {
    it('should generate e-commerce store optimization opportunity for confirmed stores', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-ecom-1',
        name: 'Artisan Leather Works',
        website: 'https://artisanleather.example.com',
        technicalData: {
          isEcommerce: true,
          ecommercePlatform: 'Shopify',
        },
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const ecomOpp = result.opportunities.find(o => o.category === 'ECOMMERCE');
      assert.ok(ecomOpp);
      assert.equal(ecomOpp.division, 'INTEGRAL_LABS');
      assert.ok(ecomOpp.title.includes('Shopify'));
      assert.ok(ecomOpp.observedFact.includes('Confirmed e-commerce platform (Shopify)'));
      assert.equal(ecomOpp.recommendedService, 'E-Commerce Funnel Optimization & Speed Enhancement');
    });

    it('should suggest digital storefront for physical product seller lacking e-commerce', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-bakery-1',
        name: 'Sweet Treats Artisan Bakery',
        industry: 'Bakery',
        website: 'https://sweettreatsbakery.example.com',
        technicalData: {
          isEcommerce: false,
        },
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const ecomOpp = result.opportunities.find(o => o.category === 'ECOMMERCE');
      assert.ok(ecomOpp);
      assert.equal(ecomOpp.title, 'Missing Digital Storefront & Catalog');
      assert.ok(ecomOpp.observedFact.includes('product-selling category (Bakery)'));
    });

    it('should NOT suggest e-commerce storefront for professional service business lacking cart', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-lawyer-1',
        name: 'Blackwood Criminal Defense Law',
        industry: 'Legal Services',
        website: 'https://blackwoodlaw.example.com',
        technicalData: {
          isEcommerce: false,
        },
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const ecomOpp = result.opportunities.find(o => o.category === 'ECOMMERCE');
      // Guardrail: Law firm does NOT sell products; must NOT receive e-commerce storefront pitch
      assert.equal(ecomOpp, undefined);
    });
  });

  // =========================================================================
  // SUITE 5: GUARDRAILS, BLOCKED INSPECTIONS & REVENUE INFERENCE SAFEGUARDS
  // =========================================================================
  describe('5. Guardrails, Blocked Inspections & Non-Inference Rules', () => {
    it('should NOT flag website defects when crawl was blocked by HTTP 403, 429, or CAPTCHA', () => {
      const blockedBiz = DataNormalizationService.normalize({
        id: 'biz-blocked-1',
        name: 'National Financial Trust',
        website: 'https://nationalfinancial.example.com',
        raw: {
          httpStatus: 403,
          crawlBlocked: true,
        },
      });

      const result = OpportunityEngineService.analyzeOpportunities(blockedBiz);
      // Guardrail: Blocked inspection must not manufacture false technical defects
      const webDefects = result.opportunities.filter(o =>
        o.title.includes('Non-Responsive') || o.title.includes('No Web Analytics') || o.title.includes('Missing Schema')
      );
      assert.equal(webDefects.length, 0);
      assert.ok(result.brief.primaryObservation.includes('restricted (HTTP 403/429/CAPTCHA)'));
    });

    it('should deduplicate opportunities originating from identical underlying findings', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-dedup-1',
        name: 'Lakeside Therapy',
        website: 'https://lakesidetherapy.example.com',
        mobileResponsive: false,
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const mobileOpps = result.opportunities.filter(o => o.title.includes('Non-Responsive Mobile'));
      assert.equal(mobileOpps.length, 1);
    });

    it('should never infer revenue, company size, or budget from reviews or domain age', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-reviews-1',
        name: 'Popular Downtown Diner',
        website: 'https://downtowndiner.example.com',
        reviewCount: 950,
        rating: 4.8,
        domainData: {
          isRegistered: true,
          domainAgeYears: 12.0,
        },
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      for (const opp of result.opportunities) {
        assert.ok(!opp.interpretation.toLowerCase().includes('revenue'));
        assert.ok(!opp.interpretation.toLowerCase().includes('ability to pay'));
        assert.ok(!opp.interpretation.toLowerCase().includes('budget'));
      }
    });

    it('should return explicit insufficient-evidence status when no opportunities qualify', () => {
      const pristineSite = DataNormalizationService.normalize({
        id: 'biz-pristine-1',
        name: 'St. Jude Children Medical Group',
        website: 'https://stjude-example.com',
        isHttps: true,
        mobileResponsive: true,
        hasMetaTitle: true,
        hasMetaDescription: true,
        hasAnalytics: true,
        hasMetaPixel: true,
        hasContactForm: true,
        hasCta: true,
        socialPlatformCount: 3,
        tlsData: {
          isValid: true,
          httpsConfigured: true,
        },
        technicalData: {
          isEcommerce: false,
          hasOpenGraph: true,
          openGraphCompleteness: 1.0,
          hasSchemaOrg: true,
          ttfbMs: 180,
          htmlSizeBytes: 45000,
        },
      });

      const result = OpportunityEngineService.analyzeOpportunities(pristineSite);
      assert.equal(result.totalOpportunities, 0);
      assert.equal(result.highestPriorityOpportunity, null);
      assert.ok(result.insufficientEvidenceReasons);
      assert.ok(result.insufficientEvidenceReasons[0].includes('meets modern performance, SEO, security'));
    });
  });

  // =========================================================================
  // SUITE 6: DETERMINISTIC OUTREACH BRIEF GENERATION
  // =========================================================================
  describe('6. Deterministic Outreach Brief Generation', () => {
    it('should generate an evidence-grounded brief with opening angle and verification checklist', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-brief-1',
        name: 'Prestige Auto Spa',
        website: 'https://prestigeautospa.example.com',
        mobileResponsive: false,
        hasAnalytics: false,
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const brief = result.brief;

      assert.equal(brief.businessName, 'Prestige Auto Spa');
      assert.equal(brief.website, 'https://prestigeautospa.example.com');
      assert.equal(brief.isAiFreeDraft, true);

      // Verifiable opening angle
      assert.ok(brief.suggestedOpeningAngle.includes('Prestige Auto Spa') || brief.suggestedOpeningAngle.includes('prestigeautospa'));
      assert.ok(brief.suggestedOpeningAngle.includes('mobile'));

      // Human review verification checklist
      assert.ok(brief.uncertaintiesToVerify.length >= 2);
      assert.ok(brief.uncertaintiesToVerify.some(u => u.includes('Confirm the business owner') || u.includes('recent website updates')));
    });

    it('should label briefs clearly as AI-free rule drafts without personal familiarity claims', () => {
      const biz = DataNormalizationService.normalize({
        id: 'biz-brief-2',
        name: 'Horizon Dental Care',
        website: 'https://horizondental.example.com',
        tlsData: {
          isValid: false,
          httpsConfigured: true,
        },
      });

      const result = OpportunityEngineService.analyzeOpportunities(biz);
      const brief = result.brief;

      assert.equal(brief.isAiFreeDraft, true);
      assert.ok(!brief.suggestedOpeningAngle.includes('As a long-time friend'));
      assert.ok(!brief.suggestedOpeningAngle.includes('I noticed your CEO'));
      assert.ok(brief.suggestedOpeningAngle.includes('security or SSL warning'));
    });
  });

  // =========================================================================
  // SUITE 7: INTEGRATION WITH OPPORTUNITYANALYSISSERVICE & ICP ENGINE
  // =========================================================================
  describe('7. Integration with OpportunityAnalysisService & ICP Rules', () => {
    it('should populate opportunities and outreachBrief into LeadOpportunity seamlessly', () => {
      const mockBusiness = {
        name: 'Austin Family Dental',
        hasWebsite: true,
        website: 'https://austinfamilydental.example.com',
        websiteQuality: 55,
        mobileResponsive: false,
        isHttps: false,
        hasCta: false,
        hasContactForm: false,
        hasAnalytics: false,
        hasMetaPixel: false,
        socialPlatformCount: 0,
        reviewCount: 45,
        rating: 4.8,
        businessAge: 7,
      };

      const opp = OpportunityAnalysisService.analyzeOpportunity(
        mockBusiness,
        { targetService: 'WEBSITE' } as any,
        88,
        'HIGH'
      );

      // Verify backwards compatibility of legacy fields
      assert.equal(opp.type, 'WEB DEVELOPMENT OPPORTUNITY');
      assert.equal(opp.priority, 'HIGH');
      assert.ok(opp.detectedIssues.length >= 3);
      assert.ok(opp.qualifyingSignals.length >= 2);

      // Verify Phase 3 additions
      assert.ok(Array.isArray(opp.opportunities));
      assert.ok(opp.opportunities.length > 0);
      assert.ok(opp.outreachBrief);
      assert.equal(opp.outreachBrief.businessName, 'Austin Family Dental');
      assert.equal(opp.outreachBrief.isAiFreeDraft, true);
    });

    it('should allow ICP rules to evaluate opportunity intelligence aliases', () => {
      const opportunityIcp: ICPProfile = {
        id: 'icp-opp-count',
        name: 'High Opportunity Volume Prospect',
        targetService: 'FULL_SERVICE',
        rules: [
          {
            id: 'hf-has-web-opp',
            name: 'Must Have Web Dev Opportunity',
            type: 'HARD_FILTER',
            condition: {
              field: 'hasWebDevOpportunity',
              operator: 'equals',
              value: true,
            },
          },
          {
            id: 'ss-multiple-opps',
            name: 'Multiple Opportunities Identified (+25 pts)',
            type: 'SOFT_SIGNAL',
            condition: {
              field: 'opportunitiesCount',
              operator: 'greater_than_or_equal',
              value: 2,
            },
            weight: 25,
          },
        ],
      };

      const prospect = {
        name: 'Crestview Medical Center',
        website: 'https://crestviewmed.example.com',
        mobileResponsive: false,
        hasAnalytics: false,
        opportunity: OpportunityAnalysisService.analyzeOpportunity({
          name: 'Crestview Medical Center',
          website: 'https://crestviewmed.example.com',
          mobileResponsive: false,
          hasAnalytics: false,
        }),
      };

      const evalResult = ICPEngineService.evaluate(prospect, opportunityIcp);
      assert.equal(evalResult.matched, true);
      assert.equal(evalResult.score, 25);
      assert.ok(evalResult.passedHardFilters.includes('Must Have Web Dev Opportunity'));
    });
  });
});
