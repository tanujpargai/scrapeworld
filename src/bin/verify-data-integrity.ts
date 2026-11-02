import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  console.log('=== DATABASE DATA INTEGRITY VALIDATION ===');

  let passed = true;

  // 1. Check duplicate businesses by googlePlaceId
  console.log('Checking for duplicate businesses by Google Place ID...');
  const duplicatePlaces = await prisma.business.groupBy({
    by: ['googlePlaceId'],
    _count: {
      id: true,
    },
    where: {
      googlePlaceId: {
        not: null,
      },
    },
    having: {
      googlePlaceId: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  if (duplicatePlaces.length > 0) {
    console.error(`❌ Fail: Found ${duplicatePlaces.length} duplicate Place ID groups!`);
    console.error(JSON.stringify(duplicatePlaces));
    passed = false;
  } else {
    console.log('✅ Pass: No duplicate businesses by Google Place ID found.');
  }

  // 2. Check duplicate businesses by website URL (ignoring duplicates we expect to merge)
  console.log('Checking for duplicate business website URLs...');
  const duplicateWebsites = await prisma.business.groupBy({
    by: ['website'],
    _count: {
      id: true,
    },
    where: {
      website: {
        not: null,
      },
    },
    having: {
      website: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  if (duplicateWebsites.length > 0) {
    console.error(`❌ Fail: Found ${duplicateWebsites.length} duplicate website URL groups!`);
    console.error(JSON.stringify(duplicateWebsites));
    passed = false;
  } else {
    console.log('✅ Pass: No duplicate business website URLs found.');
  }

  // 3. Check duplicate website records (should be 1-to-1 with Business)
  console.log('Checking for duplicate Website entity records per business...');
  const duplicateWebs = await prisma.website.groupBy({
    by: ['businessId'],
    _count: {
      id: true,
    },
    having: {
      businessId: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  if (duplicateWebs.length > 0) {
    console.error(`❌ Fail: Found ${duplicateWebs.length} duplicate website entities for the same business!`);
    passed = false;
  } else {
    console.log('✅ Pass: No duplicate Website records found.');
  }

  // 4. Check for orphan websites (websites without a valid business)
  console.log('Checking for orphan Website records...');
  // Prisma relation ensures this, but let's query it
  const orphanWebsites = await prisma.website.findMany({
    where: {
      businessId: {
        notIn: (await prisma.business.findMany({ select: { id: true } })).map(b => b.id),
      },
    },
  });

  if (orphanWebsites.length > 0) {
    console.error(`❌ Fail: Found ${orphanWebsites.length} orphan Website records!`);
    passed = false;
  } else {
    console.log('✅ Pass: No orphan Website records found.');
  }

  // 5. Check for orphan website issues (issues without a valid website)
  console.log('Checking for orphan WebsiteIssue records...');
  const orphanIssues = await prisma.websiteIssue.findMany({
    where: {
      websiteId: {
        notIn: (await prisma.website.findMany({ select: { id: true } })).map(w => w.id),
      },
    },
  });

  if (orphanIssues.length > 0) {
    console.error(`❌ Fail: Found ${orphanIssues.length} orphan WebsiteIssue records!`);
    passed = false;
  } else {
    console.log('✅ Pass: No orphan WebsiteIssue records found.');
  }

  // 6. DB Summary Metrics
  const bizCount = await prisma.business.count();
  const webCount = await prisma.website.count();
  const issueCount = await prisma.websiteIssue.count();
  const collectionCount = await prisma.collection.count();
  const leadIntelCount = await prisma.leadIntelligence.count();
  const competitorCount = await prisma.competitor.count();
  const opportunityCount = await prisma.opportunity.count();
  
  console.log('\n--- DATABASE SUMMARY ---');
  console.log(`- Total Business Profiles: ${bizCount}`);
  console.log(`- Total Website Audits:    ${webCount}`);
  console.log(`- Total Website Issues:    ${issueCount}`);
  console.log(`- Total Search Jobs:       ${collectionCount}`);
  console.log(`- Total Lead Intel:        ${leadIntelCount}`);
  console.log(`- Total Competitors:       ${competitorCount}`);
  console.log(`- Total Opportunities:     ${opportunityCount}`);
  console.log('------------------------');

  if (passed) {
    console.log('\n🎉 ALL DATA INTEGRITY CHECKS PASSED SUCCESSFULLY! 🎉\n');
  } else {
    console.log('\n❌ DATA INTEGRITY CHECKS FAILED! ❌\n');
  }
}

main()
  .catch(err => {
    console.error('Error running data integrity verification:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
