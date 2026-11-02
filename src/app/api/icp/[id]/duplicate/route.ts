import { NextResponse } from 'next/server';
import { icpRepository } from '@/repositories/ICPRepository';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const duplicated = await icpRepository.duplicate(id);

    if (!duplicated) {
      return NextResponse.json(
        { success: false, error: `ICP profile with ID '${id}' not found to duplicate` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: duplicated,
      message: `ICP profile duplicated as '${duplicated.name}'`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/icp/[id]/duplicate:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
