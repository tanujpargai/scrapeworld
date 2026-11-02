import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  const topLeads = await prisma.leadIntelligence.findMany({
    orderBy: { leadPriorityRank: 'asc' },
    take: 20,
    include: {
      business: {
        include: {
          socialProfiles: true,
        }
      }
    }
  });

  console.log('=== TOP 10 LEAD INTELLIGENCE RECORDS ===');
  for (const l of topLeads) {
    console.log(`Rank: ${l.leadPriorityRank} | Name: ${l.business.name}`);
    console.log(`  - Lead Score: ${l.leadScore} | Lead Tier: ${l.leadTier}`);
    console.log(`  - Reachability: ${l.reachabilityScore} | Contact Tier: ${l.contactabilityTier}`);
    console.log(`  - Closing Prob: ${l.closingProbability}% | Buyer Prob: ${l.buyerProbability}%`);
    console.log(`  - Verified Website: ${l.business.verifiedWebsite} (Confidence: ${l.business.websiteConfidence}%)`);
    console.log(`  - Phone: ${l.business.phone} | Email: ${l.business.email} | Owner: ${l.business.ownerName}`);
    console.log(`  - Social Profiles: ${l.business.socialProfiles.map(p => p.platform).join(', ')}`);
    console.log('----------------------------------------------------');
  }
}

main().finally(() => prisma.$disconnect());
