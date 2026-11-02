import 'dotenv/config';
import prisma from '../lib/prisma';
import { CompetitorService } from '../services/CompetitorService';

async function main() {
  console.log('=== COMPETITOR INTELLIGENCE PIPELINE TEST ===');

  // Find a business with website data to use as the target
  const targetBiz = await prisma.business.findFirst({
    where: {
      websiteData: {
        isNot: null,
      },
    },
    include: {
      websiteData: true,
    },
    orderBy: {
      websiteData: {
        overallScore: 'asc',
      },
    },
  });

  if (!targetBiz) {
    console.error('❌ Error: No business with website data found in the database. Please run audits first!');
    return;
  }

  console.log(`\nTarget Business: ID=${targetBiz.id}`);
  console.log(` - Name:     "${targetBiz.name}"`);
  console.log(` - Industry: "${targetBiz.industry}"`);
  console.log(` - Location: "${targetBiz.city}, ${targetBiz.state}"`);
  console.log(` - Coordinates: (${targetBiz.latitude}, ${targetBiz.longitude})`);
  console.log(` - Reviews:  ${targetBiz.reviewCount} count, ${targetBiz.rating} rating`);
  console.log(` - Web Score: ${targetBiz.websiteData?.overallScore}/100`);

  // Run the competitor pipeline
  const competitorService = new CompetitorService();
  const result = await competitorService.runCompetitorPipeline(targetBiz.id);

  console.log('\nPipeline result:', result);

  // Retrieve and verify data
  const competitors = await prisma.competitor.findMany({
    where: { businessId: targetBiz.id },
    include: {
      competitorBusiness: {
        include: {
          websiteData: true,
        },
      },
    },
  });

  console.log(`\nDiscovered Competitors (${competitors.length}):`);
  competitors.forEach((c, i) => {
    console.log(`${i + 1}. Name: "${c.competitorBusiness.name}"`);
    console.log(`   Relevance Score: ${c.relationshipScore}`);
    console.log(`   Location:        ${c.competitorBusiness.city}, ${c.competitorBusiness.state}`);
    console.log(`   Coordinates:     (${c.competitorBusiness.latitude}, ${c.competitorBusiness.longitude})`);
    console.log(`   Reviews:         ${c.competitorBusiness.reviewCount} count, ${c.competitorBusiness.rating} rating`);
    console.log(`   Website Score:   ${c.competitorBusiness.websiteData?.overallScore ?? 'N/A'}/100`);
  });

  const analyses = await prisma.competitorAnalysis.findMany({
    where: { businessId: targetBiz.id },
    include: {
      competitor: {
        include: {
          competitorBusiness: true,
        },
      },
    },
  });

  console.log(`\nCalculated Gap Analysis (${analyses.length}):`);
  analyses.forEach((a, i) => {
    console.log(`${i + 1}. Competitor: "${a.competitor.competitorBusiness.name}"`);
    console.log(`   Gaps: WebScore=${a.websiteScoreGap} | SEO=${a.seoGap} | Reviews=${a.reviewGap} | Social=${a.socialGap} | Brand=${a.brandGap}`);
    console.log(`   Summary: ${a.summary}`);
  });

  const opportunities = await prisma.opportunity.findMany({
    where: { businessId: targetBiz.id },
  });

  console.log(`\nGenerated Opportunities (${opportunities.length}):`);
  opportunities.forEach((o, i) => {
    console.log(`${i + 1}. [${o.priority}] Title: "${o.title}"`);
    console.log(`   Service: ${o.serviceType} | Score: ${o.opportunityScore} | Value: $${o.estimatedValue}`);
    console.log(`   Description: ${o.description}`);
  });

  console.log('\n=============================================');
}

main()
  .catch(err => {
    console.error('Error in pipeline test:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
