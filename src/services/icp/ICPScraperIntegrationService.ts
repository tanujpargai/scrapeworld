/**
 * ICPScraperIntegrationService
 * 
 * Integration layer connecting the scraping pipeline to the ICP evaluation engine.
 * 
 * Pipeline flow:
 * SCRAPER
 *     ↓
 * RAW BUSINESS DATA
 *     ↓
 * NORMALIZATION
 *     ↓
 * EXISTING FILTERS
 *     ↓
 * ICP ENGINE
 *     ↓
 * QUALIFIED LEADS
 *     ↓
 * ICP SCORE
 *     ↓
 * RANKED RESULTS
 */

import type {
  ICPProfile,
  ICPLeadResult,
  ICPBatchQualificationResult,
  ICPPriority,
} from '@/types/icp';
import { DataNormalizationService, NormalizedBusiness } from './DataNormalizationService';
import { ExistingFilterEvaluator, ExistingFilterOutcome } from './ExistingFilterEvaluator';
import { ICPEngineService } from './ICPEngineService';
import { ExplanationService } from './ExplanationService';
import { DeduplicationService } from '@/services/lead/DeduplicationService';
import { icpEvaluationRepository } from '@/repositories/ICPEvaluationRepository';

export class ICPScraperIntegrationService {
  private icpEngine: ICPEngineService;

  constructor(icpEngine?: ICPEngineService) {
    this.icpEngine = icpEngine || new ICPEngineService();
  }

  /**
   * Qualifies a single business through the normalization, existing filters, and ICP engine pipeline.
   */
  qualifyBusiness(
    rawOrDbBusiness: any,
    icp: ICPProfile | null = null,
    collectionId?: string
  ): ICPLeadResult {
    // 1. Normalize business data
    const normalized = DataNormalizationService.normalize(rawOrDbBusiness);

    // 2. Run existing filters (Preserves backward compatibility)
    const existingFilters = ExistingFilterEvaluator.evaluate({
      name: normalized.name,
      industry: normalized.industry,
      reviewCount: normalized.reviewCount,
      categories: normalized.categories,
    });

    // 3. Fallback path if no ICP is selected
    if (!icp) {
      const fallbackScore = this.computeFallbackScore(normalized, existingFilters);
      const priority: ICPPriority =
        fallbackScore >= 70 ? 'HIGH' : fallbackScore >= 40 ? 'MEDIUM' : 'LOW';

      return {
        businessId: normalized.id,
        businessName: normalized.name,
        business: normalized,
        icpId: 'default-qualification',
        icpName: 'General Lead Qualification (No ICP)',
        matched: true,
        score: fallbackScore,
        priority,
        passedHardFilters: ['Standard Lead (No ICP configured)'],
        failedHardFilters: [],
        triggeredExclusions: [],
        positiveSignals: normalized.hasWebsite ? ['Has Website'] : ['No Website (Opportunity)'],
        negativeSignals: [],
        reasons: ['Processed with standard scoring (No ICP selected)'],
        scoreContributions: [],
        existingFilterResults: existingFilters,
        evaluatedAt: new Date().toISOString(),
        formattedExplanations: {
          businessName: normalized.name,
          icpName: 'General Opportunity Assessment',
          score: fallbackScore,
          priority,
          positiveSignals: normalized.hasWebsite ? ['+10 Has Active Website'] : ['+15 No Website (Redesign Opportunity)'],
          negativeSignals: [],
          hardFilters: ['✓ Standard Lead Profile'],
          unknownSignals: [],
          summaryText: `Processed with standard scoring (No ICP selected). Score: ${fallbackScore}/100 (${priority} Priority).`,
        },
      };
    }

    // 4. Evaluate through ICP Rule Engine with existing filter flags enriched
    const businessToEvaluate = {
      ...normalized,
      isEnterprise: existingFilters.enterpriseFlag,
      isFranchise: existingFilters.franchiseFlag,
      isEnterpriseOrFranchise: existingFilters.enterpriseFlag || existingFilters.franchiseFlag,
      isCompetitorIndustry: existingFilters.competitorIndustryFlag,
      outreachSuitabilityScore: existingFilters.outreachSuitabilityScore,
    };

    const evaluation = this.icpEngine.evaluate(businessToEvaluate, icp);

    // 5. Integrate existing filter results into reasons & signals if relevant
    const positiveSignals = [...evaluation.positiveSignals];
    const negativeSignals = [...evaluation.negativeSignals];
    const reasons = [...evaluation.reasons];

    if (existingFilters.enterpriseFlag) {
      negativeSignals.push('Enterprise Brand Flagged');
      reasons.push('Existing filter detected enterprise brand keyword');
    }
    if (existingFilters.franchiseFlag) {
      negativeSignals.push('Franchise / Large Chain Flagged');
      reasons.push('Existing filter detected franchise chain footprint');
    }
    if (existingFilters.competitorIndustryFlag) {
      negativeSignals.push('Competitor Agency Flagged');
      reasons.push('Existing filter detected competitor agency industry');
    }

    const fullExplanation = ExplanationService.generateExplanation(evaluation, normalized, icp);

    return {
      businessId: normalized.id,
      businessName: normalized.name,
      business: normalized,
      icpId: icp.id,
      icpName: icp.name,
      matched: evaluation.matched,
      score: evaluation.score,
      priority: evaluation.priority,
      passedHardFilters: evaluation.passedHardFilters,
      failedHardFilters: evaluation.failedHardFilters,
      triggeredExclusions: evaluation.triggeredExclusions,
      positiveSignals,
      negativeSignals,
      reasons,
      ruleEvaluations: evaluation.ruleEvaluations,
      scoreContributions: evaluation.scoreContributions,
      existingFilterResults: existingFilters,
      evaluatedAt: new Date().toISOString(),
      explanation: fullExplanation,
      formattedExplanations: {
        businessName: fullExplanation.businessName,
        icpName: fullExplanation.icpName,
        score: evaluation.score,
        priority: evaluation.priority,
        positiveSignals: fullExplanation.positiveSignalStrings,
        negativeSignals: fullExplanation.negativeSignalStrings,
        hardFilters: fullExplanation.passedHardFilterStrings,
        unknownSignals: fullExplanation.unknownSignalStrings,
        summaryText: fullExplanation.summaryText,
      },
    };
  }

  /**
   * Qualifies a batch of businesses against an ICP, ranks qualified leads, and persists results.
   */
  async qualifyBatch(
    businesses: any[],
    icp: ICPProfile | null = null,
    collectionId?: string
  ): Promise<ICPBatchQualificationResult> {
    const { unique: uniqueBusinesses } = DeduplicationService.deduplicateBatch(businesses);
    const qualified: ICPLeadResult[] = [];
    const rejected: ICPLeadResult[] = [];

    for (const b of uniqueBusinesses) {
      const result = this.qualifyBusiness(b, icp);
      if (result.matched) {
        qualified.push(result);
      } else {
        rejected.push(result);
      }
    }

    // Rank qualified leads in descending order of ICP score
    qualified.sort((a, b) => b.score - a.score);

    const totalEvaluated = uniqueBusinesses.length;
    const qualifiedCount = qualified.length;
    const rejectedCount = rejected.length;
    const matchRate = totalEvaluated > 0 ? Math.round((qualifiedCount / totalEvaluated) * 100) : 0;

    const batchResult: ICPBatchQualificationResult = {
      collectionId,
      icpId: icp?.id || 'default-qualification',
      icpName: icp?.name || 'General Lead Qualification (No ICP)',
      totalEvaluated,
      qualifiedCount,
      rejectedCount,
      matchRate,
      qualified,
      rejected,
      rankedLeads: qualified,
      allLeads: [...qualified, ...rejected],
      evaluatedAt: new Date().toISOString(),
    };

    // Persist evaluation result for the collection
    if (collectionId) {
      try {
        await icpEvaluationRepository.saveCollectionEvaluation(collectionId, batchResult);
      } catch (err) {
        console.error(`Failed to persist ICP evaluation for collection ${collectionId}:`, err);
      }
    }

    return batchResult;
  }

  /**
   * Computes a fallback opportunity score when no ICP is selected.
   */
  private computeFallbackScore(
    normalized: NormalizedBusiness,
    existingFilters: ExistingFilterOutcome
  ): number {
    let score = 50;

    // Review traction
    if (normalized.reviewCount >= 50) score += 20;
    else if (normalized.reviewCount >= 10) score += 10;
    else if (normalized.reviewCount === 0) score -= 10;

    // Contactability
    if (normalized.hasPhone) score += 10;
    if (normalized.hasEmail) score += 10;
    if (normalized.hasOwner) score += 10;

    // Website presence
    if (!normalized.hasWebsite) {
      score += 15; // Strong opportunity for web development
    } else if (normalized.websiteData?.performanceScore && normalized.websiteData.performanceScore < 50) {
      score += 15;
    }

    // Deduct for enterprise/franchise
    if (existingFilters.enterpriseFlag) score -= 40;
    if (existingFilters.franchiseFlag) score -= 30;

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, score));
  }
}

export const icpScraperIntegrationService = new ICPScraperIntegrationService();
