/**
 * ExplanationService
 * 
 * Generates deterministic, transparent, and actionable sales explanations
 * for ICP qualification results without using AI hallucinations.
 * 
 * Every explanation item contains:
 * - ICP Match Score (0–100)
 * - Priority (HIGH / MEDIUM / LOW)
 * - Positive signals with exact points (+points ruleName)
 * - Negative signals with exact deductions (-points ruleName)
 * - Passed hard filters with checkmark (✓ ruleName)
 * - Failed hard filters with crossmark (✗ ruleName)
 * - Unknown signals explicitly identified as "Unknown" without guessing
 */

import type {
  ICPEvaluation,
  ICPLeadResult,
  ICPPriority,
  ICPProfile,
  RuleEvaluation,
  ScoreContribution,
} from '@/types/icp';

export interface FormattedSignalItem {
  points: number;
  ruleName: string;
  text: string;
  field?: string;
  actualValue?: any;
}

export interface FormattedFilterItem {
  name: string;
  passed: boolean;
  text: string;
  field?: string;
  operator?: string;
  expectedValue?: any;
  actualValue?: any;
}

export interface FormattedUnknownItem {
  field: string;
  label: string;
  text: string;
  reason: string;
  source?: string;
}

export interface FormattedICPExplanation {
  businessName: string;
  icpName: string;
  score: number;
  priority: ICPPriority;
  matched: boolean;
  positiveSignals: FormattedSignalItem[];
  negativeSignals: FormattedSignalItem[];
  hardFilters: FormattedFilterItem[];
  unknownSignals: FormattedUnknownItem[];
  passedHardFilterStrings: string[];
  failedHardFilterStrings: string[];
  positiveSignalStrings: string[];
  negativeSignalStrings: string[];
  unknownSignalStrings: string[];
  summaryText: string;
}

export class ExplanationService {
  /**
   * Helper to format readable field names.
   */
  static getFieldLabel(field: string): string {
    const map: Record<string, string> = {
      reviewCount: 'Google Review Count',
      rating: 'Google Star Rating',
      reviewActivityTier: 'Review Activity Tier',
      hasGoogleMapsPresence: 'Google Maps Presence',
      website: 'Website URL',
      hasWebsite: 'Website Presence',
      isHttps: 'HTTPS / SSL Security',
      hasSsl: 'SSL Certificate',
      cms: 'Detected CMS',
      detectedTechnologies: 'Detected Technologies',
      hasWhatsApp: 'WhatsApp Integration',
      hasCta: 'Call-to-Action (CTA)',
      hasContactForm: 'Contact Form',
      mobileResponsive: 'Mobile Responsiveness',
      hasAnalytics: 'Web Analytics (GA / GTM)',
      hasMetaPixel: 'Meta Advertising Pixel',
      hasBrokenLinks: 'Broken Link Integrity',
      lastUpdatedYear: 'Website Copyright Year',
      websiteAgeYears: 'Estimated Website Age',
      websiteQuality: 'Website Quality Score',
      phone: 'Direct Phone Contact',
      hasPhone: 'Phone Availability',
      email: 'Email Contact',
      hasEmail: 'Email Availability',
      ownerName: 'Owner / Decision Maker',
      hasOwner: 'Decision Maker Identified',
      businessStatus: 'Business Status',
      hasMultipleLocations: 'Multiple Locations',
      growthIndicator: 'Growth Velocity Indicator',
      businessAge: 'Business Age',
      foundedYear: 'Founded Year',
      employeeCount: 'Employee Count',
      name: 'Business Name',
      industry: 'Industry / Category',
      city: 'City / Location',
      address: 'Street Address',
    };

    if (map[field]) return map[field];
    if (field.startsWith('websiteData.')) {
      const sub = field.replace('websiteData.', '');
      return map[sub] || sub;
    }
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  }

  /**
   * Generates a deterministic, explainable sales justification for an ICP evaluation.
   */
  static generateExplanation(
    evaluation: ICPEvaluation | ICPLeadResult,
    business?: any,
    icp?: ICPProfile | null
  ): FormattedICPExplanation {
    const evalLead = evaluation as any;
    const businessName =
      evalLead.businessName ||
      business?.name ||
      evalLead.business?.name ||
      'Business';
    const icpName = evaluation.icpName || icp?.name || 'Standard ICP';
    const score = evaluation.score ?? 0;
    const priority = evaluation.priority || 'LOW';
    const matched = evaluation.matched;

    // 1. Process Positive & Negative Signals Deterministically
    const positiveSignals: FormattedSignalItem[] = [];
    const negativeSignals: FormattedSignalItem[] = [];

    // Extract from score contributions if available
    const contributions = evaluation.scoreContributions || [];
    if (contributions.length > 0) {
      for (const contrib of contributions) {
        if (contrib.pointsAwarded > 0) {
          positiveSignals.push({
            points: contrib.pointsAwarded,
            ruleName: contrib.ruleName,
            text: `+${contrib.pointsAwarded} ${contrib.ruleName}`,
          });
        } else if (contrib.pointsAwarded < 0) {
          negativeSignals.push({
            points: contrib.pointsAwarded,
            ruleName: contrib.ruleName,
            text: `-${Math.abs(contrib.pointsAwarded)} ${contrib.ruleName}`,
          });
        }
      }
    } else if (evaluation.ruleEvaluations && evaluation.ruleEvaluations.length > 0) {
      // Extract from ruleEvaluations
      for (const re of evaluation.ruleEvaluations) {
        if (re.type === 'SOFT_SIGNAL' && re.conditionMet) {
          const pts = re.pointsAwarded || re.weight;
          if (pts > 0) {
            positiveSignals.push({
              points: pts,
              ruleName: re.ruleName,
              text: `+${pts} ${re.ruleName}`,
              field: re.field,
              actualValue: re.actualValue,
            });
          } else if (pts < 0) {
            negativeSignals.push({
              points: pts,
              ruleName: re.ruleName,
              text: `-${Math.abs(pts)} ${re.ruleName}`,
              field: re.field,
              actualValue: re.actualValue,
            });
          }
        }
      }
    } else {
      // Fallback: parse from positiveSignals / negativeSignals string arrays
      for (const sig of evaluation.positiveSignals || []) {
        let text = sig;
        let points = 10;
        const match = sig.match(/\+(\d+)/);
        if (match) {
          points = parseInt(match[1], 10);
        } else {
          text = `+${points} ${sig}`;
        }
        positiveSignals.push({
          points,
          ruleName: sig.replace(/^\+\d+\s*/, ''),
          text,
        });
      }

      for (const sig of evaluation.negativeSignals || []) {
        let text = sig;
        let points = -10;
        const match = sig.match(/-(\d+)/);
        if (match) {
          points = -parseInt(match[1], 10);
        } else {
          text = `-${Math.abs(points)} ${sig}`;
        }
        negativeSignals.push({
          points,
          ruleName: sig.replace(/^-\d+\s*/, ''),
          text,
        });
      }
    }

    // 2. Process Hard Filters Deterministically
    const hardFilters: FormattedFilterItem[] = [];

    // Process from ruleEvaluations if present
    if (evaluation.ruleEvaluations && evaluation.ruleEvaluations.length > 0) {
      for (const re of evaluation.ruleEvaluations) {
        if (re.type === 'HARD_FILTER') {
          hardFilters.push({
            name: re.ruleName,
            passed: re.passed,
            text: re.passed ? `✓ ${re.ruleName}` : `✗ ${re.ruleName}`,
            field: re.field,
            operator: re.operator,
            expectedValue: re.expectedValue,
            actualValue: re.actualValue,
          });
        }
      }
    } else {
      // Fallback from passedHardFilters and failedHardFilters string arrays
      for (const pass of evaluation.passedHardFilters || []) {
        const text = pass.startsWith('✓') ? pass : `✓ ${pass}`;
        hardFilters.push({
          name: pass.replace(/^✓\s*/, ''),
          passed: true,
          text,
        });
      }
      for (const fail of evaluation.failedHardFilters || []) {
        const text = fail.startsWith('✗') ? fail : `✗ ${fail}`;
        hardFilters.push({
          name: fail.replace(/^✗\s*/, ''),
          passed: false,
          text,
        });
      }
    }

    // 3. Process Unknown Signals Deterministically
    // If a signal is unknown, clearly state "Unknown" rather than scoring it as positive or negative
    const unknownSignals: FormattedUnknownItem[] = [];
    const targetBusiness = business || (evaluation as any).business;
    const provenance = targetBusiness?.provenance || {};

    // Check rules evaluated against missing or unknown fields
    if (evaluation.ruleEvaluations && evaluation.ruleEvaluations.length > 0) {
      for (const re of evaluation.ruleEvaluations) {
        const fieldProv = provenance[re.field];
        const isUnknownInProv = fieldProv?.status === 'UNKNOWN';
        const isNullOrUndefined = re.actualValue === null || re.actualValue === undefined;
        const isNotExistenceCheck = re.operator !== 'exists' && re.operator !== 'does_not_exist';

        if ((isUnknownInProv || isNullOrUndefined) && isNotExistenceCheck && !re.conditionMet) {
          const fieldLabel = this.getFieldLabel(re.field);
          if (!unknownSignals.some((u) => u.field === re.field)) {
            unknownSignals.push({
              field: re.field,
              label: fieldLabel,
              text: `${fieldLabel}: Unknown`,
              reason: fieldProv?.notes || `Field '${re.field}' is unverified or unavailable in public listing`,
              source: fieldProv?.source || 'UNAVAILABLE',
            });
          }
        }
      }
    }

    // Check important SMB data points that are explicitly UNKNOWN (e.g. employee count, unverified founded year)
    const criticalFieldsToCheck = ['employeeCount', 'foundedYear'];
    for (const cf of criticalFieldsToCheck) {
      if (provenance[cf]?.status === 'UNKNOWN' && !unknownSignals.some((u) => u.field === cf)) {
        const label = this.getFieldLabel(cf);
        unknownSignals.push({
          field: cf,
          label,
          text: `${label}: Unknown`,
          reason: provenance[cf]?.notes || 'Not publicly accessible without external enrichment API',
          source: provenance[cf]?.source || 'UNAVAILABLE',
        });
      }
    }

    // 4. Construct Strings Representation for Display and APIs
    const passedHardFilterStrings = hardFilters.filter((h) => h.passed).map((h) => h.text);
    const failedHardFilterStrings = hardFilters.filter((h) => !h.passed).map((h) => h.text);
    const positiveSignalStrings = positiveSignals.map((s) => s.text);
    const negativeSignalStrings = negativeSignals.map((s) => s.text);
    const unknownSignalStrings = unknownSignals.map((u) => u.text);

    // 5. Construct Deterministic Summary
    let summaryText = '';
    if (matched) {
      summaryText = `${businessName} qualified with an ICP Match Score of ${score}/100 (${priority} Priority). It satisfied all ${passedHardFilterStrings.length} mandatory hard filter(s) and triggered ${positiveSignals.length} high-opportunity scoring signal(s).`;
    } else {
      summaryText = `${businessName} was disqualified from ${icpName}. It failed ${failedHardFilterStrings.length} mandatory condition(s) and scored ${score}/100 (${priority} Priority).`;
    }

    return {
      businessName,
      icpName,
      score,
      priority,
      matched,
      positiveSignals,
      negativeSignals,
      hardFilters,
      unknownSignals,
      passedHardFilterStrings,
      failedHardFilterStrings,
      positiveSignalStrings,
      negativeSignalStrings,
      unknownSignalStrings,
      summaryText,
    };
  }
}

export const explanationService = ExplanationService;
