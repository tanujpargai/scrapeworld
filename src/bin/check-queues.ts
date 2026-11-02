import 'dotenv/config';
import { websiteVerificationQueue, ownerDiscoveryQueue, socialDiscoveryQueue } from '../queues/verification.queue';

async function main() {
  const wVerify = await websiteVerificationQueue.getWaitingCount() + await websiteVerificationQueue.getActiveCount();
  const wOwner = await ownerDiscoveryQueue.getWaitingCount() + await ownerDiscoveryQueue.getActiveCount();
  const wSocial = await socialDiscoveryQueue.getWaitingCount() + await socialDiscoveryQueue.getActiveCount();
  const totalPending = wVerify + wOwner + wSocial;

  console.log(`=== QUEUE SIZES ===`);
  console.log(`- Website Verification Q: ${wVerify}`);
  console.log(`- Owner Discovery Q:       ${wOwner}`);
  console.log(`- Social Discovery Q:      ${wSocial}`);
  console.log(`- Total Pending:           ${totalPending}`);
}

main().finally(() => process.exit(0));
