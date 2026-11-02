import { Worker } from 'bullmq';
import redisConnection from '@/lib/redis';
import { AIService } from '@/services/AIService';
import { ReportType } from '@prisma/client';

const aiService = new AIService();

export const aiWorker = new Worker(
  'ai-analysis',
  async (job) => {
    const { businessId, reportType = ReportType.FULL_ANALYSIS } = job.data;
    console.log(`Starting AI analysis job ${job.id} for Business ${businessId} (${reportType})`);

    try {
      const report = await aiService.generateReport(businessId, reportType);
      console.log(`AI analysis job ${job.id} completed successfully for Business ${businessId}. Report ID: ${report.id}`);
      return { success: true, reportId: report.id };
    } catch (err: any) {
      console.error(`AI analysis failed for business ${businessId} (${reportType}):`, err);
      throw err; // Allow BullMQ to handle retry/fail logic
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 2, // Keep concurrency low to prevent hitting API rate limits
    skipVersionCheck: true,
  }
);
