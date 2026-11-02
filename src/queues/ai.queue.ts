import { Queue } from 'bullmq';
import redisConnection from '@/lib/redis';

let _aiQueue: Queue | null = null;

export function getAiQueue(): Queue {
  if (!_aiQueue) {
    _aiQueue = new Queue('ai-analysis', {
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
  return _aiQueue;
}

export const aiQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    return (getAiQueue() as any)[prop];
  },
});
