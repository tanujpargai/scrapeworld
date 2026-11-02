import 'dotenv/config';
import { gmapsWorker } from '../workers/gmaps.worker';
import { auditWorker } from '../workers/audit.worker';
import { aiWorker } from '../workers/ai.worker';
import {
  websiteVerificationWorker,
  ownerDiscoveryWorker,
  socialDiscoveryWorker,
} from '../workers/verification.worker';

console.log('BullMQ Scraping & Verification Workers started successfully and listening on Redis...');

process.on('SIGTERM', async () => {
  console.log('Stopping workers...');
  await gmapsWorker.close();
  await auditWorker.close();
  await aiWorker.close();
  await websiteVerificationWorker.close();
  await ownerDiscoveryWorker.close();
  await socialDiscoveryWorker.close();
  process.exit(0);
});


