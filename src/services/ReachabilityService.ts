import prisma from '@/lib/prisma';
import { SocialPlatform } from '@prisma/client';

export class ReachabilityService {
  /**
   * Calculate reachability score and tier for a business.
   */
  async calculateReachability(businessId: string): Promise<{
    score: number;
    tier: 'HOT' | 'WARM' | 'COLD' | 'UNREACHABLE';
  }> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { socialProfiles: true },
    });

    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    let score = 0;

    // 1. Phone Found (+25)
    if (business.phone) {
      score += 25;
    }

    // 2. Email Found (+25)
    if (business.email) {
      score += 25;
    }

    // 3. Verified Website (+20 if confidence >= 80%)
    if (business.verifiedWebsite && (business.websiteConfidence ?? 0) >= 80) {
      score += 20;
    }

    // 4. Social profiles: Instagram (+10), Facebook (+5), LinkedIn (+10)
    const hasInsta = business.socialProfiles.some(p => p.platform === SocialPlatform.INSTAGRAM);
    const hasFb = business.socialProfiles.some(p => p.platform === SocialPlatform.FACEBOOK);
    const hasLinkedIn = business.socialProfiles.some(p => p.platform === SocialPlatform.LINKEDIN);

    if (hasInsta) score += 10;
    if (hasFb) score += 5;
    if (hasLinkedIn) score += 10;

    // 5. Owner Identified (+15 if confidence >= 75%)
    if (business.ownerName && (business.ownerConfidence ?? 0) >= 75) {
      score += 15;
    }

    // Cap at 100
    score = Math.min(100, score);

    // Determine contactability tier
    let tier: 'HOT' | 'WARM' | 'COLD' | 'UNREACHABLE' = 'UNREACHABLE';
    if (score >= 80) {
      tier = 'HOT';
    } else if (score >= 60) {
      tier = 'WARM';
    } else if (score >= 40) {
      tier = 'COLD';
    }

    return { score, tier };
  }
}
