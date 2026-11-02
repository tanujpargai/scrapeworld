import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExplanationService } from '../src/services/icp/ExplanationService';
import { ICPEngineService } from '../src/services/icp/ICPEngineService';
import { ICPScraperIntegrationService } from '../src/services/icp/ICPScraperIntegrationService';
import { DataNormalizationService } from '../src/services/icp/DataNormalizationService';
import { 
  WebDevRedesignICP, 
  MarketingAgencyICP, 
  WebDevConversionICP 
} from '../src/services/icp/sampleProfiles';
import type { ICPProfile, ICPLeadResult } from '../src/types/icp';

describe('Phase 6: Deterministic ICP Explanations & Sales Qualification', () => {
  const engine = new ICPEngineService();
  const integrationService = new ICPScraperIntegrationService(engine);

  // =========================================================================
  // 1. DETERMINISTIC EXPLANATION FORMATTING
  // =========================================================================
  describe('1. Deterministic Signal & Filter Formatting', () => {
    it('should format positive signals with dynamic plus points and negative signals with minus points', () => {
      const mockCustomICP: ICPProfile = {
        id: 'icp-custom-weights',
        name: 'Custom High-Value Web Opportunity',
        description: 'Target businesses needing high-ticket digital upgrades',
        targetService: 'WEBSITE',
        isActive: true,
        scoringConfig: {
          mode: 'additive',
          highPriorityThreshold: 40,
          mediumPriorityThreshold: 20,
        },
        rules: [
          {
            id: 'hf-1',
            name: 'Business age >= 5 years',
            type: 'HARD_FILTER',
            condition: {
              field: 'businessAge',
              operator: 'greater_than_or_equal',
              value: 5,
            },
          },
          {
            id: 'hf-2',
            name: 'Industry = Hotel',
            type: 'HARD_FILTER',
            condition: {
              field: 'industry',
              operator: 'contains',
              value: 'Hotel',
            },
          },
          {
            id: 'ss-1',
            name: 'Website quality is poor',
            type: 'SOFT_SIGNAL',
            condition: {
              field: 'websiteQuality',
              operator: 'less_than',
              value: 60,
            },
            weight: 20,
          },
          {
            id: 'ss-2',
            name: 'Mobile experience is weak',
            type: 'SOFT_SIGNAL',
            condition: {
              field: 'mobileResponsive',
              operator: 'equals',
              value: false,
            },
            weight: 15,
          },
          {
            id: 'ss-3',
            name: 'Business age matches ICP',
            type: 'SOFT_SIGNAL',
            condition: {
              field: 'businessAge',
              operator: 'greater_than_or_equal',
              value: 5,
            },
            weight: 20,
          },
          {
            id: 'ss-4',
            name: 'Strong social presence',
            type: 'SOFT_SIGNAL',
            condition: {
              field: 'socialPlatformCount',
              operator: 'greater_than_or_equal',
              value: 3,
            },
            weight: -5, // Negative signal deduction
          },
        ],
      };

      const normalizedBusiness = DataNormalizationService.normalize({
        name: 'Grand Heritage Hotel',
        category: 'Hotel & Hospitality',
        website: 'https://grandheritagehotel.com',
        businessAge: 12,
        websiteQuality: 45,
        mobileResponsive: false,
        socialProfiles: [
          { platform: 'INSTAGRAM' },
          { platform: 'FACEBOOK' },
          { platform: 'LINKEDIN' },
        ],
      });

      const evaluation = engine.evaluate(normalizedBusiness, mockCustomICP);
      const explanation = ExplanationService.generateExplanation(evaluation, normalizedBusiness, mockCustomICP);

      // Verify positive signals format: +<pts> <ruleName>
      assert.ok(explanation.positiveSignalStrings.length >= 3);
      assert.ok(explanation.positiveSignalStrings.includes('+20 Website quality is poor'));
      assert.ok(explanation.positiveSignalStrings.includes('+15 Mobile experience is weak'));
      assert.ok(explanation.positiveSignalStrings.includes('+20 Business age matches ICP'));

      // Verify negative signals format: -<pts> <ruleName>
      assert.ok(explanation.negativeSignalStrings.length >= 1);
      assert.ok(explanation.negativeSignalStrings.includes('-5 Strong social presence'));

      // Verify hard filters format: ✓ <ruleName>
      assert.ok(explanation.passedHardFilterStrings.includes('✓ Business age >= 5 years'));
      assert.ok(explanation.passedHardFilterStrings.includes('✓ Industry = Hotel'));

      // Verify overall matched and priority
      assert.equal(explanation.matched, true);
      assert.equal(explanation.priority, 'HIGH');
      assert.ok(explanation.score >= 50);

      // Verify summary text
      assert.ok(explanation.summaryText.includes('Grand Heritage Hotel qualified with an ICP Match Score'));
      assert.ok(explanation.summaryText.includes('HIGH Priority'));
    });

    it('should format failed hard filters with crossmark and disqualify the lead', () => {
      const mockICP: ICPProfile = {
        id: 'icp-strict',
        name: 'Strict Enterprise ICP',
        description: 'Enterprise validation',
        targetService: 'WEBSITE',
        isActive: true,
        scoringConfig: {
          highPriorityThreshold: 60,
          mediumPriorityThreshold: 30,
        },
        rules: [
          {
            id: 'hf-rev',
            name: 'Must have at least 50 reviews',
            type: 'HARD_FILTER',
            condition: {
              field: 'reviewCount',
              operator: 'greater_than_or_equal',
              value: 50,
            },
          },
          {
            id: 'ss-web',
            name: 'Poor website',
            type: 'SOFT_SIGNAL',
            condition: {
              field: 'websiteQuality',
              operator: 'less_than',
              value: 60,
            },
            weight: 25,
          },
        ],
      };

      const normalized = DataNormalizationService.normalize({
        name: 'Corner Boutique',
        reviewCount: 12,
        websiteQuality: 35,
      });

      const evaluation = engine.evaluate(normalized, mockICP);
      const explanation = ExplanationService.generateExplanation(evaluation, normalized, mockICP);

      assert.equal(explanation.matched, false);
      assert.ok(explanation.failedHardFilterStrings.includes('✗ Must have at least 50 reviews'));
      assert.ok(explanation.summaryText.includes('disqualified from Strict Enterprise ICP'));
    });
  });

  // =========================================================================
  // 2. TRANSPARENT UNKNOWN SIGNAL HANDLING (ZERO FABRICATION)
  // =========================================================================
  describe('2. Strict Unknown Signal Handling & Provenance', () => {
    it('should identify unverified SMB fields as Unknown without scoring them', () => {
      const mockICP: ICPProfile = {
        id: 'icp-unverified',
        name: 'Growth Stage ICP',
        description: 'Target businesses with specific employee size and age',
        targetService: 'MARKETING',
        isActive: true,
        scoringConfig: {
          highPriorityThreshold: 50,
          mediumPriorityThreshold: 25,
        },
        rules: [
          {
            id: 'ss-emp',
            name: 'Mid-sized headcount (10-50)',
            type: 'SOFT_SIGNAL',
            condition: {
              field: 'employeeCount',
              operator: 'between',
              value: 10,
              secondValue: 50,
            },
            weight: 20,
          },
        ],
      };

      // Raw business without employee count or verified founded year
      const normalized = DataNormalizationService.normalize({
        name: 'Local Accounting Practice',
        phone: '555-123-4567',
      });

      const evaluation = engine.evaluate(normalized, mockICP);
      const explanation = ExplanationService.generateExplanation(evaluation, normalized, mockICP);

      // Verify that employeeCount is identified as unknown
      const employeeUnknown = explanation.unknownSignals.find(u => u.field === 'employeeCount');
      assert.ok(employeeUnknown, 'Should list employeeCount in unknownSignals');
      assert.equal(employeeUnknown.text, 'Employee Count: Unknown');

      // Verify that foundedYear is also flagged if requested in check
      const foundedUnknown = explanation.unknownSignals.find(u => u.field === 'foundedYear');
      assert.ok(foundedUnknown, 'Should list foundedYear in unknownSignals');
      assert.equal(foundedUnknown.text, 'Founded Year: Unknown');

      // Crucial: The soft signal should NOT have awarded points for unknown data
      assert.equal(explanation.score, 0);
      assert.equal(explanation.positiveSignals.length, 0);
    });

    it('should provide human-readable field labels via getFieldLabel', () => {
      assert.equal(ExplanationService.getFieldLabel('reviewCount'), 'Google Review Count');
      assert.equal(ExplanationService.getFieldLabel('isHttps'), 'HTTPS / SSL Security');
      assert.equal(ExplanationService.getFieldLabel('hasWhatsApp'), 'WhatsApp Integration');
      assert.equal(ExplanationService.getFieldLabel('websiteQuality'), 'Website Quality Score');
      assert.equal(ExplanationService.getFieldLabel('employeeCount'), 'Employee Count');
      assert.equal(ExplanationService.getFieldLabel('growthIndicator'), 'Growth Velocity Indicator');
    });
  });

  // =========================================================================
  // 3. INTEGRATION PIPELINE EXPLANATIONS
  // =========================================================================
  describe('3. Integration Pipeline Attachment of Explanations', () => {
    it('should populate formattedExplanations on ICPLeadResult through qualifyBusiness', () => {
      const rawLead: any = {
        name: 'Austin Dental Associates',
        category: 'Dentist',
        phone: '512-555-8888',
        website: 'http://austindentalassociates.net',
        reviewCount: 65,
        rating: 4.8,
        address: 'Austin, TX',
        websiteData: {
          hasWebsite: true,
          isHttps: false,
          hasSsl: false,
          cms: 'WordPress',
          hasWhatsApp: false,
          hasCta: false,
          hasContactForm: true,
          mobileResponsive: false,
          hasAnalytics: false,
          hasMetaPixel: false,
          hasBrokenLinks: false,
          websiteQuality: 40,
        },
      };

      const qualified = integrationService.qualifyBusiness(rawLead, WebDevConversionICP);

      assert.ok(qualified.formattedExplanations, 'Should attach formattedExplanations');
      assert.equal(qualified.businessName, 'Austin Dental Associates');
      assert.equal(qualified.matched, true);
      assert.equal(qualified.priority, 'HIGH');
      assert.ok(qualified.score >= 50);

      const fe = qualified.formattedExplanations;
      assert.equal(fe.businessName, 'Austin Dental Associates');
      assert.equal(fe.priority, 'HIGH');
      assert.ok(fe.score >= 50);

      // Verify positive signal formatting in fe
      assert.ok(fe.positiveSignals.some(s => s.startsWith('+')));
      // Verify hard filter formatting in fe
      assert.ok(fe.hardFilters.some(s => s.startsWith('✓')));
      // Verify summaryText in fe
      assert.ok(fe.summaryText && fe.summaryText.includes('HIGH Priority'));
    });

    it('should attach fallback explanation when no ICP profile is supplied', () => {
      const rawLead: any = {
        name: 'Quick Fix Plumbing',
        phone: '555-999-1111',
        website: 'http://quickplumbing.com',
        reviewCount: 30,
        rating: 4.5,
      };

      const result = integrationService.qualifyBusiness(rawLead, null);

      assert.ok(result.formattedExplanations);
      assert.equal(result.formattedExplanations.icpName, 'General Opportunity Assessment');
      assert.ok(result.formattedExplanations.score >= 0);
      assert.ok(result.formattedExplanations.summaryText && result.formattedExplanations.summaryText.length > 0);
    });
  });

  // =========================================================================
  // 4. MULTI-DIMENSIONAL SORTING & FILTERING
  // =========================================================================
  describe('4. Sales Decision Sorting & Filtering', () => {
    const leadA: ICPLeadResult = {
      businessId: '1',
      businessName: 'High Score High Priority Lead',
      icpId: 'icp-1',
      icpName: 'Web Dev ICP',
      matched: true,
      score: 95,
      priority: 'HIGH',
      passedHardFilters: ['✓ Valid'],
      failedHardFilters: [],
      triggeredExclusions: [],
      positiveSignals: ['+25 Poor web'],
      negativeSignals: [],
      reasons: [],
      scoreContributions: [],
      evaluatedAt: new Date().toISOString(),
      serviceOpportunity: 'WEBSITE',
      business: {
        id: '1',
        name: 'High Score High Priority Lead',
        reviewCount: 120,
        rating: 4.9,
      } as any,
    };

    const leadB: ICPLeadResult = {
      businessId: '2',
      businessName: 'Medium Score Medium Priority Lead',
      icpId: 'icp-1',
      icpName: 'Web Dev ICP',
      matched: true,
      score: 55,
      priority: 'MEDIUM',
      passedHardFilters: ['✓ Valid'],
      failedHardFilters: [],
      triggeredExclusions: [],
      positiveSignals: ['+15 Needs SEO'],
      negativeSignals: [],
      reasons: [],
      scoreContributions: [],
      evaluatedAt: new Date().toISOString(),
      serviceOpportunity: 'SEO',
      business: {
        id: '2',
        name: 'Medium Score Medium Priority Lead',
        reviewCount: 30,
        rating: 4.2,
      } as any,
    };

    const leadC: ICPLeadResult = {
      businessId: '3',
      businessName: 'Low Score Disqualified Lead',
      icpId: 'icp-1',
      icpName: 'Web Dev ICP',
      matched: false,
      score: 15,
      priority: 'LOW',
      passedHardFilters: [],
      failedHardFilters: ['✗ Too few reviews'],
      triggeredExclusions: [],
      positiveSignals: [],
      negativeSignals: [],
      reasons: [],
      scoreContributions: [],
      evaluatedAt: new Date().toISOString(),
      serviceOpportunity: 'MARKETING',
      business: {
        id: '3',
        name: 'Low Score Disqualified Lead',
        reviewCount: 5,
        rating: 3.5,
      } as any,
    };

    const dataset: ICPLeadResult[] = [leadB, leadC, leadA];

    it('should sort leads by highest score descending', () => {
      const sorted = [...dataset].sort((a, b) => b.score - a.score);
      assert.equal(sorted[0].businessName, 'High Score High Priority Lead');
      assert.equal(sorted[1].businessName, 'Medium Score Medium Priority Lead');
      assert.equal(sorted[2].businessName, 'Low Score Disqualified Lead');
    });

    it('should sort leads by lowest score ascending', () => {
      const sorted = [...dataset].sort((a, b) => a.score - b.score);
      assert.equal(sorted[0].businessName, 'Low Score Disqualified Lead');
      assert.equal(sorted[1].businessName, 'Medium Score Medium Priority Lead');
      assert.equal(sorted[2].businessName, 'High Score High Priority Lead');
    });

    it('should filter by priority levels', () => {
      const highOnly = dataset.filter(lead => lead.priority === 'HIGH');
      assert.equal(highOnly.length, 1);
      assert.equal(highOnly[0].businessName, 'High Score High Priority Lead');

      const mediumOnly = dataset.filter(lead => lead.priority === 'MEDIUM');
      assert.equal(mediumOnly.length, 1);
      assert.equal(mediumOnly[0].businessName, 'Medium Score Medium Priority Lead');

      const lowOnly = dataset.filter(lead => lead.priority === 'LOW');
      assert.equal(lowOnly.length, 1);
      assert.equal(lowOnly[0].businessName, 'Low Score Disqualified Lead');
    });

    it('should filter by ICP match status', () => {
      const qualified = dataset.filter(lead => lead.matched);
      assert.equal(qualified.length, 2);

      const disqualified = dataset.filter(lead => !lead.matched);
      assert.equal(disqualified.length, 1);
      assert.equal(disqualified[0].businessName, 'Low Score Disqualified Lead');
    });

    it('should filter by target service opportunity', () => {
      const websiteOnly = dataset.filter(lead => lead.serviceOpportunity === 'WEBSITE');
      assert.equal(websiteOnly.length, 1);
      assert.equal(websiteOnly[0].businessName, 'High Score High Priority Lead');

      const seoOnly = dataset.filter(lead => lead.serviceOpportunity === 'SEO');
      assert.equal(seoOnly.length, 1);
      assert.equal(seoOnly[0].businessName, 'Medium Score Medium Priority Lead');
    });
  });
});
