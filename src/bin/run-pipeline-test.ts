import 'dotenv/config';
import prisma from '../lib/prisma';
import { gmapsQueue } from '../queues/gmaps.queue';
import { auditQueue } from '../queues/audit.queue';

async function main() {
  console.log('=== END-TO-END PIPELINE INTEGRATION TEST ===');
  
  // 1. Create a SearchJob in the database
  const keyword = 'Dentists';
  const location = 'Delhi';
  
  console.log(`Creating Collection for "${keyword}" in "${location}"...`);
  const collection = await prisma.collection.create({
    data: {
      keyword,
      location,
      status: 'PENDING',
    },
  });
  console.log(`Collection created: ID=${collection.id}`);

  // 2. Queue the job in BullMQ
  console.log('Queueing scraping job in gmapsQueue...');
  const queueJob = await gmapsQueue.add('gmaps-scrape', {
    collectionId: collection.id,
    keyword,
    location,
  });
  console.log(`Scraping job queued in BullMQ: JobID=${queueJob.id}`);

  // 3. Monitor Collection and website-audit queue progress in a loop
  console.log('\nMonitoring progress (updates every 10 seconds)...');
  const startTime = Date.now();
  let completed = false;
  
  // Track initial business and website counts
  const initialBizCount = await prisma.business.count();
  const initialWebCount = await prisma.website.count();
  const initialIssueCount = await prisma.websiteIssue.count();

  while (!completed) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const jobState = await prisma.collection.findUnique({
      where: { id: collection.id },
    });

    if (!jobState) {
      console.error('Error: Collection record disappeared from DB!');
      break;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const waitingScrape = await gmapsQueue.getWaitingCount();
    const activeScrape = await gmapsQueue.getActiveCount();
    const waitingAudit = await auditQueue.getWaitingCount();
    const activeAudit = await auditQueue.getActiveCount();

    console.log(`[${elapsed}s] Status: ${jobState.status} | Found: ${jobState.totalFound} | Processed: ${jobState.totalProcessed} | Scrape Q: (W:${waitingScrape}, A:${activeScrape}) | Audit Q: (W:${waitingAudit}, A:${activeAudit})`);

    if (jobState.status === 'COMPLETED' || jobState.status === 'FAILED') {
      completed = true;
      console.log(`\nPipeline search job finished with status: ${jobState.status}`);
      break;
    }
    
    // Safety timeout at 10 minutes to prevent hanging
    if (elapsed > 600) {
      console.warn('Test timeout exceeded (10 minutes). Exiting monitor loop.');
      break;
    }
  }

  // 4. Gather Post-Execution Statistics
  console.log('\n=== COMPILING POST-EXECUTION STATISTICS ===');
  const finalBizCount = await prisma.business.count();
  const finalWebCount = await prisma.website.count();
  const finalIssueCount = await prisma.websiteIssue.count();

  const searchJobResult = await prisma.collection.findUnique({
    where: { id: collection.id },
    include: {
      scrapeResults: true,
    },
  });

  const businessesFound = searchJobResult?.totalFound || 0;
  const businessesProcessed = searchJobResult?.totalProcessed || 0;
  const newBusinessesCount = finalBizCount - initialBizCount;
  const duplicatesRemoved = businessesProcessed - newBusinessesCount;

  console.log(`- Collection ID:        ${collection.id}`);
  console.log(`- Status:               ${searchJobResult?.status}`);
  console.log(`- Scraping Duration:    ${searchJobResult?.startedAt && searchJobResult?.completedAt ? Math.round((searchJobResult.completedAt.getTime() - searchJobResult.startedAt.getTime()) / 1000) : 'N/A'} seconds`);
  console.log(`- Raw ScrapeResults:    ${searchJobResult?.scrapeResults.length}`);
  console.log(`- Businesses Found:     ${businessesFound}`);
  console.log(`- Businesses Processed: ${businessesProcessed}`);
  console.log(`- New Businesses:       ${newBusinessesCount}`);
  console.log(`- Duplicates Updated:   ${duplicatesRemoved}`);

  // Query website audits that were processed during this timeframe
  const activeAudits = await prisma.website.findMany({
    where: {
      createdAt: {
        gte: new Date(startTime),
      },
    },
    include: {
      issues: true,
      business: true,
    },
  });

  console.log(`\n- Audits Triggered & Created during test: ${activeAudits.length}`);
  const successfulAudits = activeAudits.filter(w => w.overallScore !== null && w.overallScore > 10).length;
  const failedAudits = activeAudits.filter(w => w.overallScore !== null && w.overallScore === 10).length;
  
  console.log(`  - Successful Audits:  ${successfulAudits}`);
  console.log(`  - Failed Audits:      ${failedAudits}`);
  
  let totalIssues = 0;
  activeAudits.forEach(w => totalIssues += w.issues.length);
  console.log(`  - Total Issues Generated: ${totalIssues}`);

  if (activeAudits.length > 0) {
    console.log('\nSample Audits Created:');
    activeAudits.slice(0, 3).forEach(w => {
      console.log(` - Business: "${w.business.name}"`);
      console.log(`   URL: ${w.url} | Score: ${w.overallScore} | Issues: ${w.issues.length}`);
    });
  }
  
  console.log('\n=============================================');
}

main()
  .catch(err => {
    console.error('Error executing pipeline test:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
