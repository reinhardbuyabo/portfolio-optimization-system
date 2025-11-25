import { NextRequest, NextResponse } from 'next/server';
import { MLClient, MLAPIError } from '@/lib/api/ml-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mlClient = new MLClient();

/**
 * GET /api/ml/v4/models
 * 
 * Get available stock models
 * 
 * Query parameters:
 * - include_sectors: boolean (optional) - Include sector grouping
 * 
 * Response:
 * {
 *   total_stocks: number;
 *   trained_models: number;
 *   available_stocks: string[];
 *   models_by_sector: Record<string, string[]> | null;
 *   model_version: string;
 *   cache_stats: {
 *     total_coverage: number;
 *     specific_models: number;
 *     general_model_stocks: number;
 *     cache_size: number;
 *     cache_capacity: number;
 *     cache_hit_rate: number;
 *   };
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const models = await mlClient.getAvailableModelsV4();
    return NextResponse.json(models);
  } catch (error) {
    console.error('ML V4 Get Models Error:', error);
    
    if (error instanceof MLAPIError) {
      return NextResponse.json(
        { error: error.message, statusCode: error.statusCode },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch available models' },
      { status: 500 }
    );
  }
}
