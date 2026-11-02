import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CRMService } from '@/services/CRMService';
import { z } from 'zod';

const crmService = new CRMService();

const updateDealSchema = z.object({
  pipelineId: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
  value: z.number().positive().optional(),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  outreachChannel: z.enum(['EMAIL', 'WHATSAPP', 'PHONE', 'LINKEDIN', 'INSTAGRAM']).optional().nullable(),
  outreachOutcome: z.enum(['NONE', 'NO_RESPONSE', 'INTERESTED', 'NOT_INTERESTED']).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deal = await prisma.deal.findUnique({
      where: { id },
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
    });

    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deal,
    });
  } catch (error: any) {
    console.error(`API Error in GET /api/deals/${id}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const validated = updateDealSchema.parse(body);

    const updateData: any = {};
    if (validated.pipelineId !== undefined) updateData.pipelineId = validated.pipelineId;
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.value !== undefined) updateData.value = validated.value;
    if (validated.expectedCloseDate !== undefined) {
      updateData.expectedCloseDate = validated.expectedCloseDate ? new Date(validated.expectedCloseDate) : null;
    }
    if (validated.outreachChannel !== undefined) updateData.outreachChannel = validated.outreachChannel;
    if (validated.outreachOutcome !== undefined) updateData.outreachOutcome = validated.outreachOutcome;

    const deal = await crmService.updateDeal(id, updateData);

    return NextResponse.json({
      success: true,
      message: 'Deal updated successfully',
      deal,
    });
  } catch (error: any) {
    console.error(`API Error in PATCH /api/deals/${id}:`, error);
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const existing = await prisma.deal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    await prisma.deal.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Deal deleted successfully',
    });
  } catch (error: any) {
    console.error(`API Error in DELETE /api/deals/${id}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

