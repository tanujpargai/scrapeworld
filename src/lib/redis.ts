import Redis from 'ioredis';

// Lazy Redis factory — does NOT connect at module load time.
// This prevents Vercel build-time failures since Redis doesn't exist during `next build`.
function createRedisClient() {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
    lazyConnect: true,          // Do NOT connect until first command
    enableOfflineQueue: false,  // Fail fast instead of queuing offline commands
  });

  client.on('error', (err) => {
    // Suppress connection errors during build — worker processes handle reconnection
    if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error('[Redis] Connection error:', err.message);
    }
  });

  return client;
}

declare const globalThis: {
  redisGlobal: ReturnType<typeof createRedisClient> | undefined;
} & typeof global;

// Reuse singleton in dev (hot reload), create fresh in prod
const redisConnection = globalThis.redisGlobal ?? createRedisClient();

export default redisConnection;

if (process.env.NODE_ENV !== 'production') {
  globalThis.redisGlobal = redisConnection;
}
