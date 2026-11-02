import 'dotenv/config';
import prisma from '../lib/prisma';
import { LeadIntelligenceService } from '../services/LeadIntelligenceService';

async function main() {
  console.log('=== RECOMPUTING LEAD INTELLIGENCE FOR ALL BUSINESSES ===');
  
  const businesses = await prisma.business.findMany({
    select: { id: true, name: true },
  });

  console.log(`Found ${businesses.length} businesses in database.`);
  
  const leadIntelService = new LeadIntelligenceService();
  let successCount = 0;

  for (const biz of businesses) {
    try {
      console.log(`Calculating for: "${biz.name}" (ID: ${biz.id})...`);
      await leadIntelService.calculateAndSave(biz.id);
      successCount++;
    } catch (err) {
      console.error(`Failed to calculate for "${biz.name}":`, err);
    }
  }

  console.log('\nRecalculating ranks...');
  await leadIntelService.recalculateAllPriorityRanks();
  
  console.log(`\nSuccessfully computed lead intelligence for ${successCount}/${businesses.length} businesses.`);
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
