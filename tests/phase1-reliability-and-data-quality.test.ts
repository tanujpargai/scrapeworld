import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OfferIntelligenceService } from '../src/services/OfferIntelligenceService';
import {
  DataNormalizationService,
  ICPEngineService,
  WebDevRedesignICP,
  MarketingAgencyICP,
} from '../src/services/icp';
import { classifyAuditError } from '../src/lib/audit-classifier';
import { isSafePublicUrl, sanitizeExternalUrl } from '../src/lib/url-safety';
import { Severity } from '@prisma/client';

describe('Phase 1: Reliability, Audit Accuracy & Data Quality Regression Suite', () => {

  // =========================================================================
  // 1. REVIEW COUNTS NOT TREATED AS PROOF OF FINANCIAL CAPACITY
  // =========================================================================
  describe('1. Review counts not treated as proof of financial capacity', () => {
    const offerService = new OfferIntelligenceService();

    it('should NOT infer High ability to pay or Large business size solely from high review count', () => {
      const highReviewBusiness = {
        name: 'The Popular Bakery & Gelato',
        industry: 'bakery',
        city: 'Delhi',
        phone: '+91 98111 22233',
        email: 'info@popularbakery.example.com',
        rating: 4.8,
        reviewCount: 950, // 950 reviews!
        verifiedWebsite: 'https://popularbakery.example.com',
        ownerName: null,
        ownerLinkedIn: null,
        ownerEmail: null,
        ownerConfidence: null,
        enterpriseFlag: false,
        franchiseFlag: false,
        websiteData: {
          overallScore: 70,
          seoScore: 70,
          performanceScore: 70,
          sslEnabled: true,
          securityScore: 80,
        },
        socialProfiles: [],
        opportunities: [],
      };

      const result = offerService.calculate(highReviewBusiness);

      // Review count must NOT produce unsupported financial claims
      assert.equal(result.abilityToPay, 'Unknown');
      assert.equal(result.businessSize, 'Unknown');

      // However, underlying review observation is preserved for pitch angle & confidence
      assert.ok(result.offerConfidence >= 75);
      assert.ok(result.firstTouchStrategy.includes('950'));
    });

    it('should NOT penalize businesses with low review counts as having Low ability to pay', () => {
      const nicheB2BBusiness = {
        name: 'Precision Heavy Industrial Moulding Ltd',
        industry: 'manufacturing',
        city: 'Pune',
        phone: '+91 20 2233 4455',
        email: 'sales@precisionmoulding.example.com',
        rating: 4.5,
        reviewCount: 3, // Only 3 reviews, but high-ticket commercial B2B enterprise
        verifiedWebsite: 'https://precisionmoulding.example.com',
        ownerName: null,
        ownerLinkedIn: null,
        ownerEmail: null,
        ownerConfidence: null,
        enterpriseFlag: false,
        franchiseFlag: false,
        websiteData: null,
        socialProfiles: [],
        opportunities: [],
      };

      const result = offerService.calculate(nicheB2BBusiness);

      // Must remain Unknown, NOT assumed to be poor or destitute
      assert.equal(result.abilityToPay, 'Unknown');
      assert.equal(result.businessSize, 'Unknown');
    });

    it('should distinguish verified organizational classifications (enterprise/franchise)', () => {
      const corporateEnterprise = {
        name: 'Enterprise Healthcare Systems',
        industry: 'hospital',
        city: 'Mumbai',
        phone: '+91 22 1122 3344',
        email: null,
        rating: 4.2,
        reviewCount: 50,
        verifiedWebsite: 'https://enterprisehealthcare.example.com',
        ownerName: null,
        ownerLinkedIn: null,
        ownerEmail: null,
        ownerConfidence: null,
        enterpriseFlag: true, // Explicit verified corporate tier
        franchiseFlag: false,
        websiteData: null,
        socialProfiles: [],
        opportunities: [],
      };

      const result = offerService.calculate(corporateEnterprise);
      assert.equal(result.businessSize, 'Large');
      assert.equal(result.abilityToPay, 'High');
    });
  });

  // =========================================================================
  // 2. MISSING FINANCIAL INFORMATION REMAINING UNKNOWN (NO DISQUALIFICATION)
  // =========================================================================
  describe('2. Missing financial information remaining unknown', () => {
    it('should mark unverified employee and financial indicators as explicitly UNKNOWN', () => {
      const rawListing = {
        name: 'Aroma Spice Kitchen',
        industry: 'Restaurant',
        address: 'Connaught Place, New Delhi',
        rating: 4.3,
        reviewCount: 45,
        website: 'https://aromaspice.example.com',
        phone: '+91 11 2345 6789',
      };

      const normalized = DataNormalizationService.normalize(rawListing);

      assert.equal(normalized.employeeCount, null);
      assert.equal(normalized.provenance['employeeCount'].status, 'UNKNOWN');
      assert.equal(normalized.provenance['employeeCount'].confidence, 0.0);
      assert.equal(normalized.signals.business.employeeCount, null);
    });

    it('should NOT automatically disqualify a business with unknown financials in ICP evaluation', () => {
      const rawListing = {
        name: 'Apex Dental Care Clinic',
        industry: 'Dental Clinic',
        rating: 4.6,
        reviewCount: 60,
        website: 'http://apexdental.example.com',
        phone: '+91 98111 55667',
        businessStatus: 'OPERATIONAL',
        websiteData: {
          overallScore: 45,
          performanceScore: 40,
          sslEnabled: false,
        },
      };

      const normalized = DataNormalizationService.normalize(rawListing);
      const evalResult = ICPEngineService.evaluate(normalized, WebDevRedesignICP);

      // Business qualifies on demonstrated customer activity and web deficiency,
      // without being disqualified due to absence of private revenue figures
      assert.equal(evalResult.matched, true);
      assert.ok(evalResult.priority === 'MEDIUM' || evalResult.priority === 'HIGH');
    });
  });

  // =========================================================================
  // 3. BLOCKED WEBSITES NOT LABELLED DEFINITIVELY BROKEN
  // =========================================================================
  describe('3. Blocked websites not labelled definitively broken', () => {
    it('should classify HTTP 403 / Cloudflare challenges as WAF_PROTECTED, not broken', () => {
      const cloudflareError = {
        response: {
          status: 403,
          headers: {
            'server': 'cloudflare',
            'cf-ray': '8f123456789abcde-DEL',
          },
          data: '<html><head><title>Attention Required! | Cloudflare</title></head><body>Please verify you are a human</body></html>',
        },
      };

      const failure = classifyAuditError(cloudflareError);

      assert.equal(failure.category, 'WAF_PROTECTED');
      assert.equal(failure.isBlockedByWaf, true);
      assert.equal(failure.severity, Severity.LOW);
      assert.equal(failure.issueTitle, 'Automated Audit Restricted by WAF / Anti-Bot Protection');
      assert.ok(failure.message.includes('WAF / Anti-Bot controls'));
      assert.ok(failure.recommendation.includes('online and protected'));
    });

    it('should classify HTTP 429 rate limit responses as WAF_PROTECTED', () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: {},
          data: 'Too Many Requests',
        },
      };

      const failure = classifyAuditError(rateLimitError);
      assert.equal(failure.category, 'WAF_PROTECTED');
      assert.equal(failure.isBlockedByWaf, true);
    });

    it('should distinguish DNS failures from WAF blocks', () => {
      const dnsError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND non-existent-domain-xyz123.com',
      };

      const failure = classifyAuditError(dnsError);
      assert.equal(failure.category, 'DNS_FAILURE');
      assert.equal(failure.isBlockedByWaf, false);
      assert.equal(failure.severity, Severity.CRITICAL);
    });

    it('should distinguish connection timeouts from WAF blocks', () => {
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'connect ETIMEDOUT 93.184.216.34:443',
      };

      const failure = classifyAuditError(timeoutError);
      assert.equal(failure.category, 'CONNECTION_TIMEOUT');
      assert.equal(failure.isBlockedByWaf, false);
      assert.equal(failure.severity, Severity.HIGH);
    });

    it('should distinguish connection refused from WAF blocks', () => {
      const connRefusedError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:443',
      };

      const failure = classifyAuditError(connRefusedError);
      assert.equal(failure.category, 'CONFIRMED_UNAVAILABLE');
      assert.equal(failure.severity, Severity.CRITICAL);
    });

    it('should distinguish HTTP 404 Not Found from WAF blocks', () => {
      const notFoundError = {
        response: {
          status: 404,
          data: 'Not Found',
        },
      };

      const failure = classifyAuditError(notFoundError);
      assert.equal(failure.category, 'HTTP_ERROR');
      assert.equal(failure.statusCode, 404);
      assert.equal(failure.issueTitle, 'HTTP 404 Not Found');
    });
  });

  // =========================================================================
  // 4. FAILED ENRICHMENT PRESERVING EXISTING VERIFIED DATA
  // =========================================================================
  describe('4. Failed enrichment preserving existing verified data', () => {
    it('should NOT overwrite verified attributes with null/empty values when enrichment fails', () => {
      const verifiedBusiness = DataNormalizationService.normalize({
        id: 'biz-101',
        name: 'Heritage Law Chambers',
        industry: 'Legal Services',
        phone: '+91 11 2338 1234',
        email: 'advocate@heritagelaw.example.com',
        website: 'https://heritagelaw.example.com',
        rating: 4.7,
        reviewCount: 38,
        websiteQuality: 78,
        cms: 'WordPress',
        detectedTechnologies: ['WordPress', 'PHP', 'jQuery', 'Google Analytics'],
        isHttps: true,
        mobileResponsive: true,
        hasContactForm: true,
      });

      // Simulated subsequent failed crawl / unreachable inspection
      const failedAuditPayload = {
        website: null,
        phone: null,
        email: null,
        cms: null,
        websiteQuality: undefined,
        isHttps: false,
        mobileResponsive: false,
        detectedTechnologies: [],
      };

      const merged = DataNormalizationService.mergeEnrichment(
        verifiedBusiness,
        failedAuditPayload,
        'FAILED_AUDIT_ATTEMPT'
      );

      // Verified facts must remain intact
      assert.equal(merged.name, 'Heritage Law Chambers');
      assert.equal(merged.phone, '+91 11 2338 1234');
      assert.equal(merged.hasPhone, true);
      assert.equal(merged.email, 'advocate@heritagelaw.example.com');
      assert.equal(merged.hasEmail, true);
      assert.equal(merged.website, 'https://heritagelaw.example.com');
      assert.equal(merged.hasWebsite, true);
      assert.equal(merged.cms, 'WordPress');
      assert.equal(merged.isHttps, true);
      assert.equal(merged.mobileResponsive, true);
      assert.equal(merged.hasContactForm, true);
      assert.ok(merged.detectedTechnologies.includes('WordPress'));
    });
  });

  // =========================================================================
  // 5. PROVENANCE PRESERVED AND CONFLICTS IDENTIFIED
  // =========================================================================
  describe('5. Provenance preserved and conflicts identified', () => {
    it('should preserve collection timestamp and source in provenance during normalization', () => {
      const raw = {
        name: 'Metro Diagnostics & Lab',
        industry: 'Diagnostic Center',
        phone: '+91 99111 88888',
        source: 'GOOGLE_MAPS_OFFICIAL',
      };

      const normalized = DataNormalizationService.normalize(raw);

      assert.ok(normalized.provenance['name']);
      assert.equal(normalized.provenance['name'].status, 'KNOWN');
      assert.equal(normalized.provenance['name'].source, 'GOOGLE_MAPS_OFFICIAL');
      assert.ok(normalized.provenance['name'].timestamp);
      // Valid ISO timestamp
      assert.ok(!isNaN(new Date(normalized.provenance['name'].timestamp).getTime()));
    });

    it('should identify and log conflicting information across sources rather than discarding it', () => {
      const existingRecord = DataNormalizationService.normalize({
        id: 'biz-conflict-1',
        name: 'Sunrise Dental Clinic',
        industry: 'Dentist',
        phone: '+91 11 4455 6677', // Verified Google Maps landline
        rating: 4.6,
        reviewCount: 40,
        source: 'GOOGLE_MAPS',
      });

      // Website crawl returns a different mobile number
      const incomingCrawl = {
        phone: '+91 98111 00000', // Alternate mobile from website footer
      };

      const merged = DataNormalizationService.mergeEnrichment(
        existingRecord,
        incomingCrawl,
        'WEBSITE_FOOTER_CRAWL'
      );

      // Conflicting phone number must be tracked
      assert.ok(Array.isArray(merged.conflicts));
      assert.equal(merged.conflicts.length, 1);

      const phoneConflict = merged.conflicts[0];
      assert.equal(phoneConflict.field, 'phone');
      assert.equal(phoneConflict.existingValue, '+91 11 4455 6677');
      assert.equal(phoneConflict.incomingValue, '+91 98111 00000');
      assert.ok(phoneConflict.timestamp);
      assert.ok(phoneConflict.resolution);

      // Provenance notes should reflect the conflict event
      assert.ok(merged.provenance['phone'].notes?.includes('conflict'));
    });
  });

  // =========================================================================
  // 6. SSRF PROTECTIONS REJECTING UNSAFE DESTINATIONS
  // =========================================================================
  describe('6. SSRF protections rejecting unsafe destinations', () => {
    it('should reject loopback addresses and private IP ranges', () => {
      assert.equal(isSafePublicUrl('http://localhost'), false);
      assert.equal(isSafePublicUrl('http://127.0.0.1'), false);
      assert.equal(isSafePublicUrl('http://127.0.0.8:8080'), false);
      assert.equal(isSafePublicUrl('http://10.0.0.1/admin'), false);
      assert.equal(isSafePublicUrl('http://192.168.1.1/router'), false);
      assert.equal(isSafePublicUrl('http://172.16.0.1/internal'), false);
      assert.equal(isSafePublicUrl('http://172.31.255.255'), false);
    });

    it('should reject cloud metadata endpoints', () => {
      assert.equal(isSafePublicUrl('http://169.254.169.254/latest/meta-data/'), false);
      assert.equal(isSafePublicUrl('http://169.254.1.1'), false);
    });

    it('should accept valid public websites', () => {
      assert.equal(isSafePublicUrl('https://google.com'), true);
      assert.equal(isSafePublicUrl('https://github.com/microsoft'), true);
      assert.equal(isSafePublicUrl('http://example.com/contact'), true);
      assert.equal(isSafePublicUrl('https://sub.domain.co.uk'), true);
    });

    it('should classify SSRF errors appropriately in classifyAuditError', () => {
      const ssrfError = new Error('SSRF Blocked: Unsafe destination 169.254.169.254');
      const failure = classifyAuditError(ssrfError);

      assert.equal(failure.category, 'UNSAFE_DESTINATION');
      assert.equal(failure.severity, Severity.CRITICAL);
      assert.equal(failure.issueTitle, 'Unsafe Destination Blocked (SSRF)');
    });
  });

  // =========================================================================
  // 7. EXISTING ICP PROFILES RETAINING EXPECTED BEHAVIOR
  // =========================================================================
  describe('7. Existing ICP profiles retaining expected behavior', () => {
    it('should qualify strong web development prospects against WebDevRedesignICP', () => {
      const prospect = DataNormalizationService.normalize({
        id: 'prospect-prime',
        name: 'The Victorian Grand Hotel',
        industry: 'Hospitality',
        phone: '+91 11 2334 5678',
        rating: 4.4,
        reviewCount: 45,
        website: 'http://victoriangrand.example.com',
        websiteQuality: 35,
        mobileResponsive: false,
        isHttps: false,
        hasCta: false,
        hasContactForm: false,
      });

      const result = ICPEngineService.evaluate(prospect, WebDevRedesignICP);

      assert.equal(result.matched, true);
      assert.ok(result.passedHardFilters.length >= 2);
      assert.equal(result.failedHardFilters.length, 0);
      assert.ok(result.score >= 50);
      assert.ok(result.positiveSignals.length >= 2);
    });

    it('should exclude competitor agencies via exclusion rules', () => {
      const competitor = DataNormalizationService.normalize({
        id: 'comp-agency-1',
        name: 'NextGen Digital Marketing Agency',
        industry: 'marketing',
        phone: '+91 99999 11111',
        rating: 4.9,
        reviewCount: 50,
        website: 'https://nextgendigital.example.com',
      });

      const result = ICPEngineService.evaluate(competitor, WebDevRedesignICP);

      assert.equal(result.matched, false);
      assert.ok(result.triggeredExclusions.length > 0);
      assert.ok(result.triggeredExclusions.some(e => e.includes('Competitor')));
    });

    it('should reject leads that fail mandatory hard filters (missing phone)', () => {
      const noPhoneLead = DataNormalizationService.normalize({
        id: 'no-phone-lead',
        name: 'Quiet Dental Clinic',
        industry: 'Dentist',
        phone: null, // Missing mandatory phone
        rating: 4.5,
        reviewCount: 25,
        website: 'http://quietdental.example.com',
      });

      const result = ICPEngineService.evaluate(noPhoneLead, WebDevRedesignICP);

      assert.equal(result.matched, false);
      assert.ok(result.failedHardFilters.length > 0);
      assert.ok(result.failedHardFilters.some(f => f.includes('Phone')));
    });
  });

});
