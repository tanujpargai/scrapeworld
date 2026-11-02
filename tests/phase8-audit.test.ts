import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ICPEngineService,
  dataNormalizationService,
  existingFilterEvaluator,
  icpScraperIntegrationService,
  WebDevRedesignICP,
  MarketingAgencyICP,
} from '../src/services/icp';
import { DeduplicationService } from '../src/services/lead/DeduplicationService';
import { OpportunityAnalysisService } from '../src/services/lead/OpportunityAnalysisService';
import { LeadManagementRepository } from '../src/repositories/LeadManagementRepository';
import { isSafePublicUrl, sanitizeExternalUrl } from '../src/lib/url-safety';
import type { ICPProfile } from '../src/types/icp';

type RawBusinessData = Record<string, any>;

describe('Phase 8: Comprehensive Pre-Production Audit & Validation Suite', () => {

  // =========================================================================
  // 1. REALISTIC TEST DATASET: 10 DISTINCT BUSINESS BENCHMARKS
  // =========================================================================
  describe('1. Realistic Test Dataset Evaluation (10 Business Benchmarks)', () => {
    const benchmarkDataset: RawBusinessData[] = [
      // 1. Established local hotel: Old business, poor website, good reviews
      {
        id: 'bench-1-hotel',
        name: 'Grand Heritage Hotel & Suites',
        industry: 'Hospitality',
        foundedYear: 2010,
        businessAge: 16,
        businessStatus: 'OPERATIONAL',
        hasWebsite: true,
        website: 'http://grandheritagehotel.example.com',
        websiteQuality: 35,
        mobileResponsive: false,
        isHttps: false,
        hasCta: false,
        hasContactForm: false,
        reviewCount: 180,
        rating: 4.6,
        phone: '512-555-1001',
        city: 'Austin',
        state: 'TX',
      },
      // 2. Modern luxury resort: Old business, excellent website, excellent marketing
      {
        id: 'bench-2-resort',
        name: 'Azure Palms Luxury Resort',
        industry: 'Resort',
        foundedYear: 2012,
        businessAge: 14,
        businessStatus: 'OPERATIONAL',
        hasWebsite: true,
        website: 'https://azurepalmsresort.example.com',
        websiteQuality: 96,
        mobileResponsive: true,
        isHttps: true,
        hasCta: true,
        hasContactForm: true,
        hasAnalytics: true,
        hasMetaPixel: true,
        socialPlatformCount: 4,
        reviewCount: 450,
        rating: 4.9,
        phone: '512-555-1002',
        city: 'Austin',
        state: 'TX',
      },
      // 3. Newly opened cafe: Recent business, no website, active Instagram
      {
        id: 'bench-3-cafe',
        name: 'Artisan Pour Cafe',
        industry: 'Cafe',
        foundedYear: new Date().getFullYear() - 1,
        businessAge: 1,
        businessStatus: 'OPERATIONAL',
        hasWebsite: false,
        website: '',
        reviewCount: 18,
        rating: 4.8,
        socialPlatformCount: 2,
        phone: '512-555-1003',
        city: 'Austin',
        state: 'TX',
      },
      // 4. B2B manufacturer: Established, outdated website, no social, no tracking
      {
        id: 'bench-4-manufacturer',
        name: 'Apex Precision Machining Works',
        industry: 'Manufacturing',
        foundedYear: 1998,
        businessAge: 28,
        businessStatus: 'OPERATIONAL',
        hasWebsite: true,
        website: 'http://apexmachining.example.com',
        websiteQuality: 38,
        mobileResponsive: false,
        isHttps: false,
        hasCta: false,
        hasContactForm: false,
        socialPlatformCount: 0,
        hasAnalytics: false,
        hasMetaPixel: false,
        reviewCount: 12,
        rating: 4.4,
        phone: '512-555-1004',
        city: 'Austin',
        state: 'TX',
      },
      // 5. High-end dental clinic: Established, mediocre website, active ad spend
      {
        id: 'bench-5-dentist',
        name: 'Prestige Smile Dentistry',
        industry: 'Dentist',
        foundedYear: 2015,
        businessAge: 11,
        businessStatus: 'OPERATIONAL',
        hasWebsite: true,
        website: 'https://prestigesmile.example.com',
        websiteQuality: 56,
        mobileResponsive: true,
        isHttps: true,
        hasCta: false,
        hasContactForm: false,
        hasAnalytics: true,
        hasMetaPixel: true,
        reviewCount: 88,
        rating: 4.8,
        phone: '512-555-1005',
        city: 'Austin',
        state: 'TX',
      },
      // 6. Budget gym: Moderate age, no website, high Google reviews
      {
        id: 'bench-6-gym',
        name: 'Iron Forge Community Gym',
        industry: 'Fitness',
        foundedYear: 2019,
        businessAge: 7,
        businessStatus: 'OPERATIONAL',
        hasWebsite: false,
        website: '',
        reviewCount: 240,
        rating: 4.7,
        phone: '512-555-1006',
        city: 'Austin',
        state: 'TX',
      },
      // 7. E-commerce apparel brand: Young, high tech stack, heavy social
      {
        id: 'bench-7-ecom',
        name: 'Veloce Street Apparel',
        industry: 'E-commerce',
        foundedYear: 2023,
        businessAge: 3,
        businessStatus: 'OPERATIONAL',
        hasWebsite: true,
        website: 'https://velocestreet.example.com',
        websiteQuality: 92,
        mobileResponsive: true,
        isHttps: true,
        hasCta: true,
        hasContactForm: true,
        hasAnalytics: true,
        hasMetaPixel: true,
        socialPlatformCount: 5,
        reviewCount: 65,
        rating: 4.5,
        phone: '512-555-1007',
        city: 'Austin',
        state: 'TX',
      },
      // 8. Commercial law firm: Established, static brochureware, high reputation
      {
        id: 'bench-8-lawyer',
        name: 'Vance, Sterling & Moore LLP',
        industry: 'Legal Services',
        foundedYear: 2004,
        businessAge: 22,
        businessStatus: 'OPERATIONAL',
        hasWebsite: true,
        website: 'http://vancesterlinglaw.example.com',
        websiteQuality: 45,
        mobileResponsive: false,
        isHttps: false,
        hasCta: false,
        hasContactForm: true,
        reviewCount: 46,
        rating: 4.9,
        phone: '512-555-1008',
        city: 'Austin',
        state: 'TX',
      },
      // 9. Inactive / permanently closed business
      {
        id: 'bench-9-closed',
        name: 'Heritage Bistro & Bakery',
        industry: 'Restaurant',
        foundedYear: 2010,
        businessAge: 16,
        businessStatus: 'PERMANENTLY_CLOSED',
        hasWebsite: true,
        website: 'http://heritagebistro.example.com',
        websiteQuality: 40,
        reviewCount: 110,
        rating: 4.3,
        phone: '512-555-1009',
        city: 'Austin',
        state: 'TX',
      },
      // 10. Incomplete listing: Business name + phone only, missing website, age, address
      {
        id: 'bench-10-incomplete',
        name: 'Apex Rapid Maintenance',
        phone: '512-555-1010',
      },
    ];

    it('should normalize all 10 benchmark listings without crashing or data loss', () => {
      const normalized = benchmarkDataset.map(b => dataNormalizationService.normalize(b));
      assert.equal(normalized.length, 10);
      assert.equal(normalized[0].name, 'Grand Heritage Hotel & Suites');
      assert.equal(normalized[9].name, 'Apex Rapid Maintenance');
      assert.equal(normalized[9].provenance.website.status, 'UNKNOWN');
      assert.equal(normalized[9].provenance.foundedYear.status, 'UNKNOWN');
    });

    it('should qualify established hotel as HIGH priority Web Dev opportunity', () => {
      const hotel = dataNormalizationService.normalize(benchmarkDataset[0]);
      const evalResult = ICPEngineService.evaluate(hotel, WebDevRedesignICP);

      assert.equal(evalResult.matched, true);
      assert.equal(evalResult.priority, 'HIGH');
      assert.ok(evalResult.score >= 70, `Expected score >= 70, got ${evalResult.score}`);
      assert.ok(evalResult.positiveSignals.some(s => s.toLowerCase().includes('website quality') || s.toLowerCase().includes('quality')));
      assert.ok(evalResult.positiveSignals.some(s => s.toLowerCase().includes('mobile')));
    });

    it('should qualify modern resort with LOW redesign priority due to excellent tech stack', () => {
      const resort = dataNormalizationService.normalize(benchmarkDataset[1]);
      const evalResult = ICPEngineService.evaluate(resort, WebDevRedesignICP);

      assert.equal(evalResult.priority, 'LOW');
      assert.ok(evalResult.score <= 40, `Expected score <= 40, got ${evalResult.score}`);
    });

    it('should reject permanently closed business via hard filter businessStatus', () => {
      const closed = dataNormalizationService.normalize(benchmarkDataset[8]);
      const evalResult = ICPEngineService.evaluate(closed, WebDevRedesignICP);

      assert.equal(evalResult.matched, false);
      assert.equal(evalResult.priority, 'LOW');
      assert.equal(evalResult.score, 0);
      assert.ok(evalResult.failedHardFilters.some(f => f.includes('Operational') || f.includes('Status')));
    });

    it('should handle incomplete listing gracefully with low score and no fabrication', () => {
      const incomplete = dataNormalizationService.normalize(benchmarkDataset[9]);
      const evalResult = ICPEngineService.evaluate(incomplete, WebDevRedesignICP);

      // Incomplete business fails hard filters (e.g. min reviews or website requirements)
      assert.equal(evalResult.matched, false);
      assert.equal(evalResult.score, 0);
      assert.equal(evalResult.priority, 'LOW');
    });
  });

  // =========================================================================
  // 2. BUSINESS AGE LOGIC & BOUNDARY CONDITIONS
  // =========================================================================
  describe('2. Business Age Validation & Boundary Conditions', () => {
    const ageTestICP: ICPProfile = {
      id: 'test-age-icp',
      name: 'Established Business Test ICP',
      targetService: 'WEBSITE_REDESIGN',
      rules: [
        {
          id: 'hf-business-age',
          name: 'Business Age >= 5 Years',
          type: 'HARD_FILTER',
          condition: {
            field: 'businessAge',
            operator: 'greater_than_or_equal',
            value: 5,
          },
        },
      ],
    };

    it('should reject a business that is 4 years 11 months old (boundary: < 5 years)', () => {
      const now = new Date();
      const fourYearsElevenMonthsAgo = new Date(now.getFullYear() - 4, now.getMonth() - 11, 1);
      
      const raw = {
        name: 'Young Venture LLC',
        foundedDate: fourYearsElevenMonthsAgo.toISOString(),
      };
      const normalized = dataNormalizationService.normalize(raw);

      assert.ok(normalized.businessAge !== undefined && normalized.businessAge !== null);
      assert.ok(normalized.businessAge! < 5, `Expected age < 5, got ${normalized.businessAge}`);

      const evalResult = ICPEngineService.evaluate(normalized, ageTestICP);
      assert.equal(evalResult.matched, false, 'Business with age 4.9y must fail >= 5y hard filter');
      assert.equal(evalResult.failedHardFilters.length, 1);
    });

    it('should accept a business that is exactly 5 years old (boundary: == 5 years)', () => {
      const now = new Date();
      const exactlyFiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

      const raw = {
        name: 'Five Year Solid Corp',
        foundedDate: exactlyFiveYearsAgo.toISOString(),
      };
      const normalized = dataNormalizationService.normalize(raw);

      assert.ok(normalized.businessAge !== undefined && normalized.businessAge !== null);
      assert.ok(normalized.businessAge! >= 5, `Expected age >= 5, got ${normalized.businessAge}`);

      const evalResult = ICPEngineService.evaluate(normalized, ageTestICP);
      assert.equal(evalResult.matched, true, 'Business with age 5.0y must pass >= 5y hard filter');
      assert.equal(evalResult.passedHardFilters.length, 1);
    });

    it('should accept a business that is 5 years 1 month old (boundary: > 5 years)', () => {
      const now = new Date();
      const fiveYearsOneMonthAgo = new Date(now.getFullYear() - 5, now.getMonth() - 1, 1);

      const raw = {
        name: 'Veteran Company LLC',
        foundedDate: fiveYearsOneMonthAgo.toISOString(),
      };
      const normalized = dataNormalizationService.normalize(raw);

      assert.ok(normalized.businessAge !== undefined && normalized.businessAge !== null);
      assert.ok(normalized.businessAge! > 5, `Expected age > 5, got ${normalized.businessAge}`);

      const evalResult = ICPEngineService.evaluate(normalized, ageTestICP);
      assert.equal(evalResult.matched, true, 'Business with age 5.08y must pass >= 5y hard filter');
    });

    it('should reject a business with UNKNOWN age and not fabricate an age', () => {
      const raw = {
        name: 'Mysterious Business',
        phone: '512-555-9999',
      };
      const normalized = dataNormalizationService.normalize(raw);

      assert.equal(normalized.businessAge, undefined);
      assert.equal(normalized.provenance.businessAge.status, 'UNKNOWN');
      assert.equal(normalized.provenance.businessAge.confidence, 0.0);

      const evalResult = ICPEngineService.evaluate(normalized, ageTestICP);
      assert.equal(evalResult.matched, false, 'Unknown business age must fail >= 5y hard filter');
    });

    it('should NOT treat website copyright start year as legal business age', () => {
      const raw = {
        name: 'Web-First Store',
        html: '<p>&copy; 2012-2024 Web-First Store. All rights reserved.</p>',
      };
      const normalized = dataNormalizationService.normalize(raw);

      // Business age must remain undefined/unknown, while websiteAgeYears records calculated age from copyright
      assert.equal(normalized.businessAge, undefined);
      assert.equal(normalized.provenance.businessAge.status, 'UNKNOWN');
      assert.equal(normalized.websiteAgeYears, new Date().getFullYear() - 2012);
      assert.equal(normalized.provenance['websiteCopyrightStartYear']?.value, 2012);
    });
  });

  // =========================================================================
  // 3. MULTI-SERVICE ICP FIT & OPPORTUNITY CLASSIFICATION
  // =========================================================================
  describe('3. Multi-Service Agency ICP Fit & Opportunity Classification', () => {
    it('should identify a Web Dev Opportunity for business with poor website and strong reputation', () => {
      const business = {
        name: 'Austin Family Chiropractor',
        hasWebsite: true,
        websiteQuality: 42,
        mobileResponsive: false,
        isHttps: false,
        hasCta: false,
        hasContactForm: false,
        reviewCount: 85,
        rating: 4.8,
        businessAge: 9,
      };

      const opp = OpportunityAnalysisService.analyzeOpportunity(
        business,
        { targetService: 'WEBSITE' } as any,
        88,
        'HIGH'
      );

      assert.equal(opp.type, 'WEB DEVELOPMENT OPPORTUNITY');
      assert.equal(opp.priority, 'HIGH');
      assert.ok(opp.detectedIssues.some(i => i.includes('Weak website quality score')));
      assert.ok(opp.detectedIssues.some(i => i.includes('Poor mobile experience')));
    });

    it('should identify a Marketing Opportunity for business with great website but no social/analytics', () => {
      const business = {
        name: 'Austin Gourmet Bistro',
        hasWebsite: true,
        websiteQuality: 85,
        mobileResponsive: true,
        isHttps: true,
        hasCta: true,
        socialPlatformCount: 0,
        hasAnalytics: false,
        hasMetaPixel: false,
        reviewCount: 65,
        rating: 4.6,
        businessAge: 6,
      };

      const opp = OpportunityAnalysisService.analyzeOpportunity(
        business,
        { targetService: 'MARKETING' } as any,
        82,
        'HIGH'
      );

      assert.equal(opp.type, 'MARKETING OPPORTUNITY');
      assert.equal(opp.priority, 'HIGH');
      assert.ok(opp.detectedIssues.some(i => i.includes('Weak social presence')));
      assert.ok(opp.detectedIssues.some(i => i.includes('Missing analytics tracking')));
    });

    it('should identify a Dual Opportunity for business with both web and marketing bottlenecks', () => {
      const business = {
        name: 'Capital City Warehouse Flooring',
        hasWebsite: true,
        websiteQuality: 45,
        mobileResponsive: false,
        isHttps: false,
        hasCta: false,
        socialPlatformCount: 0,
        hasAnalytics: false,
        hasMetaPixel: false,
        reviewCount: 40,
        rating: 4.7,
        businessAge: 12,
      };

      const opp = OpportunityAnalysisService.analyzeOpportunity(
        business,
        { targetService: 'BOTH' } as any,
        92,
        'HIGH'
      );

      assert.equal(opp.type, 'DUAL OPPORTUNITY (WEB & MARKETING)');
      assert.equal(opp.priority, 'HIGH');
      assert.ok(opp.detectedIssues.length >= 4);
    });
  });

  // =========================================================================
  // 4. MATHEMATICAL SCORING REVIEW & CLAMPING
  // =========================================================================
  describe('4. Mathematical Scoring Review, Clamping & Weight Integrity', () => {
    it('should clamp scores strictly between 0 and 100 even with massive positive weights', () => {
      const highWeightICP: ICPProfile = {
        id: 'high-weight-test',
        name: 'High Weight ICP',
        targetService: 'WEBSITE_REDESIGN',
        rules: [
          {
            id: 'sig-1',
            name: 'Weight 80',
            type: 'SOFT_SIGNAL',
            weight: 80,
            condition: { field: 'hasWebsite', operator: 'equals', value: true },
          },
          {
            id: 'sig-2',
            name: 'Weight 90',
            type: 'SOFT_SIGNAL',
            weight: 90,
            condition: { field: 'isHttps', operator: 'equals', value: false },
          },
        ],
      };

      const biz = {
        name: 'Clamped Test Business',
        hasWebsite: true,
        isHttps: false,
      };

      const result = ICPEngineService.evaluate(biz, highWeightICP);
      assert.equal(result.score, 100, 'Score should be clamped to 100 max');
    });

    it('should clamp scores to 0 minimum when negative weights exceed positive scores', () => {
      const negativeWeightICP: ICPProfile = {
        id: 'negative-weight-test',
        name: 'Negative Weight ICP',
        targetService: 'WEBSITE_REDESIGN',
        rules: [
          {
            id: 'neg-1',
            name: 'Negative Penalty -80',
            type: 'SOFT_SIGNAL',
            weight: -80,
            condition: { field: 'rating', operator: 'less_than', value: 3 },
          },
        ],
      };

      const biz = {
        name: 'Low Rating Biz',
        rating: 2.1,
      };

      const result = ICPEngineService.evaluate(biz, negativeWeightICP);
      assert.equal(result.score, 0, 'Score should be clamped to 0 min');
    });

    it('should set score to 0 and priority to LOW immediately if any hard filter fails', () => {
      const hardFilterFailingICP: ICPProfile = {
        id: 'hf-failing-test',
        name: 'Failing Hard Filter ICP',
        targetService: 'WEBSITE_REDESIGN',
        scoringConfig: {
          zeroScoreOnDisqualification: true,
        },
        rules: [
          {
            id: 'hf-1',
            name: 'Must be Operational',
            type: 'HARD_FILTER',
            condition: { field: 'businessStatus', operator: 'equals', value: 'OPERATIONAL' },
          },
          {
            id: 'sig-1',
            name: 'Huge Signal',
            type: 'SOFT_SIGNAL',
            weight: 100,
            condition: { field: 'hasWebsite', operator: 'equals', value: true },
          },
        ],
      };

      const closedBiz = {
        name: 'Closed Store',
        businessStatus: 'PERMANENTLY_CLOSED',
        hasWebsite: true,
      };

      const result = ICPEngineService.evaluate(closedBiz, hardFilterFailingICP);
      assert.equal(result.matched, false);
      assert.equal(result.score, 0);
      assert.equal(result.priority, 'LOW');
    });
  });

  // =========================================================================
  // 5. MULTI-TIERED DEDUPLICATION SERVICE AUDIT
  // =========================================================================
  describe('5. Multi-Tiered Deduplication Service Audit', () => {
    it('should detect duplicates by Google Place ID', () => {
      const lead1 = { name: 'Acme Cafe', placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4' };
      const lead2 = { name: 'Acme Cafe & Roastery', placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4' };

      const isDup = DeduplicationService.areDuplicates(lead1, lead2);
      assert.equal(isDup, true);
    });

    it('should detect duplicates by Phone across different punctuation/formatting', () => {
      const lead1 = { name: 'Blue Ridge Plumbing', phone: '+1 (512) 555-2345' };
      const lead2 = { name: 'Blue Ridge Services', phone: '512.555.2345' };

      const isDup = DeduplicationService.areDuplicates(lead1, lead2);
      assert.equal(isDup, true);
    });

    it('should detect duplicates by Domain across http/https and www variations', () => {
      const lead1 = { name: 'Hill Country Motors', website: 'https://www.hillcountrymotors.com/inventory' };
      const lead2 = { name: 'Hill Country Motors LLC', website: 'http://hillcountrymotors.com' };

      const isDup = DeduplicationService.areDuplicates(lead1, lead2);
      assert.equal(isDup, true);
    });

    it('should detect duplicates by Case-Insensitive Email', () => {
      const lead1 = { name: 'Austin Legal', email: 'Contact@AustinLegal.com' };
      const lead2 = { name: 'Austin Law Office', email: 'contact@austinlegal.com' };

      const isDup = DeduplicationService.areDuplicates(lead1, lead2);
      assert.equal(isDup, true);
    });

    it('should detect duplicates by Normalized Name + City composite key', () => {
      const lead1 = { name: 'Lone Star Electric, Inc.', city: 'Austin' };
      const lead2 = { name: 'Lone Star Electric LLC', city: 'Austin' };

      const isDup = DeduplicationService.areDuplicates(lead1, lead2);
      assert.equal(isDup, true);
    });

    it('should deduplicate a batch while preserving the most data-rich record', () => {
      const batch = [
        {
          id: '1',
          name: 'Pioneer Dental',
          phone: '512-555-7890',
          city: 'Austin',
        },
        {
          id: '2',
          name: 'Pioneer Dental Group',
          phone: '(512) 555-7890',
          website: 'https://pioneerdental.example.com',
          rating: 4.8,
          reviewCount: 95,
          city: 'Austin',
        },
        {
          id: '3',
          name: 'Different Dental Office',
          phone: '512-555-1111',
          city: 'Austin',
        },
      ];

      const { unique: deduplicated } = DeduplicationService.deduplicateBatch(batch);
      assert.equal(deduplicated.length, 2, 'Batch of 3 with 1 duplicate pair should yield 2 items');
      
      const pioneer = deduplicated.find(d => (d as any).phone.includes('7890')) as any;
      assert.ok(pioneer);
      // Ensure richer record with website and review data was preserved
      assert.ok(pioneer.website);
      assert.equal(pioneer.rating, 4.8);
    });
  });

  // =========================================================================
  // 6. SECURITY & SSRF PROTECTION REVIEW
  // =========================================================================
  describe('6. Security & SSRF Protection Review', () => {
    it('should block local loopback addresses and private IPs from scraping', () => {
      assert.equal(isSafePublicUrl('http://127.0.0.1:3000'), false);
      assert.equal(isSafePublicUrl('http://localhost:8080'), false);
      assert.equal(isSafePublicUrl('http://[::1]'), false);
      assert.equal(isSafePublicUrl('http://10.0.0.1/admin'), false);
      assert.equal(isSafePublicUrl('http://192.168.1.1/router'), false);
      assert.equal(isSafePublicUrl('http://172.16.0.1/internal'), false);
    });

    it('should block cloud metadata endpoints (169.254.169.254)', () => {
      assert.equal(isSafePublicUrl('http://169.254.169.254/latest/meta-data/'), false);
      assert.equal(isSafePublicUrl('http://metadata.google.internal'), false);
    });

    it('should block dangerous non-HTTP URI schemes', () => {
      assert.equal(isSafePublicUrl('file:///etc/passwd'), false);
      assert.equal(isSafePublicUrl('javascript:alert(1)'), false);
      assert.equal(isSafePublicUrl('data:text/html,<h1>test</h1>'), false);
      assert.equal(isSafePublicUrl('ftp://ftp.example.com/files'), false);
    });

    it('should allow valid public HTTP and HTTPS URLs', () => {
      assert.equal(isSafePublicUrl('https://www.google.com'), true);
      assert.equal(isSafePublicUrl('http://example.com/contact-us'), true);
      assert.equal(isSafePublicUrl('https://austindentistry.com'), true);
    });

    it('should sanitize external URLs and prepend https to bare domains', () => {
      assert.equal(sanitizeExternalUrl('example.com'), 'https://example.com/');
      assert.equal(sanitizeExternalUrl('http://127.0.0.1:8080'), null);
      assert.equal(sanitizeExternalUrl('invalid-url-$$$'), null);
    });
  });

  // =========================================================================
  // 7. KEYWORD OPERATORS EDGE CASES & TOKEN SANITIZATION
  // =========================================================================
  describe('7. Keyword Operators Edge Cases & Token Sanitization', () => {
    it('should NOT treat empty string keywords as matching everything', () => {
      const emptyKeywordICP: ICPProfile = {
        id: 'empty-keyword-icp',
        name: 'Empty Keyword ICP',
        targetService: 'WEBSITE_REDESIGN',
        rules: [
          {
            id: 'kw-1',
            name: 'Contains Empty Keyword',
            type: 'SOFT_SIGNAL',
            weight: 50,
            condition: {
              field: 'name',
              operator: 'contains',
              value: '', // empty value
            },
          },
        ],
      };

      const biz = { name: 'General Contractor' };
      const result = ICPEngineService.evaluate(biz, emptyKeywordICP);
      assert.equal(result.score, 0, 'Empty keyword should not match or award score');
    });

    it('should correctly handle whitespace-only tokens in contains_all', () => {
      const whitespaceICP: ICPProfile = {
        id: 'whitespace-icp',
        name: 'Whitespace ICP',
        targetService: 'WEBSITE_REDESIGN',
        rules: [
          {
            id: 'kw-2',
            name: 'Contains All Clean Tokens',
            type: 'SOFT_SIGNAL',
            weight: 30,
            condition: {
              field: 'name',
              operator: 'contains_all',
              value: 'Plumbing,   , Austin', // Contains blank space token
            },
          },
        ],
      };

      const matchingBiz = { name: 'Austin Precision Plumbing Services' };
      const nonMatchingBiz = { name: 'Dallas Precision Plumbing Services' };

      const matchResult = ICPEngineService.evaluate(matchingBiz, whitespaceICP);
      const nonMatchResult = ICPEngineService.evaluate(nonMatchingBiz, whitespaceICP);

      assert.equal(matchResult.score, 30);
      assert.equal(nonMatchResult.score, 0);
    });
  });

  // =========================================================================
  // 8. COMPLETE 14-STEP AGENCY WORKFLOW SIMULATION
  // =========================================================================
  describe('8. Real-World 14-Step Agency Prospecting Simulation', () => {
    const leadRepo = new LeadManagementRepository();

    it('should complete all 14 end-to-end prospecting steps seamlessly', async () => {
      // Step 1: Agency configures Web Revamp ICP
      const AgencyWebRevampICP: ICPProfile = {
        id: 'agency-web-revamp',
        name: 'Agency Web Revamp Qualification',
        targetService: 'WEBSITE_REDESIGN',
        scoringConfig: {
          zeroScoreOnDisqualification: true,
        },
        rules: [
          {
            id: 'hf-operational',
            name: 'Operational Business',
            type: 'HARD_FILTER',
            condition: { field: 'businessStatus', operator: 'equals', value: 'OPERATIONAL' },
          },
          {
            id: 'sig-low-quality',
            name: 'Outdated / Poor Website',
            type: 'SOFT_SIGNAL',
            weight: 40,
            condition: { field: 'websiteQuality', operator: 'less_than', value: 60 },
          },
          {
            id: 'sig-no-mobile',
            name: 'Non-Responsive Mobile Experience',
            type: 'SOFT_SIGNAL',
            weight: 30,
            condition: { field: 'mobileResponsive', operator: 'equals', value: false },
          },
          {
            id: 'sig-established-reviews',
            name: 'Established Customer Demand',
            type: 'SOFT_SIGNAL',
            weight: 30,
            condition: { field: 'reviewCount', operator: 'greater_than_or_equal', value: 20 },
          },
        ],
      };

      // Step 2: Agency configures Marketing Retargeting ICP
      const AgencyMarketingICP: ICPProfile = {
        id: 'agency-marketing-retargeting',
        name: 'Agency Marketing & Retargeting Growth',
        targetService: 'MARKETING_AGENCY',
        scoringConfig: {
          zeroScoreOnDisqualification: true,
        },
        rules: [
          {
            id: 'hf-operational-mkt',
            name: 'Operational Business',
            type: 'HARD_FILTER',
            condition: { field: 'businessStatus', operator: 'equals', value: 'OPERATIONAL' },
          },
          {
            id: 'sig-no-analytics',
            name: 'Missing Analytics / GA4',
            type: 'SOFT_SIGNAL',
            weight: 40,
            condition: { field: 'hasAnalytics', operator: 'equals', value: false },
          },
          {
            id: 'sig-no-pixel',
            name: 'Missing Ad Retargeting Pixel',
            type: 'SOFT_SIGNAL',
            weight: 35,
            condition: { field: 'hasMetaPixel', operator: 'equals', value: false },
          },
          {
            id: 'sig-reviews',
            name: 'Established Footprint',
            type: 'SOFT_SIGNAL',
            weight: 25,
            condition: { field: 'reviewCount', operator: 'greater_than_or_equal', value: 15 },
          },
        ],
      };

      // Step 3: Raw batch with prospective leads and a duplicate listing
      const rawScrapedBatch: RawBusinessData[] = [
        {
          id: 'sim-lead-1',
          name: 'Cedar Park Roofing & Exteriors',
          industry: 'Roofing Contractor',
          foundedYear: 2011,
          businessStatus: 'OPERATIONAL',
          hasWebsite: true,
          website: 'http://cedarparkroofing.example.com',
          websiteQuality: 35,
          mobileResponsive: false,
          isHttps: false,
          hasAnalytics: false,
          hasMetaPixel: false,
          reviewCount: 95,
          rating: 4.8,
          phone: '512-555-8888',
          city: 'Cedar Park',
          state: 'TX',
        },
        // Duplicate of lead 1 with different phone format and slight name difference
        {
          id: 'sim-lead-1-dup',
          name: 'Cedar Park Roofing and Exteriors LLC',
          phone: '(512) 555-8888',
          city: 'Cedar Park',
          state: 'TX',
        },
        {
          id: 'sim-lead-2',
          name: 'Oak Creek Medical Aesthetics',
          industry: 'Medical Spa',
          foundedYear: 2016,
          businessStatus: 'OPERATIONAL',
          hasWebsite: true,
          website: 'https://oakcreekaesthetics.example.com',
          websiteQuality: 92,
          mobileResponsive: true,
          isHttps: true,
          hasAnalytics: false, // Marketing opportunity
          hasMetaPixel: false,
          reviewCount: 140,
          rating: 4.9,
          phone: '512-555-9999',
          city: 'Austin',
          state: 'TX',
        },
        {
          id: 'sim-lead-3-closed',
          name: 'Defunct Auto Body Shop',
          industry: 'Automotive',
          businessStatus: 'PERMANENTLY_CLOSED',
          reviewCount: 30,
          phone: '512-555-0000',
        },
      ];

      // Step 4: Normalization
      const normalizedBatch = rawScrapedBatch.map(b => dataNormalizationService.normalize(b));
      assert.equal(normalizedBatch.length, 4);

      // Step 5: Multi-attribute deduplication
      const { unique: deduplicatedBatch } = DeduplicationService.deduplicateBatch(normalizedBatch);
      assert.equal(deduplicatedBatch.length, 3, 'Duplicate roofing lead must be eliminated');

      // Step 6: Existing Filter evaluation (reject closed businesses)
      const operationalLeads = deduplicatedBatch.filter(b => b.businessStatus === 'OPERATIONAL');
      assert.equal(operationalLeads.length, 2, 'Closed business must be filtered out');

      // Step 7: Web Dev Qualification
      const webBatch = await icpScraperIntegrationService.qualifyBatch(operationalLeads, AgencyWebRevampICP);
      const webQualified = webBatch.qualified;
      assert.equal(webQualified.length, 2);

      // Lead 1 should be Top Web Dev Prospect
      const topWebLead = webQualified.find(l => l.business.name.includes('Cedar Park Roofing'));
      assert.ok(topWebLead);
      assert.equal(topWebLead.matched, true);
      assert.equal(topWebLead.priority, 'HIGH');
      assert.equal(topWebLead.score, 100); // 40 (low quality) + 30 (no mobile) + 30 (reviews >= 20)

      // Step 8: Marketing Qualification
      const mktBatch = await icpScraperIntegrationService.qualifyBatch(operationalLeads, AgencyMarketingICP);
      const mktQualified = mktBatch.qualified;
      const topMktLead = mktQualified.find(l => l.business.name.includes('Oak Creek'));
      assert.ok(topMktLead);
      assert.equal(topMktLead.matched, true);
      assert.equal(topMktLead.score, 100); // 40 (no analytics) + 35 (no pixel) + 25 (reviews >= 15)

      // Step 9: Verify Hard Filter Disqualification on closed lead
      const closedEval = ICPEngineService.evaluate(deduplicatedBatch.find(b => b.businessStatus !== 'OPERATIONAL')!, AgencyWebRevampICP);
      assert.equal(closedEval.matched, false);
      assert.equal(closedEval.score, 0);

      // Step 10 & 11: Priority & Deterministic Opportunity Explanation
      const oppAnalysis = OpportunityAnalysisService.analyzeOpportunity(
        topWebLead.business,
        AgencyWebRevampICP,
        topWebLead.score,
        topWebLead.priority
      );
      assert.equal(oppAnalysis.type, 'WEB DEVELOPMENT OPPORTUNITY');
      assert.equal(oppAnalysis.priority, 'HIGH');
      assert.ok(oppAnalysis.detectedIssues.includes('Weak website quality score (< 60)'));
      assert.ok(oppAnalysis.detectedIssues.includes('Poor mobile experience (Missing viewport optimization)'));

      // Step 12: Ingest top lead into LeadManagementRepository
      const targetLeadId = topWebLead.business.id || 'sim-lead-1';
      const ingested = leadRepo.upsertLead({
        id: targetLeadId,
        businessId: targetLeadId,
        businessName: topWebLead.business.name,
        targetService: 'WEBSITE',
        icpId: topWebLead.icpId || undefined,
        icpName: topWebLead.icpName || 'Web Revamp',
        icpScore: topWebLead.score,
        priority: topWebLead.priority,
        status: 'NEW',
        contact: {
          phone: topWebLead.business.phone || undefined,
          city: topWebLead.business.city || undefined,
        },
        website: topWebLead.business.website || undefined,
        opportunity: oppAnalysis,
      });
      assert.ok(ingested);

      // Step 13: Move Top Lead through CRM Lifecycle
      let crmLead = await leadRepo.getLeadById(targetLeadId);
      assert.ok(crmLead);
      assert.equal(crmLead.status, 'NEW');

      // Transition to QUALIFIED
      await leadRepo.updateLeadStatus(targetLeadId, 'QUALIFIED');
      await leadRepo.addNote(targetLeadId, 'Audited technical deficits confirm high client value.');
      crmLead = await leadRepo.getLeadById(targetLeadId);
      assert.ok(crmLead);
      assert.equal(crmLead.status, 'QUALIFIED');

      // Transition to CONTACTED
      await leadRepo.updateLeadStatus(targetLeadId, 'CONTACTED');
      await leadRepo.addNote(targetLeadId, 'Outreached via phone to owner Dr./Mr. Miller.');
      crmLead = await leadRepo.getLeadById(targetLeadId);
      assert.ok(crmLead);
      assert.equal(crmLead.status, 'CONTACTED');

      // Transition to MEETING
      await leadRepo.updateLeadStatus(targetLeadId, 'MEETING');
      await leadRepo.addNote(targetLeadId, 'Demo scheduled for Friday 2 PM.');
      crmLead = await leadRepo.getLeadById(targetLeadId);
      assert.ok(crmLead);
      assert.equal(crmLead.status, 'MEETING');

      // Transition to WON
      await leadRepo.updateLeadStatus(targetLeadId, 'WON');
      await leadRepo.addNote(targetLeadId, 'Signed 6-month website modernization retainer.');
      crmLead = await leadRepo.getLeadById(targetLeadId);
      assert.ok(crmLead);
      assert.equal(crmLead.status, 'WON');
      assert.ok(crmLead.notes.length >= 4, 'Should contain audit trail note entries');

      // Step 14: Export leads
      const csvExport = await leadRepo.exportLeadsToCsv();
      assert.ok(csvExport.includes('Cedar Park Roofing'));
      assert.ok(csvExport.includes('WON'));
      assert.ok(csvExport.includes('HIGH'));

      const jsonExport = await leadRepo.exportLeadsToJson();
      assert.ok(Array.isArray(jsonExport));
      assert.equal(jsonExport.find((p) => p.id === targetLeadId)?.status, 'WON');
    });
  });
});
