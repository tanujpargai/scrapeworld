import { Queue } from 'bullmq';
import redisConnection from '@/lib/redis';

// Lazy queue singleton — only instantiated on first call, not at module load.
// Prevents Vercel build-time Redis connection errors.
let _gmapsQueue: Queue | null = null;

export function getGmapsQueue(): Queue {
  if (!_gmapsQueue) {
    _gmapsQueue = new Queue('gmaps-scrape', {
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
  return _gmapsQueue;
}

// Legacy named export for backwards compatibility — resolves lazily
export const gmapsQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    return (getGmapsQueue() as any)[prop];
  },
});
