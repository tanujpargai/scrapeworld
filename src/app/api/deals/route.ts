import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CRMService } from '@/services/CRMService';
import { z } from 'zod';

const crmService = new CRMService();

const createDealSchema = z.object({
  businessId: z.string().uuid(),
  pipelineId: z.string().uuid(),
  title: z.string().min(1),
  value: z.number().positive().optional(),
});

export async function GET() {
  try {
    const deals = await prisma.deal.findMany({
      include: {
        pipeline: true,
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
                reasonToBuyScore: true,
                estimatedDealValue: true,
                leadSummary: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      deals,
    });
  } catch (error: any) {
    console.error('API Error in GET /api/deals:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = createDealSchema.parse(body);

    const deal = await crmService.createDeal(
      validated.businessId,
      validated.pipelineId,
      validated.title,
      validated.value
    );

    return NextResponse.json({
      success: true,
      message: 'Deal created successfully',
      deal,
    });
  } catch (error: any) {
    console.error('API Error in POST /api/deals:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
