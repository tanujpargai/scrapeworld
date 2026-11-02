import 'dotenv/config';
import prisma from '../lib/prisma';
import { aiQueue } from '../queues/ai.queue';
import { Worker } from 'bullmq';
import redisConnection from '../lib/redis';
import { AIService } from '../services/AIService';
import { ReportType } from '@prisma/client';

async function main() {
  console.log('=== AI ENGINE PIPELINE INTEGRATION TEST ===');

  // 1. Find a business with website data to use as the target
  console.log('Finding a business with website data in the database...');
  const targetBiz = await prisma.business.findFirst({
    where: {
      websiteData: {
        isNot: null,
      },
    },
    include: {
      websiteData: true,
    },
  });

  if (!targetBiz) {
    console.error('❌ Error: No business with website data found in the database. Please run audits first!');
    return;
  }

  console.log(`\nTarget Business found: ID=${targetBiz.id}`);
  console.log(` - Name:     "${targetBiz.name}"`);
  console.log(` - Industry: "${targetBiz.industry}"`);
  console.log(` - Web Score: ${targetBiz.websiteData?.overallScore}/100`);

  // Delete previous AI reports for this business to ensure we test a clean run
  console.log(`\nCleaning up any previous AI reports for business ${targetBiz.id}...`);
  await prisma.aIReport.deleteMany({
    where: {
      businessId: targetBiz.id,
    },
  });

  // 2. Queue the job in BullMQ
  const reportType = ReportType.FULL_ANALYSIS;
  console.log(`\nQueueing AI report generation job (${reportType}) in aiQueue...`);
  const queueJob = await aiQueue.add('ai-report-test', {
    businessId: targetBiz.id,
    reportType,
  });
  console.log(`AI job queued in BullMQ: JobID=${queueJob.id}`);

  // 3. Start a temporary local worker to process the job
  console.log('\nStarting local BullMQ worker to process the job...');
  const aiService = new AIService();
  let jobCompleted = false;
  let jobFailed = false;
  let failureReason = '';

  const testWorker = new Worker(
    'ai-analysis',
    async (job) => {
      console.log(`[Worker] Processing job ${job.id} for business ${job.data.businessId}...`);
      const report = await aiService.generateReport(job.data.businessId, job.data.reportType);
      return { reportId: report.id };
    },
    {
      connection: redisConnection as any,
      skipVersionCheck: true,
    }
  );

  testWorker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully!`);
    jobCompleted = true;
  });

  testWorker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err);
    jobFailed = true;
    failureReason = err.message;
  });

  // 4. Wait for the worker to finish
  const startTime = Date.now();
  console.log('Waiting for job execution (timeout at 60 seconds)...');
  while (!jobCompleted && !jobFailed) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (elapsed > 60) {
      console.warn('Test timeout exceeded (60 seconds).');
      break;
    }
  }

  // Close worker
  await testWorker.close();

  if (jobFailed) {
    console.error(`❌ Test Failed: AI job processing failed. Reason: ${failureReason}`);
    return;
  }

  if (!jobCompleted) {
    console.error('❌ Test Failed: Worker did not complete the job within time.');
    return;
  }

  // 5. Gather & Print results
  console.log('\n=== COMPILING GENERATED AI REPORT DETAILS ===');
  const report = await prisma.aIReport.findFirst({
    where: {
      businessId: targetBiz.id,
      reportType,
    },
  });

  if (!report) {
    console.error('❌ Error: No AI report record found in the database!');
    return;
  }

  console.log(`\n[SUCCESS] AI Report Created: ID=${report.id}`);
  console.log(`- Report Type:      ${report.reportType}`);
  console.log(`- Confidence Score: ${report.confidenceScore}/100`);
  console.log(`- Generated At:     ${report.generatedAt}`);
  
  console.log('\n--- Business Summary ---');
  console.log(report.summary || 'N/A');

  console.log('\n--- Problems Detected ---');
  const problems = report.problems as any[] || [];
  problems.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.severity}] ${p.title}`);
    console.log(`     Description: ${p.description}`);
  });

  console.log('\n--- Recommendations ---');
  const recommendations = report.recommendations as any[] || [];
  recommendations.forEach((r, i) => {
    console.log(`  ${i + 1}. Title: ${r.title}`);
    console.log(`     Details: ${r.details}`);
  });

  console.log('\n--- Sales Opportunities ---');
  const opportunities = report.opportunities as any[] || [];
  opportunities.forEach((o, i) => {
    console.log(`  ${i + 1}. [${o.serviceType}] ${o.title} (Est. Value: $${o.estimatedValue})`);
    console.log(`     Description: ${o.description}`);
  });

  console.log('\n--- Outreach Channels & Angles ---');
  const angles = report.salesAngles as any[] || [];
  angles.forEach((a, i) => {
    console.log(`  ${i + 1}. Channel: ${a.channel}`);
    console.log(`     Hook:    ${a.hook}`);
    console.log(`     Pitch:   ${a.pitch}`);
    console.log(`     Script Snippet:\n"""\n${a.script ? a.script.split('\n').slice(0, 5).join('\n') : 'N/A'}\n..."""`);
  });

  console.log('\n=============================================');
}

main()
  .catch((err) => {
    console.error('Error running AI pipeline test:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
