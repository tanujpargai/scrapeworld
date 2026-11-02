/**
 * ExistingFilterEvaluator
 * 
 * Encapsulates the existing keyword filtering and qualification rules
 * (Enterprise Brand Detection, Franchise Detection, Competitor Exclusion)
 * to maintain 100% backwards compatibility within the new pipeline.
 */

export interface ExistingFilterOutcome {
  enterpriseFlag: boolean;
  franchiseFlag: boolean;
  competitorIndustryFlag: boolean;
  outreachSuitabilityScore: number;
  flags: string[];
  isEnterprise: boolean;
  isFranchise: boolean;
  isEnterpriseOrFranchise: boolean;
  isCompetitorIndustry: boolean;
}

export class ExistingFilterEvaluator {
  private static ENTERPRISE_KEYWORDS = [
    'hospital', 'apollo', 'max healthcare', 'fortis', 'medanta', 'ganga ram', 'narayana', 'sir gangaram',
    'taj hotel', 'hyatt', 'radisson', 'jw marriott', 'sheraton', 'hilton', 'novotel', 'ibis', 'leela', 'oberoi', 'itc hotel',
    'kfc', 'mcdonald', 'pizza hut', 'domino', 'starbucks', 'subway', 'burger king',
    'reliance', 'tata', 'birla', 'wipro', 'infosys', 'hdfc', 'icici', 'sbi', 'axis bank', 'mahindra'
  ];

  private static FRANCHISE_KEYWORDS = [
    'franchise', 'looks salon', 'geetanjali', 'vlcc', 'jawed habib', 'tony & guy', 'naturals salon',
    'gold\'s gym', 'anytime fitness', 'cult.fit', 'cult fit', 'talwalkars'
  ];

  private static COMPETITOR_INDUSTRIES = [
    'seo agency', 'seo agencies', 'digital marketing agency', 'digital marketing agencies',
    'web design agency', 'web design agencies', 'software company', 'software companies',
    'it services', 'lead generation agency', 'lead generation agencies',
    'branding agency', 'branding agencies', 'performance marketing agency', 'performance marketing agencies'
  ];

  /**
   * Evaluates existing keyword and business filters.
   */
  static evaluate(business: {
    name?: string;
    industry?: string;
    reviewCount?: number;
    categories?: string[];
  }): ExistingFilterOutcome {
    const nameLower = (business.name || '').toLowerCase();
    const reviews = business.reviewCount ?? 0;
    const industryLower = (business.industry || '').toLowerCase();
    const categoriesLower = Array.isArray(business.categories)
      ? business.categories.map((c) => c.toLowerCase()).join(' ')
      : '';

    const flags: string[] = [];

    // 1. Enterprise Brand Detection
    const isEnterprise = this.ENTERPRISE_KEYWORDS.some((kw) => nameLower.includes(kw));
    if (isEnterprise) {
      flags.push('ENTERPRISE_BRAND');
    }

    // 2. Franchise / Large Scale Branch Detection
    const isFranchise =
      this.FRANCHISE_KEYWORDS.some((kw) => nameLower.includes(kw)) || reviews > 3000;
    if (isFranchise) {
      flags.push('FRANCHISE_CHAIN');
    }

    // 3. Competitor Industry Detection
    const isCompetitor = this.COMPETITOR_INDUSTRIES.some(
      (kw) => industryLower.includes(kw) || categoriesLower.includes(kw)
    );
    if (isCompetitor) {
      flags.push('COMPETITOR_INDUSTRY');
    }

    // 4. Calculate Outreach Suitability Score
    let suitabilityScore = 100;
    if (isEnterprise) suitabilityScore -= 70;
    if (isFranchise) suitabilityScore -= 50;
    if (isCompetitor) suitabilityScore -= 60;
    if (suitabilityScore < 0) suitabilityScore = 0;

    return {
      enterpriseFlag: isEnterprise,
      franchiseFlag: isFranchise,
      competitorIndustryFlag: isCompetitor,
      outreachSuitabilityScore: suitabilityScore,
      flags,
      isEnterprise,
      isFranchise,
      isEnterpriseOrFranchise: isEnterprise || isFranchise,
      isCompetitorIndustry: isCompetitor,
    };
  }
}

export const existingFilterEvaluator = ExistingFilterEvaluator;
