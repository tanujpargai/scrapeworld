import prisma from '@/lib/prisma';

export class LeadValidationService {
  /**
   * Validate a lead for outreach suitability and false positive flags.
   */
  async validateLead(businessId: string): Promise<{
    enterpriseFlag: boolean;
    franchiseFlag: boolean;
    outreachSuitabilityScore: number;
  }> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { websiteData: true },
    });

    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    const name = business.name.toLowerCase();
    const reviews = business.reviewCount ?? 0;
    const websiteScore = business.websiteData?.overallScore ?? 0;

    let enterpriseFlag = false;
    let franchiseFlag = false;

    // 1. Enterprise Brand Detection Keywords
    const enterpriseKeywords = [
      'hospital', 'apollo', 'max healthcare', 'fortis', 'medanta', 'ganga ram', 'narayana', 'sir gangaram',
      'taj hotel', 'hyatt', 'radisson', 'jw marriott', 'sheraton', 'hilton', 'novotel', 'ibis', 'leela', 'oberoi', 'itc hotel',
      'kfc', 'mcdonald', 'pizza hut', 'domino', 'starbucks', 'subway', 'burger king',
      'reliance', 'tata', 'birla', 'wipro', 'infosys', 'hdfc', 'icici', 'sbi', 'axis bank', 'mahindra'
    ];

    if (enterpriseKeywords.some(keyword => name.includes(keyword))) {
      enterpriseFlag = true;
    }

    // 2. Franchise / Large Scale Branch Detection
    // E.g., if it has > 3000 reviews or includes keywords indicating a branch of a massive chain
    const franchiseKeywords = [
      'looks salon', 'geetanjali', 'vlcc', 'jawed habib', 'tony & guy', 'naturals salon',
      'gold\'s gym', 'anytime fitness', 'cult.fit', 'cult fit', 'talwalkars'
    ];

    if (franchiseKeywords.some(keyword => name.includes(keyword)) || reviews > 3000) {
      franchiseFlag = true;
    }

    // 3. Compute Outreach Suitability Score (0-100)
    let suitabilityScore = 100;

    if (enterpriseFlag) {
      suitabilityScore -= 70;
    }

    if (franchiseFlag) {
      suitabilityScore -= 50;
    }

    // If website is already running at peak optimization (> 85 overall score)
    if (websiteScore > 85) {
      suitabilityScore -= 30;
    }

    // If there is no contact email and no phone number, it's hard to pitch
    if (!business.email && !business.phone) {
      suitabilityScore -= 30;
    }

    // Cap score at [0, 100]
    suitabilityScore = Math.max(0, Math.min(100, suitabilityScore));

    console.log(`[Validation] Lead "${business.name}" | Enterprise: ${enterpriseFlag} | Franchise: ${franchiseFlag} | Suitability: ${suitabilityScore}`);

    // Save to Database
    await prisma.business.update({
      where: { id: businessId },
      data: {
        enterpriseFlag,
        franchiseFlag,
        outreachSuitabilityScore: suitabilityScore,
      },
    });

    return {
      enterpriseFlag,
      franchiseFlag,
      outreachSuitabilityScore: suitabilityScore,
    };
  }
}
