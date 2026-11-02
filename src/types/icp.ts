/**
 * ICP (Ideal Customer Profile) Engine Type Definitions
 * 
 * Provides types and interfaces for the rules engine, condition evaluators,
 * opportunity scoring, and evaluation outcomes.
 */

export type ICPOperator =
  // Boolean & Existence
  | 'equals'
  | 'not_equals'
  | 'exists'
  | 'does_not_exist'
  // Numeric
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'between'
  // Text
  | 'contains'
  | 'does_not_contain'
  | 'exact_match'
  | 'starts_with'
  | 'ends_with'
  // List
  | 'is_one_of'
  | 'is_not_one_of'
  // Keywords
  | 'must_contain'
  | 'must_not_contain'
  | 'contains_any'
  | 'contains_all';

export type ICPRuleType = 'HARD_FILTER' | 'SOFT_SIGNAL' | 'EXCLUSION';

export type ICPPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type ScoringMode = 'additive' | 'proportional';

/**
 * Verification state of an opportunity signal.
 * - KNOWN: Directly verified fact from authoritative source (e.g. Google Maps Place API, HTTP TLS handshake, DOM element presence).
 * - INFERRED: Heuristically derived or estimated from available evidence (e.g. performance formula, review activity tier, CTA regex).
 * - UNKNOWN: Unavailable or unverifiable without external data sources. Never fabricated.
 */
export type SignalStatus = 'KNOWN' | 'INFERRED' | 'UNKNOWN' | 'FAILED_TO_COLLECT';

/**
 * Signal record with source provenance, verification status, and confidence score.
 */
export interface SignalRecord<T = any> {
  value: T;
  status: SignalStatus;
  source: string;
  confidence: number; // 0.0 to 1.0 (1.0 = verified fact, 0.0 = unavailable/unknown)
  timestamp: string;
  notes?: string;
  failureReason?: string;
}

/**
 * Record of conflicting information detected across different enrichment sources.
 */
export interface DataConflict {
  field: string;
  existingValue: any;
  existingSource: string;
  incomingValue: any;
  incomingSource: string;
  timestamp: string;
  resolution: 'PRESERVED_EXISTING' | 'ACCEPTED_INCOMING';
}

/**
 * Condition evaluated against a business field.
 */
export interface ICPCondition {
  /** Field path to evaluate, supporting dot notation (e.g. 'website', 'reviewCount', 'websiteData.overallScore') */
  field: string;
  /** Operator to apply */
  operator: ICPOperator;
  /** Value to compare against */
  value?: any;
  /** Secondary value for range comparisons (e.g. 'between') */
  secondValue?: any;
  /** Case sensitivity flag for text/keyword operators (default: false) */
  caseSensitive?: boolean;
}

/**
 * An individual rule within an ICP profile.
 */
export interface ICPRule {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable name (e.g., 'Minimum 20 Google Reviews', 'Outdated CMS Detected') */
  name: string;
  /** Optional description */
  description?: string;
  /** Rule type: HARD_FILTER (must pass), SOFT_SIGNAL (adds/deducts score), EXCLUSION (if met, rejects) */
  type: ICPRuleType;
  /** Condition to evaluate */
  condition: ICPCondition;
  /** Weight / score contribution for SOFT_SIGNAL (positive or negative number). Defaults to 10 */
  weight?: number;
  /** Custom explanation template when the rule matches */
  explanation?: string;
  /** Custom explanation template when the rule does not match */
  failureExplanation?: string;
  /** Whether the rule is actively enabled (default: true) */
  enabled?: boolean;
}

/**
 * Scoring and priority threshold configuration for an ICP profile.
 */
export interface ICPScoringConfig {
  /** Scoring mode: 'additive' clamps sum at [0, 100]; 'proportional' scales by total positive weights. Default: 'additive' */
  mode?: ScoringMode;
  /** Maximum possible score cap (default: 100) */
  maxScore?: number;
  /** Minimum score required to consider lead a match even if all hard filters pass (default: 0) */
  minPassingScore?: number;
  /** Score threshold to classify as HIGH priority (default: 70) */
  highPriorityThreshold?: number;
  /** Score threshold to classify as MEDIUM priority (default: 40) */
  mediumPriorityThreshold?: number;
  /** If true, sets score to 0 when rejected by hard filter or exclusion. Default: false (keeps opportunity score visible) */
  zeroScoreOnDisqualification?: boolean;
}

/**
 * Ideal Customer Profile definition.
 */
export interface ICPProfile {
  /** Unique identifier */
  id: string;
  /** Profile name (e.g., 'Web Agency: Redesign Candidates', 'Marketing: High-Review Local Businesses') */
  name: string;
  /** Description of this target customer profile */
  description?: string;
  /** Target industry/niche */
  targetNiche?: string;
  /** Target agency service (e.g., 'WEBSITE_REDESIGN', 'LOCAL_SEO', 'GOOGLE_ADS') */
  targetService?: string;
  /** Rules belonging to this profile (can include HARD_FILTER, SOFT_SIGNAL, EXCLUSION) */
  rules: ICPRule[];
  /** Optional scoring thresholds and normalization settings */
  scoringConfig?: ICPScoringConfig;
  /** Metadata tags */
  tags?: string[];
  /** Active status */
  isActive?: boolean;
}

/** Alias for ICPProfile */
export type ICP = ICPProfile;

/**
 * Granular evaluation result for a single rule.
 */
export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  type: ICPRuleType;
  /** Did the condition itself evaluate to true? */
  conditionMet: boolean;
  /**
   * Did this rule result in a pass?
   * - HARD_FILTER: passed = conditionMet
   * - EXCLUSION: passed = !conditionMet (if exclusion condition met, rule fails)
   * - SOFT_SIGNAL: passed = conditionMet
   */
  passed: boolean;
  field: string;
  actualValue: any;
  operator: ICPOperator;
  expectedValue?: any;
  secondExpectedValue?: any;
  /** Points awarded or deducted by this rule */
  pointsAwarded: number;
  weight: number;
  /** Human-readable explanation of the evaluation outcome */
  explanation: string;
}

/**
 * Detailed contribution of a single soft signal to the total score.
 */
export interface ScoreContribution {
  ruleId: string;
  ruleName: string;
  weight: number;
  pointsAwarded: number;
  reason: string;
}

/**
 * Complete evaluation result for a business against an ICP.
 */
export interface ICPEvaluation {
  /** ICP Profile evaluated */
  icpId: string;
  icpName: string;
  /** Did the business qualify for this ICP? (Passed all hard filters, no exclusions, score >= minPassingScore) */
  matched: boolean;
  /** Normalized opportunity score between 0 and 100 */
  score: number;
  /** Raw un-normalized score */
  rawScore: number;
  /** Sum of all possible positive soft signal weights */
  maxPossibleScore: number;
  /** Priority rating based on score and qualification */
  priority: ICPPriority;
  /** Names/summaries of hard filters that passed */
  passedHardFilters: string[];
  /** Names/summaries of hard filters that failed */
  failedHardFilters: string[];
  /** Exclusion rules that triggered (disqualifying the business) */
  triggeredExclusions: string[];
  /** Positive signals identified */
  positiveSignals: string[];
  /** Negative signals or penalties identified */
  negativeSignals: string[];
  /** High-level executive reasons explaining the decision */
  reasons: string[];
  /** Individual evaluation for every rule */
  ruleEvaluations: RuleEvaluation[];
  /** Detailed score breakdown */
  scoreContributions: ScoreContribution[];
  /** Timestamp of evaluation */
  evaluatedAt: Date;
}

/**
 * Comprehensive qualification outcome for a single business in the scraper pipeline.
 */
export interface ICPLeadResult {
  businessId?: string;
  businessName?: string;
  business: any;
  icpId?: string | null;
  icpName?: string | null;
  matched: boolean;
  score: number;
  priority: ICPPriority;
  passedHardFilters: string[];
  failedHardFilters: string[];
  triggeredExclusions: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  reasons: string[];
  ruleEvaluations?: RuleEvaluation[];
  scoreContributions: ScoreContribution[];
  existingFilterResults?: {
    enterpriseFlag: boolean;
    franchiseFlag: boolean;
    competitorIndustryFlag: boolean;
    outreachSuitabilityScore: number;
    flags: string[];
  };
  serviceOpportunity?: string;
  evaluatedAt: string;
  formattedExplanations?: {
    businessName?: string;
    icpName?: string;
    score: number;
    priority: ICPPriority;
    positiveSignals: string[];
    negativeSignals: string[];
    hardFilters: string[];
    unknownSignals: string[];
    summaryText?: string;
  };
  explanation?: any;
}

/**
 * Result of batch ICP evaluation across a set of scraped businesses.
 */
export interface ICPBatchQualificationResult {
  collectionId?: string;
  icpId?: string | null;
  icpName?: string | null;
  totalEvaluated: number;
  qualifiedCount: number;
  rejectedCount: number;
  matchRate: number;
  qualified: ICPLeadResult[]; // Sorted descending by score
  rejected: ICPLeadResult[]; // Preserved for debugging and analytics
  /** Alias for qualified leads sorted descending by score */
  rankedLeads?: ICPLeadResult[];
  /** Combined list of all leads (both qualified and preserved rejected leads) */
  allLeads?: ICPLeadResult[];
  evaluatedAt: string;
}

