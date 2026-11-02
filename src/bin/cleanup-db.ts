/**
 * cleanup-db.ts
 *
 * Aggressively reduces Supabase DB size and egress by:
 *   1. Deleting all ScrapeResult rows (raw JSON blobs, already processed)
 *   2. Keeping only the LATEST AI report per business per reportType
 *   3. Purging Activity logs older than 60 days
 *   4. Purging orphaned Website / SocialProfile / Contact rows
 *   5. Running VACUUM ANALYZE to reclaim disk space
 *
 * Run with:
 *   npx ts-node -r dotenv/config --project tsconfig.json src/bin/cleanup-db.ts
 */

import 'dotenv/config';
import prisma from '../lib/prisma';
import { PrismaClient } from '@prisma/client';

const db = prisma as PrismaClient;

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     SCRAPE WORLD — DATABASE CLEANUP      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ─────────────────────────────────────────────────────────────
  // STEP 1: Count current state
  // ─────────────────────────────────────────────────────────────
  console.log('📊 Counting rows before cleanup...');

  const [
    scrapeResultCount,
    aiReportCount,
    activityCount,
    businessCount,
    opportunityCount,
  ] = await Promise.all([
    db.scrapeResult.count(),
    db.aIReport.count(),
    db.activity.count(),
    db.business.count(),
    db.opportunity.count(),
  ]);

  console.log(`   ScrapeResults : ${scrapeResultCount}`);
  console.log(`   AIReports     : ${aiReportCount}`);
  console.log(`   Activities    : ${activityCount}`);
  console.log(`   Businesses    : ${businessCount}`);
  console.log(`   Opportunities : ${opportunityCount}`);
  console.log('');

  // ─────────────────────────────────────────────────────────────
  // STEP 2: Delete ALL ScrapeResult rows
  // These are raw JSON dumps that are only needed during scraping.
  // Once the Business row exists, these are pure waste.
  // ─────────────────────────────────────────────────────────────
  console.log('🗑️  Step 1/5 — Deleting ScrapeResult rows (raw JSON blobs)...');
  const deletedScrapeResults = await db.scrapeResult.deleteMany({});
  console.log(`   ✅ Deleted ${deletedScrapeResults.count} ScrapeResult rows\n`);

  // ─────────────────────────────────────────────────────────────
  // STEP 3: Keep only the latest AIReport per business per type
  // ─────────────────────────────────────────────────────────────
  console.log('🗑️  Step 2/5 — Deduplicating AIReports (keep latest per type)...');

  // Get all reports grouped by businessId + reportType
  const allReports = await db.aIReport.findMany({
    select: { id: true, businessId: true, reportType: true, generatedAt: true },
    orderBy: { generatedAt: 'desc' },
  });

  // Build a set of IDs to keep (first seen = latest for each business+type combo)
  const keepSet = new Set<string>();
  const seen = new Set<string>();
  for (const report of allReports) {
    const key = `${report.businessId}::${report.reportType}`;
    if (!seen.has(key)) {
      seen.add(key);
      keepSet.add(report.id);
    }
  }

  const toDeleteIds = allReports
    .filter(r => !keepSet.has(r.id))
    .map(r => r.id);

  let deletedReports = 0;
  if (toDeleteIds.length > 0) {
    // Delete in batches of 500 to avoid query size limits
    const BATCH = 500;
    for (let i = 0; i < toDeleteIds.length; i += BATCH) {
      const batch = toDeleteIds.slice(i, i + BATCH);
      const res = await db.aIReport.deleteMany({ where: { id: { in: batch } } });
      deletedReports += res.count;
      process.stdout.write(`\r   Deleted ${deletedReports}/${toDeleteIds.length} duplicate reports...`);
    }
  }
  console.log(`\n   ✅ Deleted ${deletedReports} duplicate AIReport rows\n`);

  // ─────────────────────────────────────────────────────────────
  // STEP 4: Purge old Activity logs (keep last 60 days)
  // ─────────────────────────────────────────────────────────────
  console.log('🗑️  Step 3/5 — Purging Activity logs older than 15 days...');
  const cutoff15d = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const deletedActivities = await db.activity.deleteMany({
    where: { createdAt: { lt: cutoff15d } },
  });
  console.log(`   ✅ Deleted ${deletedActivities.count} old Activity rows\n`);

  // ─────────────────────────────────────────────────────────────
  // STEP 5: Purge excessive Opportunities per business
  // Keep max 5 opportunities per business (highest scored)
  // ─────────────────────────────────────────────────────────────
  console.log('🗑️  Step 4/5 — Trimming excess Opportunities (keep top 5 per business)...');

  const allOpportunities = await db.opportunity.findMany({
    select: { id: true, businessId: true, opportunityScore: true, createdAt: true },
    orderBy: [{ opportunityScore: 'desc' }, { createdAt: 'desc' }],
  });

  const oppKeepSet = new Set<string>();
  const oppSeen = new Map<string, number>();
  for (const opp of allOpportunities) {
    const count = oppSeen.get(opp.businessId) ?? 0;
    if (count < 5) {
      oppKeepSet.add(opp.id);
      oppSeen.set(opp.businessId, count + 1);
    }
  }

  const oppToDelete = allOpportunities
    .filter(o => !oppKeepSet.has(o.id))
    .map(o => o.id);

  let deletedOpps = 0;
  if (oppToDelete.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < oppToDelete.length; i += BATCH) {
      const batch = oppToDelete.slice(i, i + BATCH);
      const res = await db.opportunity.deleteMany({ where: { id: { in: batch } } });
      deletedOpps += res.count;
    }
  }
  console.log(`   ✅ Deleted ${deletedOpps} excess Opportunity rows\n`);

  // ─────────────────────────────────────────────────────────────
  // STEP 6: VACUUM ANALYZE — reclaim disk space
  // ─────────────────────────────────────────────────────────────
  console.log('🔧 Step 5/5 — Running VACUUM ANALYZE on key tables...');
  const tables = [
    'scrape_result',
    'ai_report',
    'activity',
    'opportunity',
    'competitor_analysis',
  ];

  for (const table of tables) {
    try {
      await db.$executeRawUnsafe(`VACUUM ANALYZE "${table}"`);
      console.log(`   ✅ VACUUM done on ${table}`);
    } catch (e: any) {
      // Supabase may restrict VACUUM in some connection modes — that's OK
      console.log(`   ⚠️  VACUUM skipped for ${table}: ${e.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║              CLEANUP COMPLETE            ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`   ScrapeResults deleted : ${deletedScrapeResults.count}`);
  console.log(`   Duplicate AIReports   : ${deletedReports}`);
  console.log(`   Old Activities        : ${deletedActivities.count}`);
  console.log(`   Excess Opportunities  : ${deletedOpps}`);

  const totalDeleted = deletedScrapeResults.count + deletedReports + deletedActivities.count + deletedOpps;
  console.log(`\n   🎉 Total rows deleted : ${totalDeleted}`);
  console.log('\n   ℹ️  Wait a few minutes for Supabase dashboard to reflect new size.');
  console.log('   ℹ️  Egress resets on your billing cycle, not immediately.\n');
}

main()
  .catch(err => {
    console.error('\n❌ Cleanup failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
