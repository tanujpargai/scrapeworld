import { NextResponse } from 'next/server';
import { icpRepository } from '@/repositories/ICPRepository';
import type { ICPRule } from '@/types/icp';
import { z } from 'zod';

const operatorSchema = z.enum([
  'equals',
  'not_equals',
  'exists',
  'does_not_exist',
  'greater_than',
  'greater_than_or_equal',
  'less_than',
  'less_than_or_equal',
  'between',
  'contains',
  'does_not_contain',
  'exact_match',
  'starts_with',
  'ends_with',
  'is_one_of',
  'is_not_one_of',
  'must_contain',
  'must_not_contain',
  'contains_any',
  'contains_all',
]);

const ruleTypeSchema = z.enum(['HARD_FILTER', 'SOFT_SIGNAL', 'EXCLUSION']);

const ruleConditionSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  operator: operatorSchema,
  value: z.any().optional(),
  secondValue: z.any().optional(),
  caseSensitive: z.boolean().optional(),
});

const icpRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().optional(),
  type: ruleTypeSchema,
  condition: ruleConditionSchema,
  weight: z.number().optional(),
  explanation: z.string().optional(),
  failureExplanation: z.string().optional(),
  enabled: z.boolean().optional().default(true),
});

const scoringConfigSchema = z.object({
  mode: z.enum(['additive', 'proportional']).optional(),
  maxScore: z.number().optional(),
  minPassingScore: z.number().optional(),
  highPriorityThreshold: z.number().optional(),
  mediumPriorityThreshold: z.number().optional(),
  zeroScoreOnDisqualification: z.boolean().optional(),
}).optional();

const createProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required'),
  description: z.string().optional(),
  targetNiche: z.string().optional(),
  targetService: z.string().optional(),
  rules: z.array(icpRuleSchema).default([]),
  scoringConfig: scoringConfigSchema,
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('active') === 'true';
    const profiles = await icpRepository.list(onlyActive);

    return NextResponse.json({
      success: true,
      data: profiles,
      count: profiles.length,
    });
  } catch (error: any) {
    console.error('Error in GET /api/icp:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = createProfileSchema.parse(body);

    // Ensure all rules have IDs
    const preparedRules: ICPRule[] = validated.rules.map((rule, idx) => ({
      ...rule,
      id: rule.id || `rule-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    }));

    const { rules: _rawRules, ...restData } = validated;
    const profile = await icpRepository.create({
      ...restData,
      rules: preparedRules,
    });

    return NextResponse.json(
      {
        success: true,
        data: profile,
        message: 'ICP profile created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/icp:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
