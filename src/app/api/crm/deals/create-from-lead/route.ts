import { NextResponse } from 'next/server';
import { CRMService } from '@/services/CRMService';
import { z } from 'zod';

const crmService = new CRMService();

const createFromLeadSchema = z.object({
  businessId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = createFromLeadSchema.parse(body);

    const deal = await crmService.createFromLead(validated.businessId);

    return NextResponse.json({
      success: true,
      message: 'Deal and follow-up tasks successfully generated from lead intelligence',
      deal,
    });
  } catch (error: any) {
    console.error('API Error in deals create-from-lead:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
