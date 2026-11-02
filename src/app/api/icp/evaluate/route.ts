import { NextResponse } from 'next/server';
import { icpRepository } from '@/repositories/ICPRepository';
import { ICPEngineService } from '@/services/icp/ICPEngineService';
import type { ICPProfile } from '@/types/icp';

const icpEngine = new ICPEngineService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profileId, profile: inlineProfile, business } = body;

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business object is required for evaluation' },
        { status: 400 }
      );
    }

    let targetProfile: ICPProfile | null = inlineProfile || null;

    if (!targetProfile && profileId) {
      targetProfile = await icpRepository.findById(profileId);
      if (!targetProfile) {
        return NextResponse.json(
          { success: false, error: `ICP profile with ID '${profileId}' not found` },
          { status: 404 }
        );
      }
    }

    if (!targetProfile) {
      return NextResponse.json(
        { success: false, error: 'Either profileId or inline profile object must be provided' },
        { status: 400 }
      );
    }

    const evaluation = icpEngine.evaluate(business, targetProfile);

    return NextResponse.json({
      success: true,
      data: evaluation,
      profile: {
        id: targetProfile.id,
        name: targetProfile.name,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/icp/evaluate:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
