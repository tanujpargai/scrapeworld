import { NextRequest, NextResponse } from 'next/server';
import { leadManagementRepository } from '@/repositories/LeadManagementRepository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const idsParam = searchParams.get('ids');
    const qualifiedOnly = searchParams.get('qualifiedOnly') === 'true';

    const ids = idsParam ? idsParam.split(',').filter(Boolean) : undefined;

    if (format === 'json') {
      const data = await leadManagementRepository.exportLeadsToJson(ids, qualifiedOnly);
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="leads-export-${Date.now()}.json"`,
        },
      });
    }

    // Default to CSV
    const csvContent = await leadManagementRepository.exportLeadsToCsv(ids, qualifiedOnly);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads-export-${Date.now()}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting leads:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}
