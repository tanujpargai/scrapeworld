import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CRMService } from '@/services/CRMService';

const crmService = new CRMService();

export async function GET() {
  try {
    // Seed stages if none exist
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
                website: true,
                phone: true,
                email: true,
                industry: true,
                leadIntelligence: {
                  select: {
                    leadScore: true,
                    leadTier: true,
                    urgencyScore: true,
                    buyerProbability: true,
                    reasonToBuyScore: true,
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

    return NextResponse.json({
      success: true,
      pipeline,
    });
  } catch (error: any) {
    console.error('API Error in GET /api/crm/pipeline:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const stages = await crmService.seedDefaultStages();
    return NextResponse.json({
      success: true,
      message: 'Default pipeline stages seeded successfully',
      stages,
    });
  } catch (error: any) {
    console.error('API Error in POST /api/crm/pipeline:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
