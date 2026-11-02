import 'dotenv/config';
import prisma from '../lib/prisma';
import { gmapsQueue } from '../queues/gmaps.queue';
import { auditQueue } from '../queues/audit.queue';
import { CompetitorService } from '../services/CompetitorService';
import { LeadIntelligenceService } from '../services/LeadIntelligenceService';

const queries = [
  { keyword: 'Gyms', location: 'Delhi', limit: 80 },
  { keyword: 'Restaurants', location: 'Delhi', limit: 80 },
  { keyword: 'Salons', location: 'Delhi', limit: 80 },
  { keyword: 'Real Estate Agents', location: 'Delhi', limit: 80 },
  { keyword: 'Lawyers', location: 'Delhi', limit: 80 },
  { keyword: 'Clinics', location: 'Delhi', limit: 80 },
  { keyword: 'Marketing Agencies', location: 'Delhi', limit: 80 }
];

async function main() {
  console.log('=== SCRAPE WORLD SCALE & RELIABILITY STRESS TEST ===');
  
  // Track initial stats
  const initialBizCount = await prisma.business.count();
  const initialWebCount = await prisma.website.count();
  const initialIssueCount = await prisma.websiteIssue.count();
  console.log(`Starting state - Businesses: ${initialBizCount}, Audits: ${initialWebCount}, Issues: ${initialIssueCount}`);

  // 1. Queue all search jobs
  const jobIds: string[] = [];
  for (const q of queries) {
    console.log(`Queueing search job: "${q.keyword}" in "${q.location}" (Limit: ${q.limit})...`);
    const collection = await prisma.collection.create({
      data: {
        keyword: q.keyword,
        location: q.location,
        status: 'PENDING',
      },
    });
    
    await gmapsQueue.add('gmaps-scrape', {
      collectionId: collection.id,
      keyword: q.keyword,
      location: q.location,
      limit: q.limit,
    });
    
    jobIds.push(collection.id);
  }

  console.log('\nAll search jobs queued in Redis. Monitoring execution...');

  const startTime = Date.now();
  let completed = false;

  while (!completed) {
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    const states = await prisma.collection.findMany({
      where: { id: { in: jobIds } },
    });

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const waitingScrape = await gmapsQueue.getWaitingCount();
    const activeScrape = await gmapsQueue.getActiveCount();
    const waitingAudit = await auditQueue.getWaitingCount();
    const activeAudit = await auditQueue.getActiveCount();

    const pendingCount = states.filter(s => s.status !== 'COMPLETED' && s.status !== 'FAILED').length;
    
    console.log(`[${elapsed}s] Pending jobs: ${pendingCount}/${states.length} | Scrape Q: (W:${waitingScrape}, A:${activeScrape}) | Audit Q: (W:${waitingAudit}, A:${activeAudit})`);
    
    // Check states of individual queries
    states.forEach(s => {
      console.log(`  - ${s.keyword}: ${s.status} (${s.totalProcessed || 0}/${s.totalFound || 0} processed)`);
    });

    const bizCount = await prisma.business.count();
    console.log(`  - Current Business Count in DB: ${bizCount}`);

    if (pendingCount === 0 && waitingScrape === 0 && activeScrape === 0 && waitingAudit === 0 && activeAudit === 0) {
      completed = true;
      console.log('\nAll search jobs and subsequent website audits have finished processing!');
      break;
    }

    // Safety timeout at 25 minutes
    if (elapsed > 1500) {
      console.warn('Timeout reached. Exiting monitor loop.');
      break;
    }
  }

  console.log('\n=== RUNNING COMPETITOR & LEAD INTELLIGENCE SCORING ===');
  const allBusinesses = await prisma.business.findMany({
    select: { id: true, name: true, industry: true }
  });

  console.log(`Processing competitor gaps and lead intelligence for ${allBusinesses.length} businesses...`);
  
  const competitorService = new CompetitorService();
  const leadIntelService = new LeadIntelligenceService();
  
  let compCreated = 0;
  let intelCreated = 0;
  let count = 0;

  for (const biz of allBusinesses) {
    count++;
    if (count % 50 === 0) {
      console.log(`  - Scored ${count}/${allBusinesses.length} businesses...`);
    }

    try {
      // 1. Run competitor pipeline
      const compResult = await competitorService.runCompetitorPipeline(biz.id);
      compCreated += compResult.competitorsDiscovered;
      intelCreated++;
    } catch (e: any) {
      console.error(`Failed scoring for "${biz.name}" (${biz.id}):`, e.message);
    }
  }

  console.log('\nRecalculating global priority ranks...');
  await leadIntelService.recalculateAllPriorityRanks();

  // Track final stats
  const finalBizCount = await prisma.business.count();
  const finalWebCount = await prisma.website.count();
  const finalIssueCount = await prisma.websiteIssue.count();
  const finalCompCount = await prisma.competitor.count();
  const finalIntelCount = await prisma.leadIntelligence.count();

  console.log('\n=== STRESS TEST COMPLETED ===');
  console.log(`Initial Businesses: ${initialBizCount} -> Final: ${finalBizCount}`);
  console.log(`Initial Audits:     ${initialWebCount} -> Final: ${finalWebCount}`);
  console.log(`Initial Issues:     ${initialIssueCount} -> Final: ${finalIssueCount}`);
  console.log(`Competitor relations created: ${finalCompCount}`);
  console.log(`Lead Intelligence entries:    ${finalIntelCount}`);
}

main()
  .catch(err => {
    console.error('Error running stress test:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
