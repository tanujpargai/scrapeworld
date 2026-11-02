import 'dotenv/config';
import prisma from '../lib/prisma';
import { gmapsQueue } from '../queues/gmaps.queue';
import { auditQueue } from '../queues/audit.queue';
import { Worker } from 'bullmq';
import redisConnection from '../lib/redis';
import { gmapsWorker } from '../workers/gmaps.worker';
import { auditWorker } from '../workers/audit.worker';

const queries = [
  { keyword: 'Dentists', location: 'Delhi' },
  { keyword: 'Gyms', location: 'Delhi' },
  { keyword: 'Restaurants', location: 'Delhi' },
  { keyword: 'Salons', location: 'Delhi' },
  { keyword: 'Real Estate Agents', location: 'Delhi' },
];

async function main() {
  console.log('=== REAL LEAD DISCOVERY AND ENRICHMENT PIPELINE ===');
  
  // 1. Create SearchJobs and add to gmapsQueue
  const jobIds: string[] = [];
  
  for (const q of queries) {
    console.log(`Queueing search job: "${q.keyword}" in "${q.location}"...`);
    const collection = await prisma.collection.create({
      data: {
        keyword: q.keyword,
        location: q.location,
        status: 'PENDING',
      },
    });
    
    // Add to gmaps queue with a limit of 5 to run validation quickly
    await gmapsQueue.add('gmaps-scrape', {
      collectionId: collection.id,
      keyword: q.keyword,
      location: q.location,
      limit: 5,
    });
    
    jobIds.push(collection.id);
  }

  console.log('\nAll search jobs queued successfully.');
  console.log('Spinning up background workers in-process to execute the full pipeline...');
  
  // We don't need to manually instantiate Worker classes since we imported them,
  // which automatically registers and boots them using the shared redis connection!
  // But let's verify if they are listening.
  console.log('Listening for and processing queue jobs (Google Maps scraping & website audits)...');

  // Monitor progress
  const startTime = Date.now();
  let allFinished = false;

  while (!allFinished) {
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const states = await prisma.collection.findMany({
      where: {
        id: { in: jobIds },
      },
    });

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const waitingScrape = await gmapsQueue.getWaitingCount();
    const activeScrape = await gmapsQueue.getActiveCount();
    const waitingAudit = await auditQueue.getWaitingCount();
    const activeAudit = await auditQueue.getActiveCount();

    const pendingJobs = states.filter(s => s.status !== 'COMPLETED' && s.status !== 'FAILED');
    console.log(`[${elapsed}s] Search status: ${states.map(s => `${s.keyword}:${s.status}`).join(' | ')}`);
    console.log(`        Scrape Queue: (W:${waitingScrape}, A:${activeScrape}) | Audit Queue: (W:${waitingAudit}, A:${activeAudit})`);

    if (pendingJobs.length === 0 && waitingScrape === 0 && activeScrape === 0 && waitingAudit === 0 && activeAudit === 0) {
      allFinished = true;
      console.log('\nAll validation discovery search jobs and audits have completed processing!');
      break;
    }

    // Safety timeout at 12 minutes
    if (elapsed > 720) {
      console.warn('Timeout reached. Stopping monitor loop.');
      break;
    }
  }

  // Double check that we recalculate ranks across all lead intelligence records
  console.log('Recalculating priority ranks...');
  try {
    const { LeadIntelligenceService } = await import('../services/LeadIntelligenceService');
    const leadIntelService = new LeadIntelligenceService();
    await leadIntelService.recalculateAllPriorityRanks();
    console.log('Priority ranks recalculated successfully!');
  } catch (rankErr) {
    console.error('Failed to recalculate priority ranks:', rankErr);
  }

  console.log('\n=== PIPELINE WORKFLOW EXECUTION COMPLETE ===');
  console.log('Please run: npx tsx src/bin/generate-top-leads.ts to see the results!');
}

main()
  .catch(err => {
    console.error('Error running validation discovery pipeline:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    // Close the workers to let the process exit
    await gmapsWorker.close();
    await auditWorker.close();
    process.exit(0);
  });
