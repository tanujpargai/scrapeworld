import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CRMService } from '@/services/CRMService';
import { TaskStatus } from '@prisma/client';

const crmService = new CRMService();

export async function GET() {
  try {
    // 1. Top Leads (ordered by leadPriorityRank)
    const topLeads = await prisma.leadIntelligence.findMany({
      orderBy: { leadPriorityRank: 'asc' },
      take: 10,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            industry: true,
            website: true,
            opportunities: {
              select: {
                serviceType: true,
              },
            },
          },
        },
      },
    });

    const formattedLeads = topLeads.map(lead => {
      const biz = lead.business;
      const recommendedServices = biz.opportunities.map(o => o.serviceType);
      
      let reasonToBuy = lead.leadSummary || '';
      if (!reasonToBuy && lead.leadScore >= 75) {
        reasonToBuy = `Needs digital optimization. Current lead score is ${lead.leadScore}/100 and tier is ${lead.leadTier}.`;
      }

      return {
        id: lead.id,
        businessId: lead.businessId,
        businessName: biz.name,
        industry: biz.industry,
        website: biz.website,
        leadScore: lead.leadScore,
        leadTier: lead.leadTier,
        urgencyScore: lead.urgencyScore,
        buyerProbability: lead.buyerProbability,
        reasonToBuy,
        revenuePotential: lead.revenuePotential,
        estimatedDealValue: lead.estimatedDealValue,
        leadPriorityRank: lead.leadPriorityRank,
        recommendedServices,
      };
    });

    // 2. Pipeline Stages with Deals (Kanban layout)
    const stagesCount = await prisma.pipeline.count();
    if (stagesCount === 0) {
      await crmService.seedDefaultStages();
    }

    const pipeline = await prisma.pipeline.findMany({
      orderBy: { position: 'asc' },
      include: {
        deals: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                leadIntelligence: {
                  select: {
                    leadScore: true,
                    leadTier: true,
                    urgencyScore: true,
                    buyerProbability: true,
                    estimatedDealValue: true,
                    leadSummary: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // 3. Today's Active Tasks
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todaysTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          lte: todayEnd,
        },
        status: {
          not: TaskStatus.DONE,
        },
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { priority: 'desc' },
      ],
    });

    // 4. Recent Opportunities
    const recentOpportunities = await prisma.opportunity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            leadIntelligence: {
              select: {
                leadScore: true,
                leadTier: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        topLeads: formattedLeads,
        pipeline,
        todaysTasks,
        recentOpportunities,
      },
    });
  } catch (error: any) {
    console.error('API Error in GET /api/crm/dashboard:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
