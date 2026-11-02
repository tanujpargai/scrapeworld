import 'dotenv/config';
import prisma from '../lib/prisma';
import { CompetitorService } from '../services/CompetitorService';
import { LeadIntelligenceService } from '../services/LeadIntelligenceService';

async function main() {
  console.log('=== RUNNING SCORING-ONLY PIPELINE ===');
  
  const allBusinesses = await prisma.business.findMany({
    select: { id: true, name: true, industry: true }
  });

  console.log(`Processing competitor gaps and lead intelligence for ${allBusinesses.length} businesses...`);
  
  const competitorService = new CompetitorService();
  const leadIntelService = new LeadIntelligenceService();
  
  const startTime = Date.now();
  let compCreated = 0;
  let count = 0;

  const concurrencyLimit = 15;
  const chunks: any[][] = [];
  for (let i = 0; i < allBusinesses.length; i += concurrencyLimit) {
    chunks.push(allBusinesses.slice(i, i + concurrencyLimit));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (biz) => {
      try {
        const compResult = await competitorService.runCompetitorPipeline(biz.id);
        compCreated += compResult.competitorsDiscovered;
      } catch (e: any) {
        console.error(`Failed scoring for "${biz.name}" (${biz.id}):`, e.message);
      }
    }));
    
    count += chunk.length;
    if (count % 60 === 0 || count >= allBusinesses.length) {
      const elapsedSec = Math.round((Date.now() - startTime) / 1000);
      console.log(`  - Scored ${count}/${allBusinesses.length} businesses (Time: ${elapsedSec}s)...`);
    }
  }

  const scoringTime = Date.now();
  const scoringElapsed = Math.round((scoringTime - startTime) / 1000);
  console.log(`\nAll businesses scored! Total scoring duration: ${scoringElapsed} seconds.`);

  console.log('Recalculating global priority ranks...');
  await leadIntelService.recalculateAllPriorityRanks();
  
  const rankingElapsed = Math.round((Date.now() - scoringTime) / 1000);
  console.log(`Priority ranks recalculated in ${rankingElapsed} seconds!`);

  // Final stats
  const finalBizCount = await prisma.business.count();
  const finalWebCount = await prisma.website.count();
  const finalCompCount = await prisma.competitor.count();
  const finalIntelCount = await prisma.leadIntelligence.count();
  const finalOppCount = await prisma.opportunity.count();

  console.log('\n=== PIPELINE SCORING COMPLETE ===');
  console.log(`- Total Businesses:   ${finalBizCount}`);
  console.log(`- Total Audits:       ${finalWebCount}`);
  console.log(`- Total Competitors:  ${finalCompCount}`);
  console.log(`- Total Lead Intel:   ${finalIntelCount}`);
  console.log(`- Total Opportunities:${finalOppCount}`);
}

main()
  .catch(err => {
    console.error('Error running scoring:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
