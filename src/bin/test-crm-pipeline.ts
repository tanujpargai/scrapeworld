import 'dotenv/config';
import prisma from '../lib/prisma';
import { CRMService } from '../services/CRMService';
import { LeadIntelligenceService } from '../services/LeadIntelligenceService';
import { TaskStatus } from '@prisma/client';

const crmService = new CRMService();
const leadIntelService = new LeadIntelligenceService();

async function main() {
  console.log('=== Starting CRM Lifecycle Integration Test ===');

  // 1. Seed Pipeline Stages
  console.log('\nStep 1: Seeding default pipeline stages...');
  const stages = await crmService.seedDefaultStages();
  console.log(`Seeded/verified ${stages.length} pipeline stages:`);
  stages.forEach(s => console.log(`  - [${s.position}] ${s.name} (ID: ${s.id})`));

  // 2. Fetch a Real Business
  console.log('\nStep 2: Selecting a real business for the test...');
  const business = await prisma.business.findFirst({
    where: {
      website: { not: null },
    },
  });

  if (!business) {
    console.error('FAIL: No business with a website was found in the database. Please run discovery first.');
    process.exit(1);
  }
  console.log(`Selected Business: "${business.name}" (ID: ${business.id})`);

  // 3. Compute/Sync Lead Intelligence for this business
  console.log('\nStep 3: Calculating and ranking Lead Intelligence...');
  const leadIntel = await leadIntelService.processAndRank(business.id);
  console.log('Lead Intelligence metrics:');
  console.log(`  - Lead Score: ${leadIntel.leadScore}`);
  console.log(`  - Lead Tier: ${leadIntel.leadTier}`);
  console.log(`✅  Score: ${leadIntel.opportunityScore || 0}/100 | Buyer Prob: ${leadIntel.buyerProbability || 0}%`);
  console.log(`  - Estimated Deal Value: $${leadIntel.estimatedDealValue}`);

  // 4. Auto-generate Deal from Lead
  console.log('\nStep 4: Auto-creating Deal and Tasks from Lead...');
  const deal = await crmService.createFromLead(business.id);
  console.log(`Deal Created: "${deal.title}"`);
  console.log(`  - Deal Value: $${deal.value}`);
  console.log(`  - Deal Probability (Adjusted Win Confidence): ${deal.probability}%`);
  console.log(`  - Deal Status: ${deal.status}`);

  // Find generated task
  const task = await prisma.task.findFirst({
    where: { businessId: business.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!task) {
    throw new Error('FAIL: Auto-generated task was not found');
  }
  console.log(`Task Created: "${task.title}"`);
  console.log(`  - Priority: ${task.priority}`);
  console.log(`  - Status: ${task.status}`);

  // Verify initial adjusted win confidence calculation:
  // Stage Probability (NEW) = 10
  // Buyer Probability = leadIntel.buyerProbability
  // winConfidence = Math.round((10 + buyerProbability) / 2)
  const expectedNewProb = Math.round((10 + (leadIntel.buyerProbability || 0)) / 2);
  console.log(`Verifying Initial Probability: Expected = ${expectedNewProb}%, Actual = ${deal.probability}%`);
  if (deal.probability !== expectedNewProb) {
    throw new Error(`FAIL: Initial probability calculation incorrect. Expected ${expectedNewProb}, got ${deal.probability}`);
  }

  // 5. Move Deal to PROPOSAL Stage
  console.log('\nStep 5: Moving deal to PROPOSAL stage...');
  const proposalStage = stages.find(s => s.name === 'PROPOSAL');
  if (!proposalStage) throw new Error('PROPOSAL stage not found');

  const updatedDeal = await crmService.updateDeal(deal.id, {
    pipelineId: proposalStage.id,
    value: 5000.0, // Update deal value as well
  });

  console.log(`Deal Moved to "${proposalStage.name}":`);
  console.log(`  - Updated Value: $${updatedDeal.value}`);
  console.log(`  - Updated Probability: ${updatedDeal.probability}%`);
  console.log(`  - Updated Status: ${updatedDeal.status}`);

  // Verify updated win confidence calculation:
  // Stage Probability (PROPOSAL) = 70
  // Buyer Probability = leadIntel.buyerProbability
  // winConfidence = Math.round((70 + buyerProbability) / 2)
  const expectedProposalProb = Math.round((70 + (leadIntel.buyerProbability || 0)) / 2);
  console.log(`Verifying Proposal Probability: Expected = ${expectedProposalProb}%, Actual = ${updatedDeal.probability}%`);
  if (updatedDeal.probability !== expectedProposalProb) {
    throw new Error(`FAIL: Proposal probability calculation incorrect. Expected ${expectedProposalProb}, got ${updatedDeal.probability}`);
  }

  // 6. Complete Follow-Up Task
  console.log('\nStep 6: Completing follow-up task...');
  const completedTask = await crmService.completeTask(task.id);
  console.log(`Task Completed: "${completedTask.title}"`);
  console.log(`  - Status: ${completedTask.status}`);
  console.log(`  - Completed At: ${completedTask.completedAt}`);
  if (completedTask.status !== TaskStatus.DONE) {
    throw new Error('FAIL: Task status was not updated to DONE');
  }

  // 7. Move Deal to WON Stage
  console.log('\nStep 7: Moving deal to WON stage (closing deal)...');
  const wonStage = stages.find(s => s.name === 'WON');
  if (!wonStage) throw new Error('WON stage not found');

  const wonDeal = await crmService.updateDeal(deal.id, {
    pipelineId: wonStage.id,
  });

  console.log(`Deal Moved to "${wonStage.name}":`);
  console.log(`  - Final Probability: ${wonDeal.probability}%`);
  console.log(`  - Final Status: ${wonDeal.status}`);
  if (wonDeal.probability !== 100 || wonDeal.status !== 'WON') {
    throw new Error('FAIL: Won deal probability should be 100% and status should be WON');
  }

  // 8. Verify Activity Logs
  console.log('\nStep 8: Verifying CRM Activity Timeline Logs...');
  const activities = await prisma.activity.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Found ${activities.length} recent activities for this business:`);
  activities.forEach(act => {
    console.log(`  - [${act.createdAt.toISOString()}] ${act.type}:`, JSON.stringify(act.metadata));
  });

  const activityTypes = activities.map(a => a.type);
  const requiredTypes = ['DEAL_CREATED', 'TASK_CREATED', 'DEAL_UPDATED', 'TASK_COMPLETED'];
  
  for (const req of requiredTypes) {
    if (!activityTypes.includes(req as any)) {
      throw new Error(`FAIL: Activity log missing event type "${req}"`);
    }
  }
  console.log('SUCCESS: All required activity log types are present.');

  // 9. Database Cleanup
  console.log('\nStep 9: Cleaning up test data from database...');
  await prisma.task.delete({ where: { id: task.id } });
  await prisma.deal.delete({ where: { id: deal.id } });
  console.log('Cleaned up Deal and Task records successfully.');

  console.log('\n=== INTEGRATION TEST PASSED SUCCESSFULLY! ===');
}

main()
  .catch(err => {
    console.error('\nFAIL: CRM Lifecycle Integration Test encountered an error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
