import 'dotenv/config';
import prisma from '../lib/prisma';
import { auditQueue } from '../queues/audit.queue';

async function main() {
  console.log('--- MASS WEBSITE AUDIT QUEUE VERIFICATION ---');

  // 1. Get all businesses with a website
  const businesses = await prisma.business.findMany({
    where: {
      website: {
        not: null,
      },
    },
    include: {
      websiteData: true,
    },
  });

  console.log(`Total businesses in database with a website listed: ${businesses.length}`);

  const missingAudits = businesses.filter(b => !b.websiteData);
  console.log(`Businesses missing website audit records: ${missingAudits.length}`);

  if (missingAudits.length === 0) {
    console.log('All businesses already have audit records! We will re-queue 5 of them to verify duplicate prevention and retry handling.');
    const sample = businesses.slice(0, 5);
    for (const biz of sample) {
      console.log(`Re-queueing: ID=${biz.id}, Name="${biz.name}", URL="${biz.website}"`);
      await auditQueue.add('audit-website', {
        businessId: biz.id,
        websiteUrl: biz.website,
        mode: 'FAST',
      });
    }
  } else {
    console.log(`Queueing audits for all ${missingAudits.length} businesses...`);
    for (const biz of missingAudits) {
      console.log(`Queueing: ID=${biz.id}, Name="${biz.name}", URL="${biz.website}"`);
      await auditQueue.add('audit-website', {
        businessId: biz.id,
        websiteUrl: biz.website,
        mode: 'FAST',
      });
    }
  }

  // 2. Query queue statistics
  const jobs = await auditQueue.getJobs(['waiting', 'active', 'delayed', 'completed', 'failed']);
  console.log(`\nQueue Stats:`);
  console.log(` - Total Jobs in Queue: ${jobs.length}`);
  console.log(` - Waiting Jobs:        ${(await auditQueue.getWaitingCount())}`);
  console.log(` - Active Jobs:         ${(await auditQueue.getActiveCount())}`);
  console.log(` - Delayed Jobs:        ${(await auditQueue.getDelayedCount())}`);
  console.log(` - Completed Jobs:      ${(await auditQueue.getCompletedCount())}`);
  console.log(` - Failed Jobs:         ${(await auditQueue.getFailedCount())}`);

  console.log('\nWaiting 10 seconds for the workers to process some audits...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 3. Inspect updated database counts
  const updatedBusinesses = await prisma.business.findMany({
    where: {
      website: { not: null },
    },
    include: {
      websiteData: {
        include: {
          issues: true,
        },
      },
    },
  });

  const auditedCount = updatedBusinesses.filter(b => b.websiteData).length;
  console.log(`\n--- POST-WAIT STATS ---`);
  console.log(`Audited Businesses: ${auditedCount} / ${updatedBusinesses.length}`);
  
  // Show a couple of results
  const samples = updatedBusinesses.filter(b => b.websiteData).slice(0, 3);
  for (const sample of samples) {
    console.log(`\nBusiness: ${sample.name}`);
    console.log(` - URL: ${sample.website}`);
    console.log(` - Overall Score: ${sample.websiteData?.overallScore}`);
    console.log(` - Issues Count: ${sample.websiteData?.issues.length}`);
  }
}

main()
  .catch(err => {
    console.error('Verification failed:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
