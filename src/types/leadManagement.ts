/**
 * Lead Management Types for Agency Prospecting
 * 
 * Provides lightweight CRM and lead qualification data structures
 * without bloating the application into a heavyweight CRM.
 */

import type { ICPPriority } from './icp';

export type LeadStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'CONTACTED'
  | 'REPLIED'
  | 'MEETING'
  | 'WON'
  | 'LOST'
  | 'DISQUALIFIED';

export const ALL_LEAD_STATUSES: LeadStatus[] = [
  'NEW',
  'QUALIFIED',
  'CONTACTED',
  'REPLIED',
  'MEETING',
  'WON',
  'LOST',
  'DISQUALIFIED',
];

export interface LeadNote {
  id: string;
  leadId: string;
  content: string;
  author?: string;
  createdAt: string;
}

export interface LeadContactInfo {
  phone?: string | null;
  email?: string | null;
  ownerName?: string | null;
  ownerRole?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
}

export interface LeadSocialLink {
  platform: string;
  url?: string;
}

import type { OpportunityRecord, OutreachBrief } from './opportunityIntelligence';

/**
 * Deterministic Opportunity Section
 * Explains clearly why the business is an agency sales prospect.
 */
export interface LeadOpportunity {
  /** Opportunity headline, e.g. "WEB DEVELOPMENT OPPORTUNITY" or "MARKETING OPPORTUNITY" */
  type: string;
  /** Opportunity urgency / priority: HIGH | MEDIUM | LOW */
  priority: ICPPriority;
  /** Clear agency sales reason explaining why this company is a prospect */
  whyProspect: string;
  /** Primary agency service recommended */
  relevantService: string;
  /** Actual positive signals that qualified this prospect */
  qualifyingSignals: string[];
  /** Concrete technical or marketing issues detected */
  detectedIssues: string[];
  /** Evidence-based opportunity records (Phase 3) */
  opportunities?: OpportunityRecord[];
  /** Fact-grounded outreach brief for human review (Phase 3) */
  outreachBrief?: OutreachBrief;
}

export interface ManagedLead {
  id: string;
  businessId: string;
  businessName: string;
  status: LeadStatus;
  notes: LeadNote[];
  targetService: string;
  icpId?: string;
  icpName: string;
  icpScore: number;
  priority: ICPPriority;
  matched: boolean;
  contact: LeadContactInfo;
  website?: string | null;
  socialLinks: LeadSocialLink[];
  dateDiscovered: string;
  lastEvaluatedDate: string;
  opportunity: LeadOpportunity;
  passedHardFilters: string[];
  failedHardFilters: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  unknownSignals: string[];
  collectionId?: string;
  rawData?: any;
}

export interface LeadFilterOptions {
  status?: LeadStatus | 'ALL';
  icpName?: string | 'ALL';
  targetService?: string | 'ALL';
  priority?: ICPPriority | 'ALL';
  search?: string;
  minScore?: number;
  maxScore?: number;
}

export type LeadSortField =
  | 'icpScore'
  | 'businessName'
  | 'dateDiscovered'
  | 'lastEvaluatedDate'
  | 'priority'
  | 'status';

export type SortOrder = 'asc' | 'desc';
