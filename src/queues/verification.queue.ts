import { Queue } from 'bullmq';
import redisConnection from '@/lib/redis';

function makeQueue(name: string): Queue {
  return new Queue(name, {
    connection: redisConnection as any,
    skipVersionCheck: true,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
}

let _verificationQueue: Queue | null = null;
let _ownerDiscoveryQueue: Queue | null = null;
let _socialDiscoveryQueue: Queue | null = null;

export function getVerificationQueue(): Queue {
  if (!_verificationQueue) _verificationQueue = makeQueue('website-verification');
  return _verificationQueue;
}

export function getOwnerDiscoveryQueue(): Queue {
  if (!_ownerDiscoveryQueue) _ownerDiscoveryQueue = makeQueue('owner-discovery');
  return _ownerDiscoveryQueue;
}

export function getSocialDiscoveryQueue(): Queue {
  if (!_socialDiscoveryQueue) _socialDiscoveryQueue = makeQueue('social-discovery');
  return _socialDiscoveryQueue;
}

export const websiteVerificationQueue = new Proxy({} as Queue, {
  get(_target, prop) { return (getVerificationQueue() as any)[prop]; },
});

export const ownerDiscoveryQueue = new Proxy({} as Queue, {
  get(_target, prop) { return (getOwnerDiscoveryQueue() as any)[prop]; },
});

export const socialDiscoveryQueue = new Proxy({} as Queue, {
  get(_target, prop) { return (getSocialDiscoveryQueue() as any)[prop]; },
});
