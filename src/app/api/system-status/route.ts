import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import redisConnection from '@/lib/redis';
import { websiteVerificationQueue, ownerDiscoveryQueue, socialDiscoveryQueue } from '@/queues/verification.queue';
import { auditQueue } from '@/queues/audit.queue';
import { aiQueue } from '@/queues/ai.queue';

// Optional: import gmaps queue if it exists
let gmapsQueue: any = null;
try {
  const gQueueModule = require('@/queues/gmaps.queue');
  gmapsQueue = gQueueModule.gmapsQueue;
} catch (e) {
  // ignore
}

export async function GET() {
  try {
    // 1. Database Check
    let dbStatus = 'Disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'Connected';
    } catch (e) {
      dbStatus = 'Error';
    }

    let redisStatus = 'Disconnected';
    try {
      const pingPromise = redisConnection.ping();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ping timeout')), 2000));
      const ping = await Promise.race([pingPromise, timeoutPromise]);
      
      if (ping === 'PONG') {
        redisStatus = 'Connected';
      }
    } catch (e: any) {
      console.error('Redis Ping Error:', e.message);
      redisStatus = 'Error';
    }

    // 3. Queue counts
    const getQueueCounts = async (queue: any) => {
      if (!queue || redisStatus !== 'Connected') return { waiting: 0, active: 0, completed: 0, failed: 0, total: 0 };
      try {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);
        return {
          waiting,
          active,
          completed,
          failed,
          total: waiting + active,
        };
      } catch (err) {
        return { waiting: 0, active: 0, completed: 0, failed: 0, total: 0 };
      }
    };

    const [
      verificationCounts,
      ownerCounts,
      socialCounts,
      auditCounts,
      aiCounts,
      gmapsCounts,
    ] = await Promise.all([
      getQueueCounts(websiteVerificationQueue),
      getQueueCounts(ownerDiscoveryQueue),
      getQueueCounts(socialDiscoveryQueue),
      getQueueCounts(auditQueue),
      getQueueCounts(aiQueue),
      getQueueCounts(gmapsQueue),
    ]);

    const totalQueuePending = 
      verificationCounts.total + 
      ownerCounts.total + 
      socialCounts.total + 
      auditCounts.total + 
      aiCounts.total + 
      gmapsCounts.total;

    // 4. Database Counts
    const [
      businessCount,
      auditCount,
      leadCount,
      opportunityCount,
      dealCount,
      taskCount,
      collectionCount,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.website.count(),
      prisma.leadIntelligence.count(),
      prisma.opportunity.count(),
      prisma.deal.count(),
      prisma.task.count(),
      prisma.collection.count(),
    ]);

    return NextResponse.json({
      success: true,
      health: {
        database: dbStatus,
        redis: redisStatus,
        worker: redisStatus === 'Connected' ? 'Active' : 'Offline',
      },
      counts: {
        businesses: businessCount,
        audits: auditCount,
        leads: leadCount,
        opportunities: opportunityCount,
        deals: dealCount,
        tasks: taskCount,
        searchJobs: collectionCount,
      },
      queues: {
        totalPending: totalQueuePending,
        verification: verificationCounts,
        owner: ownerCounts,
        social: socialCounts,
        audit: auditCounts,
        ai: aiCounts,
        gmaps: gmapsCounts,
      },
    });
  } catch (error: any) {
    console.error('System status API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
}
