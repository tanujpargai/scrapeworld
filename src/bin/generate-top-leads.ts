import 'dotenv/config';
import prisma from '../lib/prisma';
import { LeadIntelligenceService } from '../services/LeadIntelligenceService';

async function main() {
  console.log('=== SCRAPE WORLD - TOP 20 LEADS REPORT ===\n');

  console.log('Recalculating ranks across the database to ensure correctness...');
  const leadIntelService = new LeadIntelligenceService();
  await leadIntelService.recalculateAllPriorityRanks();

  console.log('Fetching Top 20 Leads to Contact...\n');
  const topLeads = await prisma.leadIntelligence.findMany({
    orderBy: { leadPriorityRank: 'asc' },
    take: 20,
    include: {
      business: {
        include: {
          websiteData: true,
          opportunities: true,
          aiReports: {
            where: { reportType: 'FULL_ANALYSIS' },
            orderBy: { generatedAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (topLeads.length === 0) {
    console.warn('⚠️ No leads found with intelligence data. Please run: npx tsx src/bin/discover-validation-industries.ts first!');
    return;
  }

  topLeads.forEach((lead, index) => {
    const biz = lead.business;
    const recommendedServices = biz.opportunities.map(o => o.serviceType).join(', ') || 'N/A';
    
    // Extract Sales Angles from full analysis report or use a dynamic fallback
    let salesAnglesText = 'N/A';
    const aiReport = biz.aiReports[0];
    if (aiReport && aiReport.salesAngles) {
      const angles = aiReport.salesAngles as any[];
      salesAnglesText = angles.map(a => `[${a.channel}] Hook: "${a.hook}"`).join(' | ');
    } else {
      // Dynamic fallback based on opportunity priorities
      const highOpps = biz.opportunities.filter(o => o.priority === 'HIGH' || o.priority === 'URGENT');
      if (highOpps.length > 0) {
        salesAnglesText = `Pitching ${highOpps[0].title} opportunity because of high urgency.`;
      } else {
        salesAnglesText = `Pitching digital modernization services.`;
      }
    }

    console.log(`--------------------------------------------------------------------------------`);
    console.log(`#${lead.leadPriorityRank} - ${biz.name.toUpperCase()}`);
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`- Lead Score:         ${lead.leadScore}/100`);
    console.log(`- Lead Tier:          ${lead.leadTier}`);
    console.log(`- Urgency Score:      ${lead.urgencyScore}/100`);
    console.log(`- Buyer Probability:  ${lead.buyerProbability}%`);
    console.log(`- Revenue Potential:  $${(lead.revenuePotential || 0).toLocaleString()}`);
    console.log(`- Estimated Deal Val: $${(lead.estimatedDealValue || 0).toLocaleString()}`);
    console.log(`- Rec. Services:      ${recommendedServices}`);
    
    // Generate a Reason to Buy if empty
    let reasonToBuy = lead.leadSummary || '';
    if (lead.leadScore >= 75) {
      const sslStatus = biz.websiteData ? (biz.websiteData.sslEnabled ? 'SSL active' : 'SSL MISSING') : 'No website';
      const webScore = biz.websiteData ? `${biz.websiteData.overallScore}/100` : 'N/A';
      reasonToBuy = `Needs digital optimization: Website is ${sslStatus} with quality score of ${webScore}. Competitors have market advantage, and high reviews (${biz.reviewCount ?? 0}) indicate strong capacity to invest.`;
    } else {
      reasonToBuy = `Moderate sales opportunity. Current digital presence is stable but minor optimizations exist.`;
    }
    console.log(`- Reason to Buy:      ${reasonToBuy}`);
    console.log(`- Sales Angles:       ${salesAnglesText}`);
    console.log(`\n`);
  });

  console.log('================================================================================');
  console.log(`Generated Top ${topLeads.length} Leads Report Successfully.`);
  console.log('================================================================================\n');
}

main()
  .catch(err => {
    console.error('Error printing Top Leads report:', err);
  })
  .finally(() => prisma.$disconnect());
