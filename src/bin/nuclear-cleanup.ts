/**
 * nuclear-cleanup.ts
 *
 * Aggressive database size reduction. Targets large hidden data:
 *   1. NULL out verificationEvidence JSON (large blobs per business)
 *   2. NULL out technologyStack JSON in Website (unnecessary detail)
 *   3. Delete ALL WebsiteIssue rows (regenerable, big table)
 *   4. Delete ALL Activity rows (logs, pure overhead)
 *   5. Delete ALL ScrapeResult rows (safety net re-run)
 *   6. Delete businesses with status SKIPPED (dead leads, cascades everything)
 *   7. Truncate long text summaries > 500 chars in LeadIntelligence
 *   8. VACUUM ANALYZE all tables
 *
 * Run:
 *   npx tsx -r dotenv/config src/bin/nuclear-cleanup.ts
 */

import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   SCRAPE WORLD — NUCLEAR DATABASE CLEANUP     ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // ── Before counts ────────────────────────────────────────────
  console.log('📊 Current row counts:');
  const [businesses, websites, websiteIssues, activities, scrapeResults, leadIntel] =
    await Promise.all([
      prisma.business.count(),
      prisma.website.count(),
      prisma.websiteIssue.count(),
      prisma.activity.count(),
      prisma.scrapeResult.count(),
      prisma.leadIntelligence.count(),
    ]);

  console.log(`   Businesses      : ${businesses}`);
  console.log(`   Websites        : ${websites}`);
  console.log(`   WebsiteIssues   : ${websiteIssues}`);
  console.log(`   Activities      : ${activities}`);
  console.log(`   ScrapeResults   : ${scrapeResults}`);
  console.log(`   LeadIntelligence: ${leadIntel}`);
  console.log('');

  // ── Step 1: Delete ALL ScrapeResult rows ─────────────────────
  console.log('🗑️  [1/7] Deleting ScrapeResult rows...');
  const sr = await prisma.scrapeResult.deleteMany({});
  console.log(`   ✅ Deleted ${sr.count} rows\n`);

  // ── Step 2: Delete ALL Activity rows ─────────────────────────
  console.log('🗑️  [2/7] Deleting ALL Activity logs...');
  const act = await prisma.activity.deleteMany({});
  console.log(`   ✅ Deleted ${act.count} rows\n`);

  // ── Step 3: Delete ALL WebsiteIssue rows ─────────────────────
  console.log('🗑️  [3/7] Deleting ALL WebsiteIssue rows...');
  const wi = await prisma.websiteIssue.deleteMany({});
  console.log(`   ✅ Deleted ${wi.count} rows\n`);

  // ── Step 4: Delete SKIPPED businesses (cascades all related rows) ──
  console.log('🗑️  [4/7] Deleting SKIPPED businesses (cascades all relations)...');
  const skipped = await prisma.business.deleteMany({
    where: { status: 'SKIPPED' },
  });
  console.log(`   ✅ Deleted ${skipped.count} SKIPPED businesses (+ all cascaded data)\n`);

  // ── Step 5: NULL out verificationEvidence JSON blobs ─────────
  console.log('🧹 [5/7] Nulling verificationEvidence JSON blobs on businesses...');
  const veResult = await prisma.$executeRaw`
    UPDATE business
    SET verification_evidence = NULL
    WHERE verification_evidence IS NOT NULL
  `;
  console.log(`   ✅ Cleared verificationEvidence on ${veResult} businesses\n`);

  // ── Step 6: Strip technologyStack down to empty object ────────
  console.log('🧹 [6/7] Stripping technologyStack JSON on websites...');
  const tsResult = await prisma.$executeRaw`
    UPDATE website
    SET technology_stack = '{}'::jsonb
    WHERE technology_stack::text != '{}'
  `;
  console.log(`   ✅ Stripped technologyStack on ${tsResult} websites\n`);

  // ── Step 7: Truncate long text in LeadIntelligence ───────────
  console.log('🧹 [7/7] Truncating long leadSummary text (> 300 chars)...');
  const liResult = await prisma.$executeRaw`
    UPDATE lead_intelligence
    SET lead_summary = LEFT(lead_summary, 300)
    WHERE LENGTH(lead_summary) > 300
  `;
  console.log(`   ✅ Truncated leadSummary on ${liResult} rows\n`);

  // ── VACUUM ANALYZE ────────────────────────────────────────────
  console.log('🔧 Running VACUUM ANALYZE on all major tables...');
  const tables = [
    'scrape_result', 'activity', 'website_issue', 'business',
    'website', 'lead_intelligence', 'ai_report',
    'opportunity', 'competitor_analysis', 'social_profile',
  ];

  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(`VACUUM ANALYZE "${t}"`);
      console.log(`   ✅ ${t}`);
    } catch (e: any) {
      console.log(`   ⚠️  ${t}: ${e.message?.slice(0, 60)}`);
    }
  }

  // ── After counts ─────────────────────────────────────────────
  console.log('\n📊 Row counts after cleanup:');
  const [bizAfter, wiAfter, actAfter, srAfter] = await Promise.all([
    prisma.business.count(),
    prisma.websiteIssue.count(),
    prisma.activity.count(),
    prisma.scrapeResult.count(),
  ]);
  console.log(`   Businesses    : ${bizAfter} (was ${businesses})`);
  console.log(`   WebsiteIssues : ${wiAfter}  (was ${websiteIssues})`);
  console.log(`   Activities    : ${actAfter}  (was ${activities})`);
  console.log(`   ScrapeResults : ${srAfter}  (was ${scrapeResults})`);

  const totalDeleted = sr.count + act.count + wi.count + skipped.count;

  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║              CLEANUP COMPLETE                 ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log(`   🎉 Total rows hard-deleted : ${totalDeleted}`);
  console.log(`   🎉 JSON blobs nulled       : verificationEvidence, technologyStack`);
  console.log(`   🎉 Text truncated          : leadSummary`);
  console.log('\n   ℹ️  Refresh Supabase dashboard in ~2 minutes to see new DB size.');
  console.log('   ℹ️  Egress counter resets on your billing cycle date.\n');
}

main()
  .catch(err => { console.error('\n❌ Error:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
