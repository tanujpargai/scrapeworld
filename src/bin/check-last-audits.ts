import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  console.log('Checking recently scanned websites...');
  
  // Look back 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const scannedWebsites = await prisma.website.findMany({
    where: {
      lastScanAt: {
        gte: fifteenMinutesAgo,
      },
    },
    include: {
      business: true,
      issues: true,
    },
  });

  console.log(`\nFound ${scannedWebsites.length} website audits processed in the last 15 minutes.`);
  
  if (scannedWebsites.length > 0) {
    console.log('\nProcessed Website Audits Details:');
    scannedWebsites.slice(0, 10).forEach((w, index) => {
      console.log(`${index + 1}. Business: "${w.business.name}"`);
      console.log(`   URL: ${w.url} | Domain: ${w.domain}`);
      console.log(`   CMS: ${w.cms} | SSL: ${w.sslEnabled}`);
      console.log(`   Scores: Overall=${w.overallScore}, Performance=${w.performanceScore}, SEO=${w.seoScore}, Security=${w.securityScore}, Tech/Best Practices=${w.bestPracticesScore}`);
      console.log(`   Issues Detected: ${w.issues.length}`);
      w.issues.forEach(i => console.log(`     - [${i.severity}] ${i.title}`));
    });
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => process.exit(0));
