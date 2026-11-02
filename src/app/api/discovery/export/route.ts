import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper to escape CSV cell values
function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Replace newlines with spaces
  str = str.replace(/[\r\n]+/g, ' ');
  // If double quotes, escape them
  if (str.includes('"') || str.includes(',') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get('collectionId');
    const type = searchParams.get('type') || (collectionId ? 'collection' : 'leads');
    const format = searchParams.get('format') || 'csv';

    let data: any[] = [];
    let filename = 'export';

    if (type === 'collection') {
      if (!collectionId) {
        return NextResponse.json({ success: false, error: 'collectionId is required' }, { status: 400 });
      }
      const collection = await prisma.collection.findUnique({
        where: { id: collectionId },
      });
      if (!collection) {
        return NextResponse.json({ success: false, error: 'Collection not found' }, { status: 404 });
      }
      filename = `collection-${collection.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${collection.location.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      
      data = await prisma.business.findMany({
        where: { collectionId },
        include: {
          leadIntelligence: true,
          socialProfiles: true,
          opportunities: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (type === 'leads') {
      filename = 'all-leads';
      data = await prisma.business.findMany({
        include: {
          leadIntelligence: true,
          socialProfiles: true,
          opportunities: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (type === 'top-leads') {
      filename = 'top-leads';
      data = await prisma.business.findMany({
        where: {
          leadIntelligence: {
            leadScore: { gte: 70 },
          },
        },
        include: {
          leadIntelligence: true,
          socialProfiles: true,
          opportunities: true,
        },
        orderBy: {
          leadIntelligence: {
            leadScore: 'desc',
          },
        },
      });
    } else if (type === 'crm') {
      filename = 'crm-deals';
      const deals = await prisma.deal.findMany({
        include: {
          pipeline: true,
          business: {
            include: {
              leadIntelligence: true,
              socialProfiles: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Flatten CRM deals data for tabular format
      data = deals.map(deal => ({
        dealId: deal.id,
        dealTitle: deal.title,
        dealValue: deal.value,
        dealStatus: deal.status,
        pipelineStage: deal.pipeline.name,
        expectedCloseDate: deal.expectedCloseDate,
        dealCreatedAt: deal.createdAt,
        ...deal.business,
      }));
    } else {
      return NextResponse.json({ success: false, error: 'Invalid export type' }, { status: 400 });
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      });
    }

    // CSV format output
    const headers = [
      'Name',
      'Website',
      'Verified Website',
      'Phone',
      'Email',
      'Rating',
      'Review Count',
      'Industry',
      'Address',
      'City',
      'State',
      'Country',
      'Lead Score',
      'Lead Tier',
      'Sales Readiness Score',
      'Sales Readiness Tier',
      'Reachability Score',
      'Contactability Tier',
      'Buying Intent',
      'Sales Confidence',
      'Owner Name',
      'Owner Role',
      'Owner Email',
      'Owner Phone',
      'Facebook URL',
      'Instagram URL',
      'LinkedIn URL',
      'YouTube URL',
      'Twitter URL',
      'TikTok URL',
      'Opportunities Count',
    ];

    if (type === 'crm') {
      headers.unshift('Deal Title', 'Deal Value', 'Deal Status', 'Pipeline Stage', 'Expected Close Date');
    }

    const allRows = [headers];

    for (const item of data) {
      const biz = type === 'crm' ? item : item;
      
      const getSocialUrl = (platform: string) => {
        const profile = biz.socialProfiles?.find((p: any) => p.platform === platform);
        return profile ? profile.url : '';
      };

      const lineValues: any[] = [];

      if (type === 'crm') {
        lineValues.push(
          item.dealTitle,
          item.dealValue,
          item.dealStatus,
          item.pipelineStage,
          item.expectedCloseDate ? new Date(item.expectedCloseDate).toLocaleDateString() : ''
        );
      }

      lineValues.push(
        biz.name,
        biz.website,
        biz.verifiedWebsite,
        biz.phone,
        biz.email,
        biz.rating,
        biz.reviewCount,
        biz.industry,
        biz.address,
        biz.city,
        biz.state,
        biz.country,
        biz.leadIntelligence?.leadScore,
        biz.leadIntelligence?.leadTier,
        biz.leadIntelligence?.salesReadinessScore,
        biz.leadIntelligence?.salesReadinessTier,
        biz.leadIntelligence?.reachabilityScore,
        biz.leadIntelligence?.contactabilityTier,
        biz.leadIntelligence?.buyingIntent,
        biz.leadIntelligence?.salesConfidence,
        biz.ownerName,
        biz.ownerRole,
        biz.ownerEmail,
        biz.ownerPhone,
        getSocialUrl('FACEBOOK'),
        getSocialUrl('INSTAGRAM'),
        getSocialUrl('LINKEDIN'),
        getSocialUrl('YOUTUBE'),
        getSocialUrl('TWITTER'),
        getSocialUrl('TIKTOK'),
        biz.opportunities?.length || 0
      );

      allRows.push(lineValues);
    }

    if (format === 'xlsx') {
      const xlsx = await import('xlsx');
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet(allRows);
      xlsx.utils.book_append_sheet(wb, ws, 'Leads');
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    // CSV format output
    const csvContent = allRows.map(row => row.map(escapeCSVValue).join(',')).join('\n');
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });

  } catch (error: any) {
    console.error('Export API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
