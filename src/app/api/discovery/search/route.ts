import { NextResponse } from 'next/server';
import { CollectionService } from '@/services/CollectionService';
import { z } from 'zod';

const searchSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required'),
  location: z.string().min(1, 'Location is required'),
  targetCount: z.number().int().positive().optional().default(100),
  keywords: z.array(z.string()).optional().default([]),
  locations: z.array(z.string()).optional().default([]),
  icpId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = searchSchema.parse(body);

    const parsedKeywords = validated.keywords && validated.keywords.length > 0
      ? validated.keywords
      : validated.keyword.split(',').map((k) => k.trim()).filter(Boolean);

    const parsedLocations = validated.locations && validated.locations.length > 0
      ? validated.locations
      : validated.location.split(',').map((l) => l.trim()).filter(Boolean);

    // Primary keyword/location are the first ones
    const primaryKeyword = parsedKeywords[0] || validated.keyword;
    const primaryLocation = parsedLocations[0] || validated.location;

    const collectionService = new CollectionService();
    const collection = await collectionService.startSearch(
      primaryKeyword,
      primaryLocation,
      validated.targetCount,
      parsedKeywords,
      parsedLocations,
      validated.icpId || null
    );

    return NextResponse.json({
      success: true,
      jobId: collection.id,
      message: 'Collection search job queued successfully',
    });
  } catch (error) {
    console.error('API Error in discovery/search:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

