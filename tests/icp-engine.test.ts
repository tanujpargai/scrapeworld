import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ICPProfile } from '../src/services/icp';
import {
  ICPEngineService,
  WebDevRedesignICP,
  MarketingAgencyICP,
  evaluateCondition,
  getNestedProperty,
} from '../src/services/icp';

describe('ICP Rule & Evaluation Engine', () => {
  const engine = new ICPEngineService();

  // =========================================================================
  // 1. PASSING HARD FILTERS
  // =========================================================================
  describe('1. Passing Hard Filters', () => {
    it('should mark matched = true when all hard filters pass', () => {
      const profile: ICPProfile = {
        id: 'test-passing-hf',
        name: 'Test Passing HF',
        rules: [
          {
            id: 'hf-min-reviews',
            name: 'Min 20 Reviews',
            type: 'HARD_FILTER',
            condition: {
              field: 'reviewCount',
              operator: 'greater_than_or_equal',
              value: 20,
            },
          },
          {
            id: 'hf-has-phone',
            name: 'Has Phone',
            type: 'HARD_FILTER',
            condition: {
              field: 'phone',
              operator: 'exists',
            },
          },
        ],
      };

      const business = {
        name: 'Prime Dental',
        reviewCount: 45,
        phone: '+919876543210',
      };

      const result = engine.evaluate(business, profile);

      assert.equal(result.matched, true);
      assert.equal(result.passedHardFilters.length, 2);
      assert.deepEqual(result.passedHardFilters, ['Min 20 Reviews', 'Has Phone']);
      assert.equal(result.failedHardFilters.length, 0);
      assert.equal(result.triggeredExclusions.length, 0);
    });
  });

  // =========================================================================
  // 2. FAILING HARD FILTERS
  // =========================================================================
  describe('2. Failing Hard Filters', () => {
    it('should mark matched = false and capture reasons when hard filter fails', () => {
      const profile: ICPProfile = {
        id: 'test-failing-hf',
        name: 'Test Failing HF',
        rules: [
          {
            id: 'hf-min-reviews',
            name: 'Min 50 Reviews',
            type: 'HARD_FILTER',
            condition: {
              field: 'reviewCount',
              operator: 'greater_than_or_equal',
              value: 50,
            },
            failureExplanation: 'Disqualified: Needs at least 50 reviews',
          },
        ],
      };

      const business = {
        name: 'Tiny Corner Kiosk',
        reviewCount: 8,
      };

      const result = engine.evaluate(business, profile);

      assert.equal(result.matched, false);
      assert.equal(result.priority, 'LOW');
      assert.equal(result.failedHardFilters.length, 1);
      assert.equal(result.failedHardFilters[0], 'Min 50 Reviews');
      assert.ok(result.reasons.some((r) => r.includes('Needs at least 50 reviews')));
    });

    it('should reject if any single hard filter fails among multiple', () => {
      const profile: ICPProfile = {
        id: 'test-multi-hf',
        name: 'Test Multi HF',
        rules: [
          {
            id: 'hf-reviews',
            name: 'Reviews OK',
            type: 'HARD_FILTER',
            condition: { field: 'reviewCount', operator: 'greater_than', value: 10 },
          },
          {
            id: 'hf-city',
            name: 'In Target City',
            type: 'HARD_FILTER',
            condition: { field: 'city', operator: 'equals', value: 'Delhi' },
          },
        ],
      };

      const business = {
        name: 'Mumbai Clinic',
        reviewCount: 30, // passes
        city: 'Mumbai',  // fails
      };

      const result = engine.evaluate(business, profile);

      assert.equal(result.matched, false);
      assert.equal(result.passedHardFilters.length, 1);
      assert.equal(result.failedHardFilters.length, 1);
      assert.equal(result.failedHardFilters[0], 'In Target City');
    });
  });

  // =========================================================================
  // 3. NUMERIC CONDITIONS
  // =========================================================================
  describe('3. Numeric Conditions', () => {
    it('should correctly evaluate greater_than and greater_than_or_equal', () => {
      const gtCondition = { field: 'val', operator: 'greater_than' as const, value: 50 };
      const gteCondition = { field: 'val', operator: 'greater_than_or_equal' as const, value: 50 };

      assert.equal(evaluateCondition(51, gtCondition).matched, true);
      assert.equal(evaluateCondition(50, gtCondition).matched, false);
      assert.equal(evaluateCondition(50, gteCondition).matched, true);
      assert.equal(evaluateCondition(49, gteCondition).matched, false);
    });

    it('should correctly evaluate less_than and less_than_or_equal', () => {
      const ltCondition = { field: 'score', operator: 'less_than' as const, value: 60 };
      const lteCondition = { field: 'score', operator: 'less_than_or_equal' as const, value: 60 };

      assert.equal(evaluateCondition(59, ltCondition).matched, true);
      assert.equal(evaluateCondition(60, ltCondition).matched, false);
      assert.equal(evaluateCondition(60, lteCondition).matched, true);
      assert.equal(evaluateCondition(61, lteCondition).matched, false);
    });

    it('should correctly evaluate between with separate values or array range', () => {
      const betweenSeparate = {
        field: 'rating',
        operator: 'between' as const,
        value: 4.0,
        secondValue: 4.8,
      };
      const betweenArray = {
        field: 'rating',
        operator: 'between' as const,
        value: [4.0, 4.8],
      };

      assert.equal(evaluateCondition(4.5, betweenSeparate).matched, true);
      assert.equal(evaluateCondition(4.0, betweenSeparate).matched, true);
      assert.equal(evaluateCondition(4.8, betweenSeparate).matched, true);
      assert.equal(evaluateCondition(3.9, betweenSeparate).matched, false);
      assert.equal(evaluateCondition(4.9, betweenSeparate).matched, false);

      assert.equal(evaluateCondition(4.5, betweenArray).matched, true);
      assert.equal(evaluateCondition(3.5, betweenArray).matched, false);
    });
  });

  // =========================================================================
  // 4. KEYWORD CONDITIONS
  // =========================================================================
  describe('4. Keyword Conditions', () => {
    it('must_contain / contains_all should require all keywords', () => {
      const cond = {
        field: 'industry',
        operator: 'contains_all' as const,
        value: ['dental', 'clinic'],
      };

      assert.equal(evaluateCondition('Dental Care Clinic', cond).matched, true);
      assert.equal(evaluateCondition('Dental Center', cond).matched, false);
    });

    it('must_not_contain should fail if any prohibited keyword is found', () => {
      const cond = {
        field: 'name',
        operator: 'must_not_contain' as const,
        value: ['hospital', 'apollo'],
      };

      assert.equal(evaluateCondition('Smile Dental Clinic', cond).matched, true);
      assert.equal(evaluateCondition('Apollo Hospital Delhi', cond).matched, false);
      assert.equal(evaluateCondition('City General Hospital', cond).matched, false);
    });

    it('contains_any should match if any keyword is present', () => {
      const cond = {
        field: 'description',
        operator: 'contains_any' as const,
        value: ['implants', 'invisalign', 'whitening'],
      };

      assert.equal(evaluateCondition('We specialize in modern dental implants.', cond).matched, true);
      assert.equal(evaluateCondition('General health checkup center', cond).matched, false);
    });
  });

  // =========================================================================
  // 5. WEIGHTED SCORING
  // =========================================================================
  describe('5. Weighted Scoring', () => {
    it('should aggregate positive soft signal weights into opportunity score', () => {
      const profile: ICPProfile = {
        id: 'test-weighted-scoring',
        name: 'Test Scoring',
        rules: [
          {
            id: 'ss-no-website',
            name: 'No Website (+30)',
            type: 'SOFT_SIGNAL',
            condition: { field: 'website', operator: 'does_not_exist' },
            weight: 30,
          },
          {
            id: 'ss-high-reviews',
            name: 'High Reviews (+20)',
            type: 'SOFT_SIGNAL',
            condition: { field: 'reviewCount', operator: 'greater_than_or_equal', value: 100 },
            weight: 20,
          },
          {
            id: 'ss-active-instagram',
            name: 'Active Instagram (+15)',
            type: 'SOFT_SIGNAL',
            condition: { field: 'hasInstagram', operator: 'equals', value: true },
            weight: 15,
          },
        ],
      };

      const business = {
        name: 'Bakery Bliss',
        website: null,
        reviewCount: 150,
        hasInstagram: false,
      };

      const result = engine.evaluate(business, profile);

      assert.equal(result.matched, true);
      assert.equal(result.score, 50); // 30 + 20
      assert.equal(result.rawScore, 50);
      assert.equal(result.maxPossibleScore, 65); // 30 + 20 + 15
      assert.equal(result.positiveSignals.length, 2);
      assert.equal(result.scoreContributions.length, 2);
      assert.equal(result.scoreContributions[0].pointsAwarded, 30);
      assert.equal(result.scoreContributions[1].pointsAwarded, 20);
    });

    it('should support penalty/negative weights for negative soft signals', () => {
      const profile: ICPProfile = {
        id: 'test-penalties',
        name: 'Test Penalties',
        rules: [
          {
            id: 'ss-base',
            name: 'Base Opportunity (+50)',
            type: 'SOFT_SIGNAL',
            condition: { field: 'reviewCount', operator: 'greater_than', value: 10 },
            weight: 50,
          },
          {
            id: 'ss-penalty-bad-rating',
            name: 'Low Rating Penalty (-20)',
            type: 'SOFT_SIGNAL',
            condition: { field: 'rating', operator: 'less_than', value: 3.5 },
            weight: -20,
            failureExplanation: 'Reputation risk penalty',
          },
        ],
      };

      const business = {
        reviewCount: 25,
        rating: 2.8,
      };

      const result = engine.evaluate(business, profile);

      assert.equal(result.score, 30); // 50 - 20 = 30
      assert.equal(result.negativeSignals.length, 1);
    });
  });

  // =========================================================================
  // 6. EXCLUSIONS
  // =========================================================================
  describe('6. Exclusions', () => {
    it('should reject a business when an exclusion rule matches', () => {
      const profile: ICPProfile = {
        id: 'test-exclusion',
        name: 'Test Exclusion',
        rules: [
          {
            id: 'ex-agency',
            name: 'Exclude Marketing Agencies',
            type: 'EXCLUSION',
            condition: {
              field: 'industry',
              operator: 'contains_any',
              value: ['marketing agency', 'seo agency'],
            },
            explanation: 'Disqualified: Identified as peer marketing agency',
          },
        ],
      };

      const competitorBiz = {
        name: 'Top Rank Marketing',
        industry: 'Digital Marketing Agency',
      };

      const validBiz = {
        name: 'Dr. Smile Dental Clinic',
        industry: 'Dentist Clinic',
      };

      const competitorResult = engine.evaluate(competitorBiz, profile);
      assert.equal(competitorResult.matched, false);
      assert.equal(competitorResult.triggeredExclusions.length, 1);
      assert.equal(competitorResult.triggeredExclusions[0], 'Exclude Marketing Agencies');
      assert.ok(competitorResult.reasons.some((r) => r.includes('peer marketing agency')));

      const validResult = engine.evaluate(validBiz, profile);
      assert.equal(validResult.matched, true);
      assert.equal(validResult.triggeredExclusions.length, 0);
    });
  });

  // =========================================================================
  // 7. MISSING DATA HANDLING
  // =========================================================================
  describe('7. Missing Data Handling', () => {
    it('should gracefully handle missing or null nested properties without errors', () => {
      const profile: ICPProfile = {
        id: 'test-missing-data',
        name: 'Test Missing Data',
        rules: [
          {
            id: 'ss-overall-score',
            name: 'Website Overall Score (< 50)',
            type: 'SOFT_SIGNAL',
            condition: {
              field: 'websiteData.overallScore',
              operator: 'less_than',
              value: 50,
            },
            weight: 20,
          },
          {
            id: 'ss-no-website',
            name: 'Website Does Not Exist',
            type: 'SOFT_SIGNAL',
            condition: {
              field: 'website',
              operator: 'does_not_exist',
            },
            weight: 30,
          },
        ],
      };

      // Business with no websiteData object at all
      const business = {
        name: 'Freshly Baked',
        website: null,
      };

      const result = engine.evaluate(business, profile);

      assert.equal(result.matched, true);
      // websiteData.overallScore is undefined -> less_than returns false safely
      // website does_not_exist -> returns true (+30)
      assert.equal(result.score, 30);
    });

    it('field extractor should support dot-notation, arrays, and computed aliases', () => {
      const sample = {
        name: 'Elite Gym',
        phone: '+1234567890',
        website: null,
        verifiedWebsite: 'https://elitegym.com',
        ownerName: 'Alex Mercer',
        ownerConfidence: 85,
        websiteData: {
          cms: 'WordPress',
          issues: [{ type: 'NO_SSL' }, { type: 'SLOW_LOAD' }],
        },
        socialProfiles: [{ platform: 'INSTAGRAM' }, { platform: 'FACEBOOK' }],
      };

      assert.equal(getNestedProperty(sample, 'name'), 'Elite Gym');
      assert.equal(getNestedProperty(sample, 'websiteData.cms'), 'WordPress');
      assert.equal(getNestedProperty(sample, 'hasWebsite'), true);
      assert.equal(getNestedProperty(sample, 'hasPhone'), true);
      assert.equal(getNestedProperty(sample, 'hasOwner'), true);
      assert.equal(getNestedProperty(sample, 'socialProfilesCount'), 2);
      assert.deepEqual(getNestedProperty(sample, 'websiteData.issues.type'), ['NO_SSL', 'SLOW_LOAD']);
      assert.equal(getNestedProperty(sample, 'nonExistent.subField'), undefined);
    });
  });

  // =========================================================================
  // 8. SCORE NORMALIZATION & PRIORITY
  // =========================================================================
  describe('8. Score Normalization & Priority Thresholds', () => {
    it('additive mode should clamp scores to [0, 100]', () => {
      const profile: ICPProfile = {
        id: 'test-additive-clamp',
        name: 'Test Additive Clamp',
        scoringConfig: { mode: 'additive', maxScore: 100 },
        rules: [
          {
            id: 'ss-1',
            name: 'Signal 1 (+60)',
            type: 'SOFT_SIGNAL',
            condition: { field: 'flag1', operator: 'equals', value: true },
            weight: 60,
          },
          {
            id: 'ss-2',
            name: 'Signal 2 (+70)',
            type: 'SOFT_SIGNAL',
            condition: { field: 'flag2', operator: 'equals', value: true },
            weight: 70,
          },
        ],
      };

      const business = { flag1: true, flag2: true };
      const result = engine.evaluate(business, profile);

      assert.equal(result.rawScore, 130);
      assert.equal(result.score, 100); // clamped to 100
    });

    it('proportional mode should scale score relative to max possible positive weight', () => {
      const profile: ICPProfile = {
        id: 'test-proportional',
        name: 'Test Proportional',
        scoringConfig: { mode: 'proportional', maxScore: 100 },
        rules: [
          {
            id: 'ss-1',
            name: 'Signal 1 (+50)',
            type: 'SOFT_SIGNAL',
            condition: { field: 'flag1', operator: 'equals', value: true },
            weight: 50,
          },
          {
            id: 'ss-2',
            name: 'Signal 2 (+50)',
            type: 'SOFT_SIGNAL',
            condition: { field: 'flag2', operator: 'equals', value: true },
            weight: 50,
          },
        ],
      };

      // Only flag1 matched: earned 50 out of 100 possible = 50%
      const result = engine.evaluate({ flag1: true, flag2: false }, profile);
      assert.equal(result.score, 50);

      // Both matched: 100 out of 100 possible = 100%
      const resultBoth = engine.evaluate({ flag1: true, flag2: true }, profile);
      assert.equal(resultBoth.score, 100);
    });

    it('should assign priority correctly based on thresholds (HIGH >= 70, MEDIUM >= 40, LOW < 40)', () => {
      const profile: ICPProfile = {
        id: 'test-priority',
        name: 'Test Priority',
        scoringConfig: { highPriorityThreshold: 70, mediumPriorityThreshold: 40 },
        rules: [
          {
            id: 'ss-score',
            name: 'Dynamic Score',
            type: 'SOFT_SIGNAL',
            condition: { field: 'targetScore', operator: 'exists' },
            weight: 0, // dynamic
          },
        ],
      };

      const highProfile: ICPProfile = {
        ...profile,
        rules: [{ ...profile.rules[0], weight: 85 }],
      };
      const medProfile: ICPProfile = {
        ...profile,
        rules: [{ ...profile.rules[0], weight: 55 }],
      };
      const lowProfile: ICPProfile = {
        ...profile,
        rules: [{ ...profile.rules[0], weight: 25 }],
      };

      assert.equal(engine.evaluate({ targetScore: true }, highProfile).priority, 'HIGH');
      assert.equal(engine.evaluate({ targetScore: true }, medProfile).priority, 'MEDIUM');
      assert.equal(engine.evaluate({ targetScore: true }, lowProfile).priority, 'LOW');
    });

    it('should respect zeroScoreOnDisqualification when configured', () => {
      const profile: ICPProfile = {
        id: 'test-zero-score',
        name: 'Test Zero On Disqualification',
        scoringConfig: { zeroScoreOnDisqualification: true },
        rules: [
          {
            id: 'hf-fail',
            name: 'Failing Hard Filter',
            type: 'HARD_FILTER',
            condition: { field: 'valid', operator: 'equals', value: true },
          },
          {
            id: 'ss-pts',
            name: 'Soft Points (+50)',
            type: 'SOFT_SIGNAL',
            condition: { field: 'hasOpportunity', operator: 'equals', value: true },
            weight: 50,
          },
        ],
      };

      const business = { valid: false, hasOpportunity: true };
      const result = engine.evaluate(business, profile);

      assert.equal(result.matched, false);
      assert.equal(result.rawScore, 50);
      assert.equal(result.score, 0); // zeroed out
    });
  });

  // =========================================================================
  // 9. REAL-WORLD AGENCY ICP PROFILES INTEGRATION TEST
  // =========================================================================
  describe('9. Real-World Agency ICP Profiles', () => {
    it('WebDevRedesignICP qualifies an established clinic with a slow/outdated website', () => {
      const primeClinic = {
        name: 'Dr. Arora Multispeciality Dental Centre',
        industry: 'Dental Clinic',
        city: 'Delhi',
        phone: '+919811122334',
        reviewCount: 145, // >= 15 passes HF, >= 100 awards +20 pts
        website: 'https://draroradental.com',
        websiteData: {
          overallScore: 42,      // < 60 awards +20 pts
          performanceScore: 35,  // < 50 awards +15 pts
          sslEnabled: false,     // missing SSL awards +15 pts
        },
      };

      const result = engine.evaluate(primeClinic, WebDevRedesignICP);

      assert.equal(result.matched, true);
      assert.equal(result.failedHardFilters.length, 0);
      assert.equal(result.triggeredExclusions.length, 0);
      // Soft scores: Low overall (20) + Slow perf (15) + Missing SSL (15) + High review count (20) = 70
      assert.equal(result.score, 70);
      assert.equal(result.priority, 'HIGH');
      assert.ok(result.positiveSignals.length >= 3);
    });

    it('WebDevRedesignICP excludes a peer marketing agency even if it has high reviews', () => {
      const agencyCompetitor = {
        name: 'Delhi Digital Solutions Agency',
        industry: 'Web Design & Marketing Agency',
        phone: '+919899001122',
        reviewCount: 95,
        website: 'https://delhidigital.in',
      };

      const result = engine.evaluate(agencyCompetitor, WebDevRedesignICP);

      assert.equal(result.matched, false);
      assert.ok(result.triggeredExclusions.some((e) => e.includes('Exclude Competitor Digital')));
    });

    it('MarketingAgencyICP qualifies a high-rated restaurant with weak SEO and active Instagram', () => {
      const restaurant = {
        name: 'Bake & Brew Artisanal Kitchen',
        industry: 'Restaurant / Cafe',
        rating: 4.6,        // >= 4.0 passes HF
        reviewCount: 88,    // >= 50 awards +20 pts
        website: 'https://bakeandbrew.com', // passes HF
        socialProfiles: [{ platform: 'INSTAGRAM', followers: 4500 }], // awards +25 pts
        websiteData: {
          seoScore: 35,     // < 50 awards +35 pts
        },
        hasOwner: true,     // awards +20 pts
      };

      const result = engine.evaluate(restaurant, MarketingAgencyICP);

      assert.equal(result.matched, true);
      assert.equal(result.failedHardFilters.length, 0);
      // SEO gap (35) + Social gap (25) + Reviews (20) + Owner (20) = 100
      assert.equal(result.score, 100);
      assert.equal(result.priority, 'HIGH');
    });
  });

  // =========================================================================
  // 10. TEXT & LIST OPERATOR COVERAGE
  // =========================================================================
  describe('10. Text & List Operator Edge Cases', () => {
    it('exact_match, starts_with, ends_with, does_not_contain work as expected', () => {
      const startsWithCond = { field: 'domain', operator: 'starts_with' as const, value: 'https://' };
      const endsWithCond = { field: 'email', operator: 'ends_with' as const, value: '.com' };
      const exactMatchCond = { field: 'status', operator: 'exact_match' as const, value: 'NEW' };
      const doesNotContainCond = { field: 'url', operator: 'does_not_contain' as const, value: 'google.com' };

      assert.equal(evaluateCondition('https://example.com', startsWithCond).matched, true);
      assert.equal(evaluateCondition('http://example.com', startsWithCond).matched, false);

      assert.equal(evaluateCondition('info@example.com', endsWithCond).matched, true);
      assert.equal(evaluateCondition('info@example.org', endsWithCond).matched, false);

      assert.equal(evaluateCondition('NEW', exactMatchCond).matched, true);
      assert.equal(evaluateCondition('new', exactMatchCond).matched, true); // case-insensitive by default
      assert.equal(evaluateCondition('OLD', exactMatchCond).matched, false);

      assert.equal(evaluateCondition('https://mybusiness.com', doesNotContainCond).matched, true);
      assert.equal(evaluateCondition('https://google.com/maps', doesNotContainCond).matched, false);
    });

    it('is_one_of and is_not_one_of support scalar values and array values', () => {
      const isOneOfCond = {
        field: 'industry',
        operator: 'is_one_of' as const,
        value: ['Dentist', 'Orthodontist', 'Dental Clinic'],
      };
      const isNotOneOfCond = {
        field: 'industry',
        operator: 'is_not_one_of' as const,
        value: ['Govt Agency', 'Public School'],
      };

      assert.equal(evaluateCondition('Dentist', isOneOfCond).matched, true);
      assert.equal(evaluateCondition('Plumber', isOneOfCond).matched, false);

      // Testing array of technologies against allowed/forbidden lists
      const techArrayCond = {
        field: 'technologies',
        operator: 'is_one_of' as const,
        value: ['WordPress', 'Shopify'],
      };
      assert.equal(evaluateCondition(['WordPress', 'WooCommerce'], techArrayCond).matched, true);
      assert.equal(evaluateCondition(['Next.js', 'React'], techArrayCond).matched, false);

      assert.equal(evaluateCondition('Private Practice', isNotOneOfCond).matched, true);
      assert.equal(evaluateCondition('Public School', isNotOneOfCond).matched, false);
    });
  });

  // =========================================================================
  // 11. BATCH EVALUATION & MIN PASSING SCORE
  // =========================================================================
  describe('11. Batch Evaluation & Min Passing Score', () => {
    it('evaluateBatch processes multiple records efficiently', () => {
      const records = [
        { name: 'Biz 1', reviewCount: 50, phone: '+123' },
        { name: 'Biz 2', reviewCount: 5, phone: '+456' }, // fails review count
        { name: 'Biz 3', reviewCount: 100, phone: null },  // fails phone
      ];

      const profile: ICPProfile = {
        id: 'test-batch',
        name: 'Test Batch Profile',
        rules: [
          {
            id: 'hf-rev',
            name: 'Min 20 Reviews',
            type: 'HARD_FILTER',
            condition: { field: 'reviewCount', operator: 'greater_than_or_equal', value: 20 },
          },
          {
            id: 'hf-ph',
            name: 'Has Phone',
            type: 'HARD_FILTER',
            condition: { field: 'phone', operator: 'exists' },
          },
        ],
      };

      const results = engine.evaluateBatch(records, profile);
      assert.equal(results.length, 3);
      assert.equal(results[0].matched, true);
      assert.equal(results[1].matched, false);
      assert.equal(results[2].matched, false);
    });

    it('minPassingScore rejects leads whose score falls below the required threshold', () => {
      const profile: ICPProfile = {
        id: 'test-min-score',
        name: 'Test Min Score Threshold',
        scoringConfig: {
          minPassingScore: 60,
        },
        rules: [
          {
            id: 'ss-score',
            name: 'Score points',
            type: 'SOFT_SIGNAL',
            condition: { field: 'hasSSL', operator: 'equals', value: true },
            weight: 40, // only 40 points, min required is 60!
          },
        ],
      };

      const business = { hasSSL: true };
      const result = engine.evaluate(business, profile);

      assert.equal(result.score, 40);
      assert.equal(result.matched, false); // rejected because 40 < 60
      assert.ok(result.reasons.some((r) => r.includes('below minimum passing threshold')));
    });
  });

  // =========================================================================
  // 12. RULE ENABLE/DISABLE & PROMPT EXAMPLES
  // =========================================================================
  describe('12. Rule Enable/Disable & Prompt Examples', () => {
    it('should ignore disabled hard filters and exclusions (enabled: false)', () => {
      const profile: ICPProfile = {
        id: 'test-disabled-rules',
        name: 'Disabled Rules Test',
        rules: [
          {
            id: 'hf-failing-but-disabled',
            name: 'Failing Hard Filter (Disabled)',
            type: 'HARD_FILTER',
            enabled: false,
            condition: { field: 'reviewCount', operator: 'greater_than', value: 1000 },
          },
          {
            id: 'ex-triggering-but-disabled',
            name: 'Triggering Exclusion (Disabled)',
            type: 'EXCLUSION',
            enabled: false,
            condition: { field: 'industry', operator: 'contains', value: 'Dental' },
          },
          {
            id: 'hf-passing',
            name: 'Passing Active Filter',
            type: 'HARD_FILTER',
            enabled: true,
            condition: { field: 'phone', operator: 'exists' },
          },
        ],
      };

      const business = {
        name: 'Family Dental Clinic',
        industry: 'Dental Care',
        reviewCount: 20,
        phone: '+1-555-0100',
      };

      const result = engine.evaluate(business, profile);
      assert.strictEqual(result.matched, true, 'Should match because failing hard filter and exclusion are disabled');
      assert.strictEqual(result.failedHardFilters.length, 0);
      assert.strictEqual(result.triggeredExclusions.length, 0);
    });

    it('should evaluate prompt examples: Business Age >= 5 years (HF) and Website Quality < 60 (SS +20)', () => {
      const profile: ICPProfile = {
        id: 'prompt-example-profile',
        name: 'Prompt Example ICP Profile',
        rules: [
          {
            id: 'hf-business-age',
            name: 'Business age >= 5 years',
            type: 'HARD_FILTER',
            condition: { field: 'businessAge', operator: 'greater_than_or_equal', value: 5 },
          },
          {
            id: 'ss-website-quality',
            name: 'Website quality < 60',
            type: 'SOFT_SIGNAL',
            weight: 20,
            condition: { field: 'websiteQuality', operator: 'less_than', value: 60 },
          },
        ],
      };

      // Case A: Business age = 6 years, websiteQuality = 45 -> Qualifies and scores +20
      const bizA = {
        name: 'Apex Ortho',
        businessAge: 6,
        websiteQuality: 45,
      };
      const resA = engine.evaluate(bizA, profile);
      assert.strictEqual(resA.matched, true);
      assert.strictEqual(resA.score, 20);

      // Case B: Business age = 3 years -> Fails hard filter
      const bizB = {
        name: 'New Startup Clinic',
        businessAge: 3,
        websiteQuality: 30,
      };
      const resB = engine.evaluate(bizB, profile);
      assert.strictEqual(resB.matched, false);
      assert.strictEqual(resB.failedHardFilters.length, 1);
    });
  });
});


