/**
 * migrate-to-neon.ts
 *
 * One-time script: copies all data from old Supabase → new Neon DB.
 * Reads from OLD_DATABASE_URL, writes to DIRECT_URL.
 *
 * Run:
 *   npx tsx -r dotenv/config src/bin/migrate-to-neon.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';

const oldPool = new Pool({
  connectionString: process.env.OLD_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

const newPool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

// Remap deprecated BusinessStatus enum values that were removed from schema
const STATUS_MAP: Record<string, string> = {
  QUALIFIED: 'MEETING',
  INTERESTED: 'REPLIED',
  CUSTOMER: 'WON',
  ARCHIVED: 'SKIPPED',
};

async function copyTable(
  tableName: string,
  orderBy: string = 'created_at',
  transform?: (row: Record<string, unknown>) => Record<string, unknown>
) {
  process.stdout.write(`   Copying ${tableName}...`);
  const { rows } = await oldPool.query(`SELECT * FROM "${tableName}" ORDER BY ${orderBy} ASC`);
  if (rows.length === 0) {
    console.log(` ⏭️  0 rows (skipped)`);
    return 0;
  }

  const processedRows = transform ? rows.map(transform) : rows;
  const columns = Object.keys(processedRows[0]);
  const BATCH = 100;
  let inserted = 0;

  for (let i = 0; i < processedRows.length; i += BATCH) {
    const batch = processedRows.slice(i, i + BATCH);
    const placeholders = batch.map((_, rowIdx) =>
      `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ')})`
    ).join(', ');

    const values = batch.flatMap(row => columns.map(col => row[col]));
    const colNames = columns.map(c => `"${c}"`).join(', ');

    await newPool.query(
      `INSERT INTO "${tableName}" (${colNames}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      values
    );
    inserted += batch.length;
    process.stdout.write(`\r   Copying ${tableName}... ${inserted}/${processedRows.length}`);
  }

  console.log(`\r   ✅ ${tableName}: ${inserted} rows copied`);
  return inserted;
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   SCRAPE WORLD — SUPABASE → NEON MIGRATION  ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Verify connections
  console.log('🔌 Verifying connections...');
  await oldPool.query('SELECT 1');
  console.log('   ✅ Old Supabase: connected');
  await newPool.query('SELECT 1');
  console.log('   ✅ New Neon: connected\n');

  // ── Migrate in dependency order ──────────────────────────────
  console.log('📦 Migrating tables (in dependency order):\n');

  // No dependencies
  await copyTable('collection', 'created_at');
  await copyTable('pipeline', 'created_at');

  // Business — remap deprecated status enum values
  await copyTable('business', 'created_at', (row) => ({
    ...row,
    status: STATUS_MAP[row.status as string] ?? row.status,
  }));

  // Depends on business
  await copyTable('website', 'created_at');
  await copyTable('social_profile', 'created_at');
  await copyTable('business_contact', 'created_at');
  await copyTable('ai_report', 'generated_at');
  await copyTable('lead_intelligence', 'last_calculated_at');
  await copyTable('opportunity', 'created_at');
  await copyTable('task', 'created_at');
  await copyTable('note', 'created_at');

  // Depends on business x2
  await copyTable('competitor', 'created_at');

  // Depends on business + competitor
  await copyTable('competitor_analysis', 'created_at');

  // Depends on business + pipeline
  await copyTable('deal', 'created_at');

  // These were wiped in cleanup — will be 0 rows
  await copyTable('website_issue', 'created_at');
  await copyTable('activity', 'created_at');
  await copyTable('scrape_result', 'created_at');

  // ── Verify on Neon ────────────────────────────────────────────
  console.log('\n📊 Verifying row counts on Neon:');
  const tables = [
    'business', 'website', 'social_profile', 'business_contact',
    'competitor', 'lead_intelligence', 'opportunity', 'deal', 'task', 'note',
    'collection', 'pipeline',
  ];
  for (const t of tables) {
    const { rows } = await newPool.query(`SELECT COUNT(*) FROM "${t}"`);
    console.log(`   ${t}: ${rows[0].count} rows`);
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║             MIGRATION COMPLETE ✅            ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('\n   Your app is now fully on Neon.');
  console.log('   No egress limits. No billing surprises.\n');
}

main()
  .catch(err => { console.error('\n❌ Migration failed:', err); process.exit(1); })
  .finally(async () => {
    await oldPool.end();
    await newPool.end();
  });
