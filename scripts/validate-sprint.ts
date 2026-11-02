import 'dotenv/config';
import prisma from '../src/lib/prisma';
import fs from 'fs';
import { SegmentationService } from '../src/services/SegmentationService';

async function runValidation() {
  console.log('--- Phase 3 to 8 Validation Sprint ---');
  
  let report = '# Production Validation Sprint Report\n\n';

  // Find recent collection
  const collection = await prisma.collection.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!collection) {
    console.error('No collections found. Run Phase 2 first.');
    return;
  }

  report += `## Phase 2: Discovery Engine\n`;
  report += `- **Collection ID**: ${collection.id}\n`;
  report += `- **Keywords**: ${collection.keywords.join(', ')}\n`;
  report += `- **Locations**: ${collection.locations.join(', ')}\n`;
  report += `- **Status**: ${collection.status}\n`;
  
  const leads = await prisma.business.findMany({
    where: { collectionId: collection.id },
    include: {
      leadIntelligence: true,
      opportunities: true,
      socialProfiles: true
    }
  });

  report += `- **Leads Scraped**: ${leads.length} / ${collection.targetCount || 300}\n\n`;

  // PHASE 3: WEBSITE INTELLIGENCE
  report += `## Phase 3: Website Intelligence\n`;
  const withWebsite = leads.filter(l => !!l.verifiedWebsite);
  const withAiAnalysis = leads.filter(l => l.leadIntelligence?.leadSummary);
  report += `- **Websites Extracted**: ${withWebsite.length} (${Math.round((withWebsite.length/leads.length)*100)}%)\n`;
  report += `- **AI Audits Completed**: ${withAiAnalysis.length} (${Math.round((withAiAnalysis.length/leads.length)*100)}%)\n\n`;

  // PHASE 4: LEAD INTELLIGENCE
  report += `## Phase 4: Lead Intelligence\n`;
  const scoredLeads = leads.filter(l => (l.leadIntelligence?.leadScore ?? 0) > 0);
  const readinessScored = leads.filter(l => (l.leadIntelligence?.salesReadinessScore ?? 0) > 0);
  report += `- **Scored Leads**: ${scoredLeads.length}\n`;
  report += `- **Sales Readiness Scored**: ${readinessScored.length}\n\n`;

  // PHASE 5: SEGMENTATION & OPPORTUNITIES
  report += `## Phase 5: Segmentation\n`;
  const segmented = leads.map(l => ({ ...l, segments: SegmentationService.getBusinessSegments(l) }));
  let segmentCounts: Record<string, number> = {};
  segmented.forEach(l => {
    l.segments.forEach(s => {
      segmentCounts[s] = (segmentCounts[s] || 0) + 1;
    });
  });
  Object.entries(segmentCounts).forEach(([segment, count]) => {
    report += `- **${segment}**: ${count} leads\n`;
  });
  report += '\n';

  // PHASE 6: CRM & OUTREACH
  report += `## Phase 6 & 7: CRM and Outreach Events\n`;
  const opportunities = await prisma.opportunity.findMany({
    where: { business: { collectionId: collection.id } }
  });
  report += `- **Opportunities Auto-created**: ${opportunities.length}\n`;
  
  if (opportunities.length > 0) {
    const opp = opportunities[0];
    const pipeline = await prisma.pipeline.findFirst();
    if (pipeline) {
      const deal = await prisma.deal.create({
        data: {
          businessId: opp.businessId,
          pipelineId: pipeline.id,
          title: `Deal for ${opp.title}`,
          status: 'CONTACTED',
          outreachOutcome: 'NONE'
        }
      });
      const event = await prisma.task.create({
        data: {
          businessId: opp.businessId,
          title: 'Outreach Test',
          description: 'Sent email sequence',
          priority: 'HIGH',
          status: 'DONE',
          dueDate: new Date()
        }
      });
      report += `- **Test Outreach Event Created**: ${event.id}\n`;
      report += `- **CRM Deal Created**: ${deal.id} (Status: CONTACTED)\n\n`;
    }
  }

  fs.writeFileSync('C:\\Users\\Aryan\\.gemini\\antigravity-ide\\brain\\f0d3b0e5-6bb0-4ece-b62d-3305316c5ea6\\validation-sprint-report.md', report);
  console.log('Sprint validation report saved.');
}

runValidation()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
