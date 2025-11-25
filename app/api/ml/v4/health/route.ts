import { NextRequest, NextResponse } from 'next/server';
import { MLClient, MLAPIError } from '@/lib/api/ml-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mlClient = new MLClient();

/**
 * GET /api/ml/v4/health
 * 
 * Check V4 ML API health status
 * 
 * Response:
 * {
 *   status: string;
 *   service: string;
 *   total_coverage: number;
 *   specific_models: number;
 *   general_model_stocks: number;
 *   cache_size: string;
 *   cache_hit_rate: string;
 *   timestamp: string;
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const health = await mlClient.checkHealthV4();
    return NextResponse.json(health);
  } catch (error) {
    console.error('ML V4 Health Check Error:', error);
    
    if (error instanceof MLAPIError) {
      return NextResponse.json(
        { 
          status: 'unhealthy',
          error: error.message,
          statusCode: error.statusCode 
        },
        { status: error.statusCode || 503 }
      );
    }

    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'ML service unavailable' 
      },
      { status: 503 }
    );
  }
}
