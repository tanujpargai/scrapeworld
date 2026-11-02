import { NextResponse } from 'next/server';
import { icpRepository } from '@/repositories/ICPRepository';
import { z } from 'zod';

const toggleSchema = z.object({
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let isActive: boolean | undefined;

    try {
      const body = await request.json();
      const validated = toggleSchema.parse(body);
      isActive = validated.isActive;
    } catch {
      // Empty body is acceptable for a pure toggle
    }

    const updated = await icpRepository.toggleActive(id, isActive);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: `ICP profile with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: `ICP profile '${updated.name}' is now ${updated.isActive ? 'active' : 'inactive'}`,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/icp/[id]/toggle:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
