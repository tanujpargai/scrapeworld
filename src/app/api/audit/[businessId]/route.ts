import { NextResponse } from 'next/server';
import { WebsiteRepository } from '@/repositories/WebsiteRepository';
import { auditQueue } from '@/queues/audit.queue';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const auditPostSchema = z.object({
  mode: z.enum(['FAST', 'FULL']).default('FAST'),
});

const websiteRepo = new WebsiteRepository();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;
    const website = await websiteRepo.findByBusinessId(businessId);
    
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website audit not found for this business' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      website,
    });
  } catch (error) {
    console.error('API Error in audit GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    if (!business.website) {
      return NextResponse.json(
        { success: false, error: 'Business has no website associated with it' },
        { status: 400 }
      );
    }

    let mode = 'FAST';
    try {
      const body = await request.json();
      const validated = auditPostSchema.parse(body);
      mode = validated.mode;
    } catch (e) {
      // Empty body fallback to default FAST
    }

    const job = await auditQueue.add('audit-website', {
      businessId,
      websiteUrl: business.website,
      mode,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Website audit (${mode}) queued successfully`,
    });
  } catch (error) {
    console.error('API Error in audit POST:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
