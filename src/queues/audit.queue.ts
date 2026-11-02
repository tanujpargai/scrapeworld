import { Queue } from 'bullmq';
import redisConnection from '@/lib/redis';

let _auditQueue: Queue | null = null;

export function getAuditQueue(): Queue {
  if (!_auditQueue) {
    _auditQueue = new Queue('website-audit', {
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
  return _auditQueue;
}

export const auditQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    return (getAuditQueue() as any)[prop];
  },
});
