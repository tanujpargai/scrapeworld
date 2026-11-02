import 'dotenv/config';
import prisma from '../lib/prisma';
import { auditQueue } from '../queues/audit.queue';

async function main() {
  console.log('Finding a business with a website in the database...');
  const business = await prisma.business.findFirst({
    where: {
      website: {
        not: null,
      },
    },
  });

  if (!business) {
    console.log('No business with a website found in the database. Creating a mock business for testing...');
    const mockBiz = await prisma.business.create({
      data: {
        name: 'Mock Business for Audit Testing',
        slug: 'mock-biz-audit-' + Math.floor(Math.random() * 10000),
        website: 'https://clovedental.in', // A real, live website to test tech detection, SEO, etc.
        phone: '1234567890',
        industry: 'Dentist',
      },
    });
    console.log(`Mock business created: ID=${mockBiz.id}, website=${mockBiz.website}`);
    await triggerAndVerify(mockBiz.id, mockBiz.website!);
  } else {
    console.log(`Found business: ID=${business.id}, name="${business.name}", website="${business.website}"`);
    await triggerAndVerify(business.id, business.website!);
  }
}

async function triggerAndVerify(businessId: string, websiteUrl: string) {
  console.log(`Queueing FAST audit for business ${businessId} (${websiteUrl})...`);
  const job = await auditQueue.add('audit-website', {
    businessId,
    websiteUrl,
    mode: 'FAST',
  });

  console.log(`Job queued successfully. Job ID: ${job.id}`);
  console.log('Waiting 8 seconds for the worker to process the audit...');
  await new Promise((resolve) => setTimeout(resolve, 8000));

  console.log('Querying database for website audit results...');
  const website = await prisma.website.findUnique({
    where: { businessId },
    include: {
      issues: true,
    },
  });

  if (!website) {
    console.error('❌ Error: No website audit record found in the database!');
    return;
  }

  console.log('\n==================================================');
  console.log('SUCCESS: Website Audit Record Found!');
  console.log('==================================================');
  console.log(`Domain: ${website.domain}`);
  console.log(`URL: ${website.url}`);
  console.log(`CMS: ${website.cms}`);
  console.log(`SSL Enabled: ${website.sslEnabled}`);
  console.log(`Technology Stack: ${JSON.stringify(website.technologyStack)}`);
  console.log(`Scores:`);
  console.log(` - Performance:   ${website.performanceScore}/100`);
  console.log(` - SEO:           ${website.seoScore}/100`);
  console.log(` - Security:      ${website.securityScore}/100`);
  console.log(` - Best Practices (Tech): ${website.bestPracticesScore}/100`);
  console.log(` - Overall:       ${website.overallScore}/100`);
  console.log(`\nDetected Issues (${website.issues.length}):`);
  for (const issue of website.issues) {
    console.log(` - [${issue.severity}] ${issue.title} (Type: ${issue.type})`);
    console.log(`   Description: ${issue.description}`);
    console.log(`   Recommendation: ${issue.recommendation}`);
  }
  console.log('==================================================\n');
}

main()
  .catch((err) => {
    console.error('Error in test script:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    // BullMQ keeps event loop open via connection, we need to explicitly exit
    process.exit(0);
  });
