import EmbeddedPostgres from 'embedded-postgres';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const dbDir = path.join(process.cwd(), 'data', 'postgres');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`[Local DB] Initializing embedded Postgres in ${dbDir}...`);

  const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: true,
    autoRehydrateSymlinks: true,
    initdbFlags: ['-E', 'UTF8', '--locale=C'],
  });

  try {
    await pg.initialise();
    console.log('[Local DB] Cluster initialized.');
  } catch (err: any) {
    console.log('[Local DB] Cluster already initialized or initialization info:', err?.message || err);
  }

  console.log('[Local DB] Starting PostgreSQL server on localhost:5432...');
  await pg.start();
  console.log('[Local DB] PostgreSQL server is RUNNING on localhost:5432!');

  try {
    await pg.createDatabase('scrapeworld');
    console.log('[Local DB] Database "scrapeworld" ready.');
  } catch (err: any) {
    console.log('[Local DB] Database "scrapeworld" exists or verified.');
  }

  // Keep process alive
  console.log('[Local DB] Ready for connections. Press Ctrl+C to stop.');
  process.on('SIGINT', async () => {
    console.log('[Local DB] Stopping Postgres...');
    await pg.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    console.log('[Local DB] Stopping Postgres...');
    await pg.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[Local DB] Failed to start local database:', err);
  process.exit(1);
});
