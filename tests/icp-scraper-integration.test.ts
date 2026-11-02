import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  icpScraperIntegrationService,
  dataNormalizationService,
  existingFilterEvaluator,
  icpEvaluationRepository,
  ICPEngineService,
  WebDevRedesignICP,
  MarketingAgencyICP,
} from '../src/services/icp';
import type { ICPProfile, ICPRule } from '../src/types/icp';

describe('Phase 4: Scraper & ICP Engine Integration', () => {
  // Configurable custom test ICP
  const DentalClinicRedesignICP: ICPProfile = {
    id: 'test-dental-web-redesign',
    name: 'Dental Clinic Website Redesign',
    targetService: 'WEBSITE_REDESIGN',
    rules: [
      // Hard filter: Must have at least 15 reviews (demonstrates established patient base)
      {
        id: 'hf-min-reviews',
        name: 'Min 15 Reviews',
        type: 'HARD_FILTER',
        condition: {
          field: 'reviewCount',
          operator: 'greater_than_or_equal',
          value: 15,
        },
      },
      // Hard filter: Must have a phone number for outreach
      {
        id: 'hf-has-phone',
        name: 'Has Phone Number',
        type: 'HARD_FILTER',
        condition: {
          field: 'hasPhone',
          operator: 'equals',
          value: true,
        },
      },
      // Exclusion: Exclude franchises or enterprise chains
      {
        id: 'ex-no-chains',
        name: 'Exclude Enterprise/Franchise Chains',
        type: 'EXCLUSION',
        condition: {
          field: 'isEnterpriseOrFranchise',
          operator: 'equals',
          value: true,
        },
      },
      // Soft signal: No website or outdated website quality (< 60) -> high need (+35 pts)
      {
        id: 'ss-poor-website',
        name: 'Needs Website or Redesign',
        type: 'SOFT_SIGNAL',
        weight: 35,
        condition: {
          field: 'websiteQuality',
          operator: 'less_than',
          value: 60,
        },
      },
      // Soft signal: High review count >= 50 (+25 pts)
      {
        id: 'ss-high-reviews',
        name: 'High Review Count (50+)',
        type: 'SOFT_SIGNAL',
        weight: 25,
        condition: {
          field: 'reviewCount',
          operator: 'greater_than_or_equal',
          value: 50,
        },
      },
      // Soft signal: Established business age >= 3 years (+20 pts)
      {
        id: 'ss-established-age',
        name: 'Established Business (>= 3 Years)',
        type: 'SOFT_SIGNAL',
        weight: 20,
        condition: {
          field: 'businessAge',
          operator: 'greater_than_or_equal',
          value: 3,
        },
      },
      // Soft signal: Verified mobile responsive issue (+20 pts)
      {
        id: 'ss-mobile-issue',
        name: 'Poor Mobile Performance',
        type: 'SOFT_SIGNAL',
        weight: 20,
        condition: {
          field: 'websiteData.mobileScore',
          operator: 'less_than',
          value: 50,
        },
      },
    ],
    scoringConfig: {
      mode: 'additive',
      highPriorityThreshold: 70,
      mediumPriorityThreshold: 40,
    },
  };

  // =========================================================================
  // 1. DATA NORMALIZATION LAYER
  // =========================================================================
  describe('1. Data Normalization Layer', () => {
    it('should normalize raw Google Maps scraped payload into unified schema', () => {
      const rawGmapsPlace = {
        title: 'Apex Dental Aesthetics',
        website: 'https://apexdental.example.com',
        phone: '+1 415 555 2671',
        totalScore: 4.8,
        reviewsCount: 62,
        categoryName: 'Dentist',
        address: '100 Market St, San Francisco, CA',
        city: 'San Francisco',
        state: 'CA',
      };

      const normalized = dataNormalizationService.normalize(rawGmapsPlace, 'biz_apex_01');

      assert.equal(normalized.id, 'biz_apex_01');
      assert.equal(normalized.name, 'Apex Dental Aesthetics');
      assert.equal(normalized.hasWebsite, true);
      assert.equal(normalized.hasPhone, true);
      assert.equal(normalized.rating, 4.8);
      assert.equal(normalized.reviewCount, 62);
      assert.equal(normalized.industry, 'Dentist');
    });

    it('should correctly calculate computed fields and aliases', () => {
      const currentYear = new Date().getFullYear();
      const raw = {
        name: 'Heritage Law Firm',
        website: 'http://heritagelaw.example.com',
        phone: '1234567890',
        establishedYear: currentYear - 6,
        audit: {
          overallScore: 45,
          mobileScore: 38,
          desktopScore: 52,
        },
      };

      const normalized = dataNormalizationService.normalize(raw, 'biz_law_01');

      assert.equal(normalized.businessAge, 6);
      assert.equal(normalized.websiteQuality, 45);
      assert.equal(normalized.websiteData?.mobileScore, 38);
    });

    it('should handle completely missing/null fields without crashing', () => {
      const sparseLead = {
        name: 'Mysterious Pop-up',
        // No website, no phone, no rating, no reviews, no audit
      };

      const normalized = dataNormalizationService.normalize(sparseLead, 'biz_sparse_01');

      assert.equal(normalized.id, 'biz_sparse_01');
      assert.equal(normalized.name, 'Mysterious Pop-up');
      assert.equal(normalized.hasWebsite, false);
      assert.equal(normalized.hasPhone, false);
      assert.equal(normalized.website, null);
      assert.equal(normalized.phone, null);
      assert.equal(normalized.reviewCount, 0);
      assert.equal(normalized.rating, null);
      assert.equal(normalized.websiteQuality ?? null, null);
    });
  });

  // =========================================================================
  // 2. EXISTING FILTER INTEGRATION
  // =========================================================================
  describe('2. Existing Filter Evaluator Integration', () => {
    it('should flag enterprise brands and franchise keywords correctly', () => {
      const enterpriseLead = {
        id: 'biz_ent_01',
        name: 'Tata Consultancy Hub Center',
        industry: 'Logistics',
      };
      const franchiseLead = {
        id: 'biz_fran_01',
        name: 'Subway Sandwich Franchise Store #402',
        industry: 'Restaurant',
      };
      const independentLead = {
        id: 'biz_ind_01',
        name: 'Dr. Rachel Smile Dental',
        industry: 'Dentist',
      };

      const entOutcome = existingFilterEvaluator.evaluate(enterpriseLead);
      const franOutcome = existingFilterEvaluator.evaluate(franchiseLead);
      const indOutcome = existingFilterEvaluator.evaluate(independentLead);

      assert.equal(entOutcome.isEnterprise, true);
      assert.equal(entOutcome.isFranchise, false);
      assert.equal(entOutcome.isEnterpriseOrFranchise, true);

      assert.equal(franOutcome.isFranchise, true);
      assert.equal(franOutcome.isEnterpriseOrFranchise, true);

      assert.equal(indOutcome.isEnterprise, false);
      assert.equal(indOutcome.isFranchise, false);
      assert.equal(indOutcome.isEnterpriseOrFranchise, false);
      assert.equal(indOutcome.outreachSuitabilityScore > 50, true);
    });

    it('should flag competitor industries', () => {
      const agencyLead = {
        id: 'biz_comp_01',
        name: 'Digital Velocity SEO & Marketing Agency',
        industry: 'digital marketing agency',
      };

      const outcome = existingFilterEvaluator.evaluate(agencyLead);
      assert.equal(outcome.isCompetitorIndustry, true);
    });
  });

  // =========================================================================
  // 3. QUALIFIED LEAD EVALUATION
  // =========================================================================
  describe('3. ICP-Qualified Business', () => {
    it('should qualify an established dental practice needing website redesign', () => {
      const currentYear = new Date().getFullYear();
      const rawBusiness = {
        id: 'biz_dentist_01',
        name: 'SmileCraft Dental Care',
        phone: '+1 555 444 3322',
        website: 'https://smilecraft.olddomain.com',
        rating: 4.7,
        reviewCount: 78,
        industry: 'Dentist',
        establishedYear: currentYear - 5, // 5 years old
        websiteData: {
          overallScore: 42, // Quality < 60 -> +35
          mobileScore: 35, // Mobile < 50 -> +20
        },
      };

      const result = icpScraperIntegrationService.qualifyBusiness(
        rawBusiness,
        DentalClinicRedesignICP
      );

      assert.equal(result.matched, true);
      assert.equal(result.icpName, 'Dental Clinic Website Redesign');
      assert.equal(result.passedHardFilters.length, 2);
      assert.deepEqual(result.passedHardFilters, ['Min 15 Reviews', 'Has Phone Number']);
      assert.equal(result.failedHardFilters.length, 0);

      // Score: 35 (poor website) + 25 (high reviews >= 50) + 20 (age >= 3) + 20 (mobile < 50) = 100
      assert.equal(result.score, 100);
      assert.equal(result.priority, 'HIGH');
      assert.equal(result.positiveSignals.length >= 3, true);
      assert.equal(result.reasons.some((r) => r.includes('Qualified for ICP')), true);
    });
  });

  // =========================================================================
  // 4. HARD-FILTER REJECTION (NOT SILENTLY DISCARDED)
  // =========================================================================
  describe('4. Hard-Filter Rejection & Preservation', () => {
    it('should reject lead failing reviewCount threshold but preserve full debug evaluation', () => {
      const rawBusiness = {
        id: 'biz_new_dentist',
        name: 'Brand New Smiles Dental',
        phone: '+1 555 123 4567',
        website: 'https://brandnewsmiles.com',
        rating: 5.0,
        reviewCount: 3, // FAILS: Min 15 Reviews required
        industry: 'Dentist',
      };

      const result = icpScraperIntegrationService.qualifyBusiness(
        rawBusiness,
        DentalClinicRedesignICP
      );

      // Must be rejected
      assert.equal(result.matched, false);
      assert.equal(result.failedHardFilters.length, 1);
      assert.deepEqual(result.failedHardFilters, ['Min 15 Reviews']);

      // Must NOT be silently discarded: Full audit trails preserved
      assert.equal(result.businessId, 'biz_new_dentist');
      assert.equal(result.businessName, 'Brand New Smiles Dental');
      assert.equal(result.reasons.some((r) => r.toLowerCase().includes('hard filter')), true);
      assert.equal(result.passedHardFilters.includes('Has Phone Number'), true);
    });

    it('should reject lead failing contact phone hard filter', () => {
      const rawBusiness = {
        id: 'biz_no_phone',
        name: 'Silent Dental Studio',
        phone: null, // FAILS: Has Phone Number
        reviewCount: 35,
      };

      const result = icpScraperIntegrationService.qualifyBusiness(
        rawBusiness,
        DentalClinicRedesignICP
      );

      assert.equal(result.matched, false);
      assert.equal(result.failedHardFilters.includes('Has Phone Number'), true);
    });
  });

  // =========================================================================
  // 5. HIGH-SCORING VS LOW-SCORING BUSINESSES
  // =========================================================================
  describe('5. High vs Low Scoring Leads', () => {
    it('should award HIGH priority to a high-scoring prospect', () => {
      const currentYear = new Date().getFullYear();
      const highLead = {
        id: 'biz_high_score',
        name: 'Metro Family Dentistry',
        phone: '+1 555 999 8888',
        reviewCount: 120, // +25 pts
        establishedYear: currentYear - 4, // +20 pts
        websiteData: {
          overallScore: 30, // +35 pts
          mobileScore: 25, // +20 pts
        },
      };

      const result = icpScraperIntegrationService.qualifyBusiness(
        highLead,
        DentalClinicRedesignICP
      );

      assert.equal(result.matched, true);
      assert.equal(result.score, 100);
      assert.equal(result.priority, 'HIGH');
    });

    it('should assign LOW priority to a lead that passes hard filters but lacks opportunity signals', () => {
      const currentYear = new Date().getFullYear();
      const lowLead = {
        id: 'biz_low_score',
        name: 'Modern Tech Dental',
        phone: '+1 555 222 1111',
        reviewCount: 18, // Passes HF (>= 15), but doesn't get 50+ bonus
        establishedYear: currentYear - 1, // 1 year old -> doesn't get >= 3 bonus
        websiteData: {
          overallScore: 92, // High quality site -> no redesign signal
          mobileScore: 88, // Great mobile score -> no mobile issue signal
        },
      };

      const result = icpScraperIntegrationService.qualifyBusiness(
        lowLead,
        DentalClinicRedesignICP
      );

      // Passes hard filters, so matched = true
      assert.equal(result.matched, true);
      // Soft score is 0
      assert.equal(result.score, 0);
      assert.equal(result.priority, 'LOW');
      assert.equal(result.scoreContributions.length, 0);
    });
  });

  // =========================================================================
  // 6. EXCLUSION & KEYWORD RULES
  // =========================================================================
  describe('6. Exclusion and Keyword Filtering', () => {
    it('should reject a business matching franchise exclusion even with excellent reviews', () => {
      const franchiseClinic = {
        id: 'biz_franchise_dental',
        name: 'Aspen Dental Franchise Clinic #104',
        phone: '+1 555 333 4444',
        reviewCount: 200,
        websiteData: { overallScore: 40 },
      };

      const result = icpScraperIntegrationService.qualifyBusiness(
        franchiseClinic,
        DentalClinicRedesignICP
      );

      assert.equal(result.matched, false);
      assert.equal(result.triggeredExclusions.length, 1);
      assert.equal(
        result.triggeredExclusions[0],
        'Exclude Enterprise/Franchise Chains'
      );
      assert.equal(
        result.reasons.some((r) => r.toLowerCase().includes('exclusion')),
        true
      );
    });
  });

  // =========================================================================
  // 7. MULTIPLE BUSINESSES BATCH EVALUATION & RANKING
  // =========================================================================
  describe('7. Batch Qualification & Ranking', () => {
    it('should qualify and rank a multi-lead batch, ordering qualified leads by ICP score descending', async () => {
      const currentYear = new Date().getFullYear();

      const batchData = [
        // Lead 1: Disqualified by HF (< 15 reviews)
        {
          id: 'biz_b1',
          name: 'Tiny Clinic',
          phone: '+1 555 0001',
          reviewCount: 8,
        },
        // Lead 2: Qualified, High Score (Score 100)
        {
          id: 'biz_b2',
          name: 'Grand Dental Associates',
          phone: '+1 555 0002',
          reviewCount: 95,
          establishedYear: currentYear - 6,
          websiteData: { overallScore: 45, mobileScore: 30 },
        },
        // Lead 3: Disqualified by Exclusion (Franchise)
        {
          id: 'biz_b3',
          name: 'FastDentist Franchise Group',
          phone: '+1 555 0003',
          reviewCount: 150,
        },
        // Lead 4: Qualified, Medium Score (Score 60)
        {
          id: 'biz_b4',
          name: 'Midway Dental Studio',
          phone: '+1 555 0004',
          reviewCount: 60, // +25
          establishedYear: currentYear - 1, // no age bonus
          websiteData: { overallScore: 50, mobileScore: 65 }, // +35 (quality < 60), mobile fine -> 60 pts
        },
        // Lead 5: Qualified, Low Score (Score 0)
        {
          id: 'biz_b5',
          name: 'NextGen Dental Center',
          phone: '+1 555 0005',
          reviewCount: 20, // passes HF
          websiteData: { overallScore: 90, mobileScore: 85 },
        },
      ];

      const batchResult = await icpScraperIntegrationService.qualifyBatch(
        batchData,
        DentalClinicRedesignICP,
        'col_batch_test'
      );

      // Verify counts
      assert.equal(batchResult.totalEvaluated, 5);
      assert.equal(batchResult.qualifiedCount, 3);
      assert.equal(batchResult.rejectedCount, 2);
      assert.equal(batchResult.matchRate, 60);

      // Verify ranked leads: exactly the 3 qualified leads, sorted DESC by score
      assert.notEqual(batchResult.rankedLeads, undefined);
      assert.equal(batchResult.rankedLeads!.length, 3);
      assert.equal(batchResult.rankedLeads![0].businessId, 'biz_b2'); // Score 100
      assert.equal(batchResult.rankedLeads![0].score, 100);
      assert.equal(batchResult.rankedLeads![0].priority, 'HIGH');

      assert.equal(batchResult.rankedLeads![1].businessId, 'biz_b4'); // Score 60
      assert.equal(batchResult.rankedLeads![1].score, 60);
      assert.equal(batchResult.rankedLeads![1].priority, 'MEDIUM');

      assert.equal(batchResult.rankedLeads![2].businessId, 'biz_b5'); // Score 0
      assert.equal(batchResult.rankedLeads![2].score, 0);
      assert.equal(batchResult.rankedLeads![2].priority, 'LOW');

      // Verify preserved rejected leads in allLeads
      assert.notEqual(batchResult.allLeads, undefined);
      assert.equal(batchResult.allLeads!.length, 5);
      const rejectedLeads = batchResult.allLeads!.filter((l) => !l.matched);
      assert.equal(rejectedLeads.length, 2);
      assert.deepEqual(
        rejectedLeads.map((l) => l.businessId).sort(),
        ['biz_b1', 'biz_b3']
      );
    });
  });

  // =========================================================================
  // 8. BACKWARDS COMPATIBILITY: RUNNING SCRAPER WITHOUT AN ICP
  // =========================================================================
  describe('8. Backwards Compatibility Without ICP', () => {
    it('should score leads using fallback opportunity logic when no ICP is selected', () => {
      const rawBusiness = {
        id: 'biz_no_icp_01',
        name: 'Apex Physiotherapy Center',
        phone: '+1 555 777 6666',
        website: 'https://apexphysio.example.com',
        rating: 4.8,
        reviewCount: 65,
      };

      // Call qualifyBusiness with null ICP
      const result = icpScraperIntegrationService.qualifyBusiness(rawBusiness, null);

      // Should maintain backward compatibility
      assert.equal(result.matched, true);
      assert.equal(result.icpId, 'default-qualification');
      assert.equal(result.icpName, 'General Lead Qualification (No ICP)');
      assert.equal(result.score > 0, true);
      assert.equal(['HIGH', 'MEDIUM', 'LOW'].includes(result.priority), true);
      assert.equal(result.failedHardFilters.length, 0);
    });

    it('should batch qualify leads when no ICP is specified', async () => {
      const leads = [
        { id: 'b1', name: 'Biz One', phone: '123', reviewCount: 40 },
        { id: 'b2', name: 'Biz Two', phone: null, reviewCount: 5 },
      ];

      const batchResult = await icpScraperIntegrationService.qualifyBatch(leads, null);

      assert.equal(batchResult.totalEvaluated, 2);
      assert.equal(batchResult.qualifiedCount, 2); // All passed in backward compatibility mode
      assert.equal(batchResult.matchRate, 100);
      assert.equal(batchResult.rankedLeads?.length, 2);
    });
  });

  // =========================================================================
  // 9. PERSISTENCE & AUDIT RETRIEVAL
  // =========================================================================
  describe('9. Evaluation Storage & Repository Retrieval', () => {
    it('should persist evaluations for a collection and retrieve them intact', async () => {
      const collectionId = 'col_persist_verify_01';
      const sampleLead = {
        id: 'biz_persist_01',
        name: 'Radiant Smiles Orthodontics',
        phone: '+1 555 888 9999',
        reviewCount: 30,
        websiteData: { overallScore: 48 },
      };

      const qualification = icpScraperIntegrationService.qualifyBusiness(
        sampleLead,
        DentalClinicRedesignICP,
        collectionId
      );

      // Save via repository
      await icpEvaluationRepository.saveEvaluation(collectionId, qualification);

      // Retrieve via repository
      const retrieved = await icpEvaluationRepository.getEvaluation(collectionId, 'biz_persist_01');
      assert.notEqual(retrieved, null);
      assert.equal(retrieved?.businessId, 'biz_persist_01');
      assert.equal(retrieved?.businessName, 'Radiant Smiles Orthodontics');
      assert.equal(retrieved?.matched, true);
      assert.equal(retrieved?.score, qualification.score);
      assert.equal(retrieved?.icpName, 'Dental Clinic Website Redesign');
      assert.equal(retrieved?.passedHardFilters.length, 2);
    });
  });

  // =========================================================================
  // 10. REAL-WORLD AGENCY PRESET INTEGRATION
  // =========================================================================
  describe('10. Built-in Agency ICPs Integration', () => {
    it('should qualify prospective client against WebDevRedesignICP', () => {
      const client = {
        id: 'biz_agency_candidate',
        name: 'Greenfield Law Partners',
        phone: '+1 555 600 7000',
        website: 'http://greenfieldlaw.example.com',
        rating: 4.6,
        reviewCount: 120,
        websiteData: {
          overallScore: 40,
          performanceScore: 35,
          sslEnabled: false,
        },
      };

      const result = icpScraperIntegrationService.qualifyBusiness(client, WebDevRedesignICP);

      assert.equal(result.matched, true);
      assert.equal(result.icpName, WebDevRedesignICP.name);
      assert.equal(result.priority, 'HIGH');
    });

    it('should qualify local dining business against MarketingAgencyICP', () => {
      const restaurant = {
        id: 'biz_bistro_01',
        name: 'The Rustic Olive Bistro',
        phone: '+1 555 400 5000',
        website: 'https://rusticolive.example.com',
        rating: 4.6,
        reviewCount: 85,
        socialProfiles: [{ platform: 'instagram', url: 'https://instagram.com/rusticolive' }],
        websiteData: {
          seoScore: 45,
        },
      };

      const result = icpScraperIntegrationService.qualifyBusiness(restaurant, MarketingAgencyICP);

      assert.equal(result.matched, true);
      assert.equal(result.icpName, MarketingAgencyICP.name);
      assert.equal(result.score > 50, true);
    });
  });
});
