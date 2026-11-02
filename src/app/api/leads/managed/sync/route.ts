import { NextRequest, NextResponse } from 'next/server';
import { leadManagementRepository } from '@/repositories/LeadManagementRepository';

export async function POST(request: NextRequest) {
  try {
    const result = await leadManagementRepository.syncFromEvaluations();
    return NextResponse.json({
      success: true,
      message: `Synchronized leads from ICP evaluations: ${result.added} added, ${result.updated} updated. Total: ${result.total}.`,
      stats: result,
    });
  } catch (error: any) {
    console.error('Error syncing leads from evaluations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
