import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, ServiceType, TaskPriority, OpportunityStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get('service') as ServiceType | null;
    const priority = searchParams.get('priority') as TaskPriority | null;
    const industry = searchParams.get('industry') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filters
    const where: Prisma.OpportunityWhereInput = {
      status: OpportunityStatus.OPEN,
    };

    if (serviceType) {
      where.serviceType = serviceType;
    }

    if (priority) {
      where.priority = priority;
    }

    if (industry) {
      where.business = {
        industry: { contains: industry, mode: 'insensitive' },
      };
    }

    const [opportunities, totalCount] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        orderBy: { estimatedValue: 'desc' }, // default sort by value desc
        skip: offset,
        take: limit,
        include: {
          business: {
            include: {
              leadIntelligence: {
                select: {
                  leadScore: true,
                  leadTier: true,
                },
              },
            },
          },
        },
      }),
      prisma.opportunity.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      opportunities,
      totalCount,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Opportunities list API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
}
