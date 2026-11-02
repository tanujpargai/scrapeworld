import 'dotenv/config';
import prisma from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('=== RUNNING LEAD QUALITY AUDIT (TOP 100) ===');

  const topLeads = await prisma.leadIntelligence.findMany({
    orderBy: { leadPriorityRank: 'asc' },
    take: 100,
    include: {
      business: {
        include: {
          websiteData: true,
          socialProfiles: true,
          opportunities: true,
          analyses: true,
        },
      },
    },
  });

  const total = topLeads.length;
  if (total === 0) {
    console.warn('No leads found to audit.');
    return;
  }

  let hasPhoneCount = 0;
  let hasEmailCount = 0;
  let hasWebsiteCount = 0;
  let verifiedWebsiteCount = 0;
  let hasOwnerCount = 0;
  let hasSocialsCount = 0;
  let hasCompetitorCount = 0;
  let hasOpportunitiesCount = 0;
  
  let totalCompletenessPoints = 0;

  topLeads.forEach((lead) => {
    const b = lead.business;

    const hasPhone = !!b.phone;
    const hasEmail = !!b.email;
    const hasWebsite = !!b.website;
    const verifiedWebsite = !!b.verifiedWebsite;
    const hasOwner = !!b.ownerName;
    const hasSocials = b.socialProfiles.length > 0;
    const hasCompetitor = b.analyses.length > 0;
    const hasOpportunities = b.opportunities.length > 0;

    if (hasPhone) hasPhoneCount++;
    if (hasEmail) hasEmailCount++;
    if (hasWebsite) hasWebsiteCount++;
    if (verifiedWebsite) verifiedWebsiteCount++;
    if (hasOwner) hasOwnerCount++;
    if (hasSocials) hasSocialsCount++;
    if (hasCompetitor) hasCompetitorCount++;
    if (hasOpportunities) hasOpportunitiesCount++;

    // Calculate completeness points (out of 8 metrics)
    let completeness = 0;
    if (hasPhone) completeness++;
    if (hasEmail) completeness++;
    if (hasWebsite) completeness++;
    if (verifiedWebsite) completeness++;
    if (hasOwner) completeness++;
    if (hasSocials) completeness++;
    if (hasCompetitor) completeness++;
    if (hasOpportunities) completeness++;

    totalCompletenessPoints += completeness;
  });

  const contactabilityRate = (topLeads.filter(l => l.business.phone || l.business.email).length / total) * 100;
  const websiteVerificationRate = (verifiedWebsiteCount / total) * 100;
  const ownerDiscoveryRate = (hasOwnerCount / total) * 100;
  const socialDiscoveryRate = (hasSocialsCount / total) * 100;
  const avgCompleteness = (totalCompletenessPoints / (total * 8)) * 100;

  const mdContent = `# Lead Quality Audit Report (V1 Baseline)

Generated on: ${new Date().toISOString()}

This report measures the quality and contactability metrics for the current Top 100 leads in the database.

## Quality Metrics

| Metric | Count | Percentage |
| :--- | :---: | :---: |
| **Total Leads Audited** | ${total} | 100.00% |
| **Has Phone Number** | ${hasPhoneCount} | ${(hasPhoneCount / total * 100).toFixed(2)}% |
| **Has Email Address** | ${hasEmailCount} | ${(hasEmailCount / total * 100).toFixed(2)}% |
| **Has Website (Raw)** | ${hasWebsiteCount} | ${(hasWebsiteCount / total * 100).toFixed(2)}% |
| **Website Verified** | ${verifiedWebsiteCount} | ${websiteVerificationRate.toFixed(2)}% |
| **Has Owner Identified** | ${hasOwnerCount} | ${ownerDiscoveryRate.toFixed(2)}% |
| **Has Social Profiles** | ${hasSocialsCount} | ${socialDiscoveryRate.toFixed(2)}% |
| **Has Competitor Analysis** | ${hasCompetitorCount} | ${(hasCompetitorCount / total * 100).toFixed(2)}% |
| **Has Opportunities** | ${hasOpportunitiesCount} | ${(hasOpportunitiesCount / total * 100).toFixed(2)}% |

## Summary Rates

- **Contactability Rate** (Has Phone OR Email): **${contactabilityRate.toFixed(2)}%**
- **Website Verification Rate**: **${websiteVerificationRate.toFixed(2)}%**
- **Owner Discovery Accuracy**: **${ownerDiscoveryRate.toFixed(2)}%**
- **Social Discovery Rate**: **${socialDiscoveryRate.toFixed(2)}%**
- **Data Completeness Score** (Overall Average): **${avgCompleteness.toFixed(2)}%**
`;

  const outPath = path.join(__dirname, '../../lead-quality-audit.md');
  fs.writeFileSync(outPath, mdContent);
  console.log(`Saved Lead Quality Audit Report to ${outPath}`);
}

main()
  .catch(err => {
    console.error('Audit failed:', err);
  })
  .finally(() => prisma.$disconnect());
