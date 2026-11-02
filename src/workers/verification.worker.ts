import { Worker } from 'bullmq';
import redisConnection from '@/lib/redis';
import { WebsiteVerificationService } from '@/services/WebsiteVerificationService';
import { OwnerDiscoveryService } from '@/services/OwnerDiscoveryService';
import { SocialDiscoveryService } from '@/services/SocialDiscoveryService';
import { LeadValidationService } from '@/services/LeadValidationService';
import { LeadIntelligenceService } from '@/services/LeadIntelligenceService';
import { ownerDiscoveryQueue, socialDiscoveryQueue } from '@/queues/verification.queue';

const websiteVerificationService = new WebsiteVerificationService();
const ownerDiscoveryService = new OwnerDiscoveryService();
const socialDiscoveryService = new SocialDiscoveryService();
const leadValidationService = new LeadValidationService();
const leadIntelligenceService = new LeadIntelligenceService();

// 1. Website Verification Worker
export const websiteVerificationWorker = new Worker(
  'website-verification',
  async (job) => {
    const { businessId } = job.data;
    console.log(`[Worker] website-verification starting for Business ${businessId}`);
    
    // Run verification
    const { verifiedWebsite } = await websiteVerificationService.verifyWebsite(businessId);
    
    // Automatically run false positive checks
    await leadValidationService.validateLead(businessId);

    // Recalculate Lead Intelligence V2 scores for this business
    await leadIntelligenceService.calculateAndSave(businessId);

    // If website is verified or we finished checking, trigger owner and social discovery asynchronously
    await ownerDiscoveryQueue.add('discover-owner', { businessId });
    await socialDiscoveryQueue.add('discover-socials', { businessId });
    
    console.log(`[Worker] website-verification completed for Business ${businessId}. Triggered owner/social discovery.`);
  },
  {
    connection: redisConnection as any,
    concurrency: 5,
    skipVersionCheck: true,
  }
);

// 2. Owner Discovery Worker
export const ownerDiscoveryWorker = new Worker(
  'owner-discovery',
  async (job) => {
    const { businessId } = job.data;
    console.log(`[Worker] owner-discovery starting for Business ${businessId}`);
    
    await ownerDiscoveryService.discoverOwner(businessId);
    
    // Recalculate Lead Intelligence to incorporate owner stats
    await leadIntelligenceService.calculateAndSave(businessId);
    
    console.log(`[Worker] owner-discovery completed for Business ${businessId}`);
  },
  {
    connection: redisConnection as any,
    concurrency: 5,
    skipVersionCheck: true,
  }
);

// 3. Social Discovery Worker
export const socialDiscoveryWorker = new Worker(
  'social-discovery',
  async (job) => {
    const { businessId } = job.data;
    console.log(`[Worker] social-discovery starting for Business ${businessId}`);
    
    await socialDiscoveryService.discoverSocialProfiles(businessId);
    
    // Recalculate Lead Intelligence to incorporate social profile count
    await leadIntelligenceService.calculateAndSave(businessId);
    
    console.log(`[Worker] social-discovery completed for Business ${businessId}`);
  },
  {
    connection: redisConnection as any,
    concurrency: 5,
    skipVersionCheck: true,
  }
);
