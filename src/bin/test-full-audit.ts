import 'dotenv/config';
import prisma from '../lib/prisma';
import { auditQueue } from '../queues/audit.queue';
import * as fs from 'fs';
import * as path from 'path';

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
    console.error('No business with a website found in the database. Please add one first.');
    return;
  }

  console.log(`Found business: ID=${business.id}, name="${business.name}", website="${business.website}"`);
  console.log(`Queueing FULL audit for business ${business.id} (${business.website})...`);
  
  const job = await auditQueue.add('audit-website', {
    businessId: business.id,
    websiteUrl: business.website,
    mode: 'FULL',
  });

  console.log(`Job queued successfully. Job ID: ${job.id}`);
  console.log('Waiting 15 seconds for the Playwright worker to process the FULL audit...');
  await new Promise((resolve) => setTimeout(resolve, 15000));

  console.log('Querying database for website audit results...');
  const website = await prisma.website.findUnique({
    where: { businessId: business.id },
    include: {
      issues: true,
    },
  });

  if (!website) {
    console.error('❌ Error: No website audit record found in the database!');
    return;
  }

  console.log('\n==================================================');
  console.log('SUCCESS: Website FULL Audit Record Found!');
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
  console.log(` - Accessibility: ${website.accessibilityScore}/100`);
  console.log(` - Best Practices (Tech): ${website.bestPracticesScore}/100`);
  console.log(` - Overall:       ${website.overallScore}/100`);
  console.log(`\nDetected Issues (${website.issues.length}):`);
  for (const issue of website.issues) {
    console.log(` - [${issue.severity}] ${issue.title} (Type: ${issue.type})`);
  }

  // Check if screenshot exists
  const screenshotPath = path.join(process.cwd(), 'public', 'screenshots', `${business.id}.jpg`);
  if (fs.existsSync(screenshotPath)) {
    console.log(`\n✅ Screenshot successfully saved to: ${screenshotPath}`);
    console.log(`Screenshot file size: ${fs.statSync(screenshotPath).size} bytes`);
  } else {
    console.error(`\n❌ Error: Screenshot file not found at: ${screenshotPath}`);
  }
  console.log('==================================================\n');
}

main()
  .catch((err) => {
    console.error('Error in test script:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
