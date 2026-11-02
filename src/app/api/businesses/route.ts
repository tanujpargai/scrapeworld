import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const industry = searchParams.get('industry') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Prisma.BusinessWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (industry) {
      where.industry = { contains: industry, mode: 'insensitive' };
    }

    const [businesses, totalCount] = await Promise.all([
      prisma.business.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          leadIntelligence: {
            select: {
              leadScore: true,
              leadTier: true,
              salesReadinessScore: true,
              salesReadinessTier: true,
              reachabilityScore: true,
              contactabilityTier: true,
            },
          },
          websiteData: {
            select: {
              overallScore: true,
              seoScore: true,
              securityScore: true,
              performanceScore: true,
              lastScanAt: true,
            },
          },
        },
      }),
      prisma.business.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      businesses,
      totalCount,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Businesses API GET error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
}
