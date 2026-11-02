import 'dotenv/config';
import prisma from '../lib/prisma';
import { websiteVerificationQueue, ownerDiscoveryQueue, socialDiscoveryQueue } from '../queues/verification.queue';
import { LeadIntelligenceService } from '../services/LeadIntelligenceService';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('=== RUNNING DATA QUALITY & SALES READINESS PIPELINE ===');

  const businesses = await prisma.business.findMany({
    select: { id: true, name: true },
  });

  console.log(`Queueing verification jobs for ${businesses.length} businesses...`);

  // Clear queues before adding to avoid duplication or legacy jobs
  await websiteVerificationQueue.drain();
  await ownerDiscoveryQueue.drain();
  await socialDiscoveryQueue.drain();

  // Queue each business
  for (const biz of businesses) {
    await websiteVerificationQueue.add('verify-website', { businessId: biz.id });
  }

  console.log('All jobs queued. Monitoring background execution...');
  
  const startTime = Date.now();
  let completed = false;

  while (!completed) {
    // Check queue sizes every 8 seconds
    await new Promise(resolve => setTimeout(resolve, 8000));

    const wVerify = await websiteVerificationQueue.getWaitingCount() + await websiteVerificationQueue.getActiveCount();
    const wOwner = await ownerDiscoveryQueue.getWaitingCount() + await ownerDiscoveryQueue.getActiveCount();
    const wSocial = await socialDiscoveryQueue.getWaitingCount() + await socialDiscoveryQueue.getActiveCount();
    
    const totalPending = wVerify + wOwner + wSocial;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`[${elapsed}s] Verification Q: ${wVerify} | Owner Q: ${wOwner} | Social Q: ${wSocial} | Total Pending: ${totalPending}`);

    if (totalPending === 0) {
      completed = true;
      console.log('\nEnrichment queues finished processing successfully!');
      break;
    }

    // Safety timeout after 10 minutes
    if (elapsed > 600) {
      console.warn('Timeout reached. Exiting monitor loop.');
      break;
    }
  }

  console.log('\nRecalculating global priority ranks across all businesses...');
  const leadIntelService = new LeadIntelligenceService();
  await leadIntelService.recalculateAllPriorityRanks();

  // 1. Calculate accuracy statistics
  const totalBiz = businesses.length;
  const verifiedWebs = await prisma.business.count({ where: { verifiedWebsite: { not: null } } });
  
  const verifiedWebsWithConfidence = await prisma.business.findMany({
    where: { verifiedWebsite: { not: null } },
    select: { websiteConfidence: true },
  });
  const avgWebConfidence = verifiedWebsWithConfidence.length > 0 
    ? Math.round(verifiedWebsWithConfidence.reduce((acc, curr) => acc + (curr.websiteConfidence ?? 0), 0) / verifiedWebsWithConfidence.length)
    : 0;

  const ownerFound = await prisma.business.count({ where: { ownerName: { not: null } } });
  
  // Social profiles count
  const businessesWithSocial = await prisma.business.findMany({
    include: { socialProfiles: true },
  });
  const withSocialCount = businessesWithSocial.filter(b => b.socialProfiles.length > 0).length;

  const enterpriseCount = await prisma.business.count({ where: { enterpriseFlag: true } });
  const franchiseCount = await prisma.business.count({ where: { franchiseFlag: true } });

  const falseWebsiteRate = ((totalBiz - verifiedWebs) / totalBiz) * 100; // rate of businesses that had maps website but verification rejected/corrected them
  const ownerDiscoveryRate = (ownerFound / totalBiz) * 100;
  const socialDiscoveryRate = (withSocialCount / totalBiz) * 100;

  console.log('\n=== ENRICHMENT ACCURACY METRICS ===');
  console.log(`- Total Businesses:         ${totalBiz}`);
  console.log(`- Verified Websites Found:  ${verifiedWebs} (Avg Confidence: ${avgWebConfidence}%)`);
  console.log(`- Owner Discovery Rate:     ${ownerDiscoveryRate.toFixed(2)}% (${ownerFound}/${totalBiz})`);
  console.log(`- Social Discovery Rate:    ${socialDiscoveryRate.toFixed(2)}% (${withSocialCount}/${totalBiz})`);
  console.log(`- Enterprise Flags Raised:  ${enterpriseCount}`);
  console.log(`- Franchise Flags Raised:   ${franchiseCount}`);
  console.log('====================================\n');

  // 2. Generate Top 100 Leads report
  console.log('Generating Top 100 Leads report...');
  const topLeads = await prisma.leadIntelligence.findMany({
    orderBy: { leadPriorityRank: 'asc' },
    take: 100,
    include: {
      business: {
        include: {
          websiteData: true,
          opportunities: true,
          socialProfiles: true,
        },
      },
    },
  });

  const reportPath = path.join(__dirname, '../../top-100-leads-report.txt');
  let reportText = '=== SCRAPE WORLD - TOP 100 LEADS V2 REPORT ===\n\n';

  topLeads.forEach((lead) => {
    const biz = lead.business;
    const recommendedServices = biz.opportunities.map(o => o.serviceType).join(', ') || 'N/A';
    const socialPlatforms = biz.socialProfiles.map(p => p.platform).join(', ') || 'None';

    reportText += `Rank #${lead.leadPriorityRank} | Score: ${lead.leadScore} | Readiness: ${lead.salesReadinessScore}/100 | Name: ${biz.name}\n`;
    reportText += `  - Industry:      ${biz.industry} | City: ${biz.city}\n`;
    reportText += `  - Enterprise:    ${biz.enterpriseFlag} | Franchise: ${biz.franchiseFlag} | Suitability: ${biz.outreachSuitabilityScore}/100\n`;
    reportText += `  - Website Verified: ${biz.verifiedWebsite ?? 'None'} (Confidence: ${biz.websiteConfidence}%, Source: ${biz.websiteSource})\n`;
    reportText += `  - Owner:         ${biz.ownerName ?? 'None'} (Role: ${biz.ownerRole ?? 'None'}, Conf: ${biz.ownerConfidence}%)\n`;
    reportText += `  - Social Profiles: ${socialPlatforms}\n`;
    reportText += `  - Urgency:       ${lead.urgencyScore}/100 | Buyer Prob: ${lead.buyerProbability}% | Revenue Pot: $${lead.revenuePotential}\n`;
    reportText += `  - Rec. Services: ${recommendedServices}\n`;
    reportText += `  - Summary:       ${lead.leadSummary}\n`;
    reportText += `--------------------------------------------------------------------------------\n`;
  });

  fs.writeFileSync(reportPath, reportText);
  console.log(`Saved Top 100 Leads report to ${reportPath}`);
}

main()
  .catch(err => {
    console.error('Error running pipeline:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
