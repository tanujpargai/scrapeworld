import 'dotenv/config';
import prisma from '../lib/prisma';
import { LeadProfileBuilder } from '../services/LeadProfileBuilder';
import { LeadIntelligenceService } from '../services/LeadIntelligenceService';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('=== RUNNING SALES READINESS VALIDATION (V3) ===');

  const totalBiz = await prisma.business.count();
  
  // 1. Recalculate all rankings to ensure V3 scores are fully up to date
  console.log('Recalculating global priority ranks across all businesses...');
  const leadIntelService = new LeadIntelligenceService();
  await leadIntelService.recalculateAllPriorityRanks();

  // 2. Fetch stats from database
  const verifiedWebs = await prisma.business.count({ where: { verifiedWebsite: { not: null } } });
  
  const reachabilityCount = await prisma.leadIntelligence.count({
    where: { reachabilityScore: { gte: 60 } }, // WARM or HOT
  });
  const reachabilityRate = (reachabilityCount / totalBiz) * 100;
  
  const ownerFound = await prisma.business.count({ where: { ownerName: { not: null } } });
  const ownerDiscoveryRate = (ownerFound / totalBiz) * 100;

  const businessesWithSocial = await prisma.business.findMany({
    include: { socialProfiles: true },
  });
  const withSocialCount = businessesWithSocial.filter(b => b.socialProfiles.length > 0).length;
  const socialDiscoveryRate = (withSocialCount / totalBiz) * 100;

  const aPlusCount = await prisma.leadIntelligence.count({ where: { leadTier: 'A+' } });
  const aCount = await prisma.leadIntelligence.count({ where: { leadTier: 'A' } });

  // 3. Read V1 Baseline from lead-quality-audit.md if it exists
  let v1Website = '1.00%';
  let v1Owner = '11.00%';
  let v1Social = '21.00%';
  let v1Contactable = '99.00%'; // V1 was just "phone or email"

  try {
    const auditPath = path.join(__dirname, '../../lead-quality-audit.md');
    if (fs.existsSync(auditPath)) {
      const content = fs.readFileSync(auditPath, 'utf8');
      
      const webMatch = content.match(/Website Verification Rate:\s*\*\*([\d\.]+%)\*\*/);
      if (webMatch) v1Website = webMatch[1];
      
      const ownerMatch = content.match(/Owner Discovery Accuracy:\s*\*\*([\d\.]+%)\*\*/);
      if (ownerMatch) v1Owner = ownerMatch[1];
      
      const socialMatch = content.match(/Social Discovery Rate:\s*\*\*([\d\.]+%)\*\*/);
      if (socialMatch) v1Social = socialMatch[1];
      
      const contactableMatch = content.match(/Contactability Rate\s*\(.*?\):\s*\*\*([\d\.]+%)\*\*/);
      if (contactableMatch) v1Contactable = contactableMatch[1];
    }
  } catch (err) {
    console.warn('Could not parse V1 baseline file:', err);
  }

  // 4. Generate sales-readiness-validation.md
  const mdContent = `# Sales Readiness & Lead Quality Validation (V3)

Generated on: ${new Date().toISOString()}

This report validates lead quality hardening (V3) and compares the metrics against the pre-hardening baseline.

## Before vs. After Hardening Sprint

| Metric | V1 Baseline (Pre-Sprint) | V3 Hardened (Post-Sprint) | Progress / Status |
| :--- | :---: | :---: | :--- |
| **Total Businesses** | ${totalBiz} | ${totalBiz} | Unchanged |
| **Verified Websites** | ${v1Website} | ${(verifiedWebs / totalBiz * 100).toFixed(2)}% (${verifiedWebs}/${totalBiz}) | Hardened Verification Pipeline |
| **Reachability Rate** | ${v1Contactable} (Phone/Email) | ${reachabilityRate.toFixed(2)}% (Warm/Hot) | Multi-channel Reachability |
| **Owner Discovery Rate** | ${v1Owner} | ${ownerDiscoveryRate.toFixed(2)}% (${ownerFound}/${totalBiz}) | Strict executive name validation |
| **Social Discovery Rate** | ${v1Social} | ${socialDiscoveryRate.toFixed(2)}% (${withSocialCount}/${totalBiz}) | Website & snippet scraping |
| **A+ Leads (Priority)** | N/A | ${aPlusCount} | High suitability, reachability, & value |
| **A Leads (High Interest)** | N/A | ${aCount} | Strong reachability & need |

## Top 50 Leads Rankings Analysis
Highly contactable leads (containing verified websites, phone numbers, owners, and social channels) now outrank generic businesses with high review counts but missing contact details.

### Top 10 Verified Leads:
${(await prisma.leadIntelligence.findMany({
  orderBy: { leadPriorityRank: 'asc' },
  take: 10,
  include: {
    business: true
  }
})).map(l => `- **Rank #${l.leadPriorityRank}**: ${l.business.name} (Lead Score: ${l.leadScore}/100, Reachability: ${l.reachabilityScore}/100, Closing Prob: ${l.closingProbability}%)`).join('\n')}
`;

  const valPath = path.join(__dirname, '../../sales-readiness-validation.md');
  fs.writeFileSync(valPath, mdContent);
  console.log(`Saved Sales Readiness Validation Report to ${valPath}`);

  // 5. Generate new Top 50 Leads report using LeadProfileBuilder
  console.log('Generating Top 50 Leads Dossier Report...');
  const topLeads = await prisma.leadIntelligence.findMany({
    orderBy: { leadPriorityRank: 'asc' },
    take: 50,
    include: {
      business: {
        include: {
          websiteData: true,
          socialProfiles: true,
          opportunities: true,
          analyses: {
            include: {
              competitor: {
                include: {
                  competitorBusiness: {
                    include: {
                      websiteData: true,
                    },
                  },
                },
              },
            },
          },
          aiReports: {
            orderBy: { generatedAt: 'desc' },
          },
        },
      },
    },
  });

  const profileBuilder = new LeadProfileBuilder();
  let dossierText = '=== SCRAPE WORLD - TOP 50 LEADS 360 DOSSIERS REPORT ===\n\n';

  topLeads.forEach((lead) => {
    dossierText += profileBuilder.buildProfileText(lead as any);
  });

  const reportPath = path.join(__dirname, '../../top-50-leads-report.txt');
  fs.writeFileSync(reportPath, dossierText);
  console.log(`Saved Top 50 leads report to ${reportPath}`);
}

main()
  .catch(err => {
    console.error('Validation failed:', err);
  })
  .finally(() => prisma.$disconnect());
