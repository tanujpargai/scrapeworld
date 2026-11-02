/**
 * ICPEngineService - Core Ideal Customer Profile Evaluation Engine
 * 
 * Evaluates raw or normalized business records against configurable ICP profiles.
 * Executes a clean, multi-stage pipeline:
 * 
 * Business Data
 *     ↓
 * ICP Rules
 *     ↓
 * Rule Evaluation
 *     ↓
 * Hard Filter Evaluation & Exclusions
 *     ↓
 * Weighted Opportunity Scoring & Normalization
 *     ↓
 * Explainable ICP Result
 */

import type {
  ICPProfile,
  ICPRule,
  ICPEvaluation,
  RuleEvaluation,
  ScoreContribution,
  ICPPriority,
} from '../../types/icp';
import { getNestedProperty } from './fieldExtractor';
import { evaluateCondition } from './operators';

export class ICPEngineService {
  /**
   * Static convenience evaluator for single business.
   */
  static evaluate(business: any, icp: ICPProfile): ICPEvaluation {
    return new ICPEngineService().evaluate(business, icp);
  }

  /**
   * Static convenience evaluator for batch.
   */
  static evaluateBatch(businesses: any[], icp: ICPProfile): ICPEvaluation[] {
    return new ICPEngineService().evaluateBatch(businesses, icp);
  }

  /**
   * Evaluates a single business against an ICP profile.
   */
  evaluate(business: any, icp: ICPProfile): ICPEvaluation {
    if (!business) {
      throw new Error('Business object is required for ICP evaluation');
    }
    if (!icp || !Array.isArray(icp.rules)) {
      throw new Error('Valid ICP profile with rules array is required');
    }

    const scoringConfig = icp.scoringConfig || {};
    const scoringMode = scoringConfig.mode || 'additive';
    const maxScoreCap = scoringConfig.maxScore ?? 100;
    const minPassingScore = scoringConfig.minPassingScore ?? 0;
    const highThreshold = scoringConfig.highPriorityThreshold ?? 70;
    const mediumThreshold = scoringConfig.mediumPriorityThreshold ?? 40;
    const zeroScoreOnDisqualification = scoringConfig.zeroScoreOnDisqualification ?? false;

    const ruleEvaluations: RuleEvaluation[] = [];
    const scoreContributions: ScoreContribution[] = [];
    const passedHardFilters: string[] = [];
    const failedHardFilters: string[] = [];
    const triggeredExclusions: string[] = [];
    const positiveSignals: string[] = [];
    const negativeSignals: string[] = [];
    const reasons: string[] = [];

    let rawScore = 0;
    let maxPossibleScore = 0;
    let hardFiltersPassed = true;
    let exclusionsClear = true;

    // 1. Evaluate every rule individually
    for (const rule of icp.rules) {
      if (rule.enabled === false) {
        continue;
      }
      const evaluation = this.evaluateRule(business, rule);
      ruleEvaluations.push(evaluation);

      switch (rule.type) {
        // ----------------------------------------------------
        // HARD FILTERS: Must evaluate to true for the lead to qualify
        // ----------------------------------------------------
        case 'HARD_FILTER': {
          if (evaluation.passed) {
            passedHardFilters.push(rule.name);
          } else {
            hardFiltersPassed = false;
            failedHardFilters.push(rule.name);
            reasons.push(
              rule.failureExplanation ||
                `Failed hard filter '${rule.name}': ${evaluation.explanation}`
            );
          }
          break;
        }

        // ----------------------------------------------------
        // EXCLUSIONS: If condition is met, the lead is disqualified
        // ----------------------------------------------------
        case 'EXCLUSION': {
          if (!evaluation.passed) {
            // conditionMet is true, meaning exclusion triggered!
            exclusionsClear = false;
            triggeredExclusions.push(rule.name);
            reasons.push(
              rule.explanation ||
                `Triggered exclusion '${rule.name}': ${evaluation.explanation}`
            );
          }
          break;
        }

        // ----------------------------------------------------
        // SOFT SIGNALS: Contribute weighted score towards opportunity
        // ----------------------------------------------------
        case 'SOFT_SIGNAL': {
          const weight = rule.weight ?? 10;
          if (weight > 0) {
            maxPossibleScore += weight;
          }

          if (evaluation.passed) {
            rawScore += evaluation.pointsAwarded;
            scoreContributions.push({
              ruleId: rule.id,
              ruleName: rule.name,
              weight,
              pointsAwarded: evaluation.pointsAwarded,
              reason: evaluation.explanation,
            });

            if (evaluation.pointsAwarded > 0) {
              positiveSignals.push(
                rule.explanation || `${rule.name} (+${evaluation.pointsAwarded} pts)`
              );
            } else if (evaluation.pointsAwarded < 0) {
              negativeSignals.push(
                rule.failureExplanation || `${rule.name} (${evaluation.pointsAwarded} pts penalty)`
              );
            }
          }
          break;
        }
      }
    }

    // 2. Score Normalization
    let normalizedScore = 0;
    if (scoringMode === 'proportional' && maxPossibleScore > 0) {
      const positiveEarned = Math.max(0, rawScore);
      normalizedScore = Math.min(
        maxScoreCap,
        Math.max(0, Math.round((positiveEarned / maxPossibleScore) * maxScoreCap))
      );
    } else {
      // Additive mode: sum of awarded points clamped to [0, maxScoreCap]
      normalizedScore = Math.min(maxScoreCap, Math.max(0, rawScore));
    }

    // 3. Overall Match Determination
    let matched = hardFiltersPassed && exclusionsClear;

    // Check minimum passing score threshold if configured
    if (matched && minPassingScore > 0 && normalizedScore < minPassingScore) {
      matched = false;
      reasons.push(
        `Score (${normalizedScore}) is below minimum passing threshold (${minPassingScore})`
      );
    }

    // Adjust score if configured to zero out on disqualification
    const finalScore = !matched && zeroScoreOnDisqualification ? 0 : normalizedScore;

    // 4. Priority Determination
    let priority: ICPPriority = 'LOW';
    if (matched) {
      if (finalScore >= highThreshold) {
        priority = 'HIGH';
      } else if (finalScore >= mediumThreshold) {
        priority = 'MEDIUM';
      } else {
        priority = 'LOW';
      }
    } else {
      priority = 'LOW';
    }

    // 5. Executive Summary Reason
    if (matched) {
      reasons.unshift(
        `Qualified for ICP '${icp.name}' with an opportunity score of ${finalScore}/100 (${priority} Priority).`
      );
    } else {
      reasons.unshift(
        `Disqualified from ICP '${icp.name}'. ${failedHardFilters.length} hard filter(s) failed, ${triggeredExclusions.length} exclusion(s) triggered.`
      );
    }

    return {
      icpId: icp.id,
      icpName: icp.name,
      matched,
      score: finalScore,
      rawScore,
      maxPossibleScore,
      priority,
      passedHardFilters,
      failedHardFilters,
      triggeredExclusions,
      positiveSignals,
      negativeSignals,
      reasons,
      ruleEvaluations,
      scoreContributions,
      evaluatedAt: new Date(),
    };
  }

  /**
   * Evaluates a single rule against a business record.
   */
  evaluateRule(business: any, rule: ICPRule): RuleEvaluation {
    const actualValue = getNestedProperty(business, rule.condition.field);
    const outcome = evaluateCondition(actualValue, rule.condition);
    const conditionMet = outcome.matched;

    let passed = false;
    let pointsAwarded = 0;
    const weight = rule.weight ?? (rule.type === 'SOFT_SIGNAL' ? 10 : 0);

    if (rule.type === 'HARD_FILTER') {
      passed = conditionMet;
    } else if (rule.type === 'EXCLUSION') {
      // For exclusions, the rule "passes" if the exclusion condition is NOT met.
      // If condition is met, the business matches the exclusion criteria and fails!
      passed = !conditionMet;
    } else if (rule.type === 'SOFT_SIGNAL') {
      passed = conditionMet;
      if (conditionMet) {
        pointsAwarded = weight;
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      conditionMet,
      passed,
      field: rule.condition.field,
      actualValue,
      operator: rule.condition.operator,
      expectedValue: rule.condition.value,
      secondExpectedValue: rule.condition.secondValue,
      pointsAwarded,
      weight,
      explanation: outcome.explanation,
    };
  }

  /**
   * Batch evaluate multiple businesses against a given ICP profile.
   */
  evaluateBatch(businesses: any[], icp: ICPProfile): ICPEvaluation[] {
    return businesses.map((business) => this.evaluate(business, icp));
  }
}
