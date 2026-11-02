/**
 * Opportunity Intelligence Types
 * 
 * Defines typed data structures for evidence-based agency opportunity analysis.
 * Serves Integral Labs (web dev, redesign, e-commerce, technical infrastructure)
 * and Integral Marketing (SEO, metadata, analytics, social growth).
 * 
 * Strict Zero-Cost & Fact-Grounded Constraints:
 * - Clear separation of: Observed Fact vs. Interpretation vs. Recommended Action.
 * - Evidence confidence, opportunity relevance, and priority are kept distinct.
 * - Zero financial or revenue inferences.
 * - Zero external LLM requirement.
 */

import type { SignalStatus, ICPPriority } from './icp';

export type OpportunityCategory =
  | 'WEBSITE_DEVELOPMENT'
  | 'TECHNICAL_SEO'
  | 'DIGITAL_MARKETING'
  | 'ECOMMERCE';

export type AgencyDivision =
  | 'INTEGRAL_LABS'
  | 'INTEGRAL_MARKETING';

export type OpportunitySeverity =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';

export type OpportunityStatus =
  | 'IDENTIFIED'
  | 'VALIDATED'
  | 'DISMISSED';

/**
 * Concrete supporting evidence signal.
 */
export interface OpportunityEvidence {
  field: string;
  value: any;
  status: SignalStatus;
  source: string;
  confidence: number; // 0.0 to 1.0
  timestamp?: string;
  notes?: string;
}

/**
 * Comprehensive evidence-based opportunity record.
 */
export interface OpportunityRecord {
  opportunityId: string;
  businessId: string;
  category: OpportunityCategory;
  division: AgencyDivision;
  title: string;
  summary: string;

  /** 1. What the system actually detected (verified fact) */
  observedFact: string;

  /** 2. Why that finding may matter to the business */
  interpretation: string;

  /** 3. What the agency could investigate or offer */
  recommendedAction: string;

  /** Specific service offered by Integral Labs or Integral Marketing */
  recommendedService: string;

  /** Next tactical step for the sales or technical team */
  recommendedNextAction: string;

  /** Verified evidence signals backing this finding */
  supportingEvidence: OpportunityEvidence[];

  /** Inspected URLs that yielded this evidence */
  sourceUrls: string[];

  /** Timestamp of detection */
  detectedAt: string;

  /** How reliably the finding was observed (0.0 to 1.0) */
  evidenceConfidence: number;

  /** How closely the finding matches a supported agency service (0.0 to 1.0) */
  opportunityRelevance: number;

  /** Urgency / priority classification: HIGH | MEDIUM | LOW */
  priority: ICPPriority;

  /** Transparent deterministic priority score (0 to 100) */
  priorityScore: number;

  /** Severity of the detected defect / bottleneck */
  severity: OpportunitySeverity;

  /** Explicit unknowns, audit boundaries, or collection limitations */
  limitations: string[];

  /** Workflow status */
  status: OpportunityStatus;
}

/**
 * Deterministic outreach brief for human sales review.
 * Grounded strictly in verified business observations.
 */
export interface OutreachBrief {
  businessName: string;
  website: string | null;
  primaryObservation: string;
  businessImpact: string;
  relevantServices: string[];
  suggestedOpeningAngle: string;
  uncertaintiesToVerify: string[];
  generatedAt: string;
  isAiFreeDraft: boolean;
}

/**
 * Aggregate result of the opportunity evaluation.
 */
export interface OpportunityAnalysisResult {
  businessId: string;
  businessName: string;
  totalOpportunities: number;
  highestPriorityOpportunity: OpportunityRecord | null;
  opportunities: OpportunityRecord[];
  brief: OutreachBrief;
  insufficientEvidenceReasons?: string[];
}
