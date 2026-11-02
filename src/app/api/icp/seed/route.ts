import { NextResponse } from 'next/server';
import { icpRepository } from '@/repositories/ICPRepository';

export async function POST() {
  try {
    const profiles = await icpRepository.seedDefaults();

    return NextResponse.json({
      success: true,
      data: profiles,
      message: 'Default agency ICP profiles restored successfully',
    });
  } catch (error: any) {
    console.error('Error in POST /api/icp/seed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
