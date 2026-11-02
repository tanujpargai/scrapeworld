import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const industry = searchParams.get('industry') || '';
    const tier = searchParams.get('tier') || '';
    const readiness = searchParams.get('readiness') || '';
    const reachability = searchParams.get('reachability') || '';
    const minDealValue = parseFloat(searchParams.get('minDealValue') || '0');
    const sort = searchParams.get('sort') || 'leadPriorityRank';
    const order = searchParams.get('order') || 'asc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filters
    const where: Prisma.LeadIntelligenceWhereInput = {};

    // Filter by estimated deal value
    if (minDealValue > 0) {
      where.estimatedDealValue = { gte: minDealValue };
    }

    // Filter by lead tier
    if (tier) {
      where.leadTier = tier;
    }

    // Filter by sales readiness tier
    if (readiness) {
      where.salesReadinessTier = readiness;
    }

    // Filter by contactability tier
    if (reachability) {
      where.contactabilityTier = reachability;
    }

    // Filter by nested business attributes
    const businessWhere: Prisma.BusinessWhereInput = {};
    let hasBusinessFilter = false;

    if (search) {
      businessWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
      hasBusinessFilter = true;
    }

    if (city) {
      businessWhere.city = { contains: city, mode: 'insensitive' };
      hasBusinessFilter = true;
    }

    if (industry) {
      businessWhere.industry = { contains: industry, mode: 'insensitive' };
      hasBusinessFilter = true;
    }

    if (hasBusinessFilter) {
      where.business = businessWhere;
    }

    // Dynamic Sort Order
    const orderBy: Prisma.LeadIntelligenceOrderByWithRelationInput = {};
    if (sort === 'leadScore') {
      orderBy.leadScore = order === 'desc' ? 'desc' : 'asc';
    } else if (sort === 'estimatedDealValue') {
      orderBy.estimatedDealValue = order === 'desc' ? 'desc' : 'asc';
    } else if (sort === 'salesReadinessScore') {
      orderBy.salesReadinessScore = order === 'desc' ? 'desc' : 'asc';
    } else if (sort === 'reachabilityScore') {
      orderBy.reachabilityScore = order === 'desc' ? 'desc' : 'asc';
    } else {
      // Default to leadPriorityRank
      orderBy.leadPriorityRank = order === 'desc' ? 'desc' : 'asc';
    }

    const [leads, totalCount] = await Promise.all([
      prisma.leadIntelligence.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          business: {
            include: {
              opportunities: true,
              socialProfiles: true,
            },
          },
        },
      }),
      prisma.leadIntelligence.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      leads,
      totalCount,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Leads list API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
}

// Bulk Actions: Export CSV or Create Deals
export async function POST(request: Request) {
  try {
    const { action, businessIds } = await request.json();

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Business IDs are required' }, { status: 400 });
    }

    const { CRMService } = await import('@/services/CRMService');
    const crmService = new CRMService();

    if (action === 'create-deals') {
      const deals = [];
      for (const bizId of businessIds) {
        try {
          const deal = await crmService.createFromLead(bizId);
          deals.push(deal);
        } catch (e: any) {
          console.warn(`Could not create deal for business ${bizId}: ${e.message}`);
        }
      }
      return NextResponse.json({
        success: true,
        message: `Successfully created ${deals.length} deals from selected leads.`,
        deals,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Leads bulk action error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
}
