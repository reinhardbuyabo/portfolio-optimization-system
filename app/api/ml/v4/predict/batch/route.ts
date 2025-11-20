import { NextRequest, NextResponse } from 'next/server';
import { MLClient, MLAPIError } from '@/lib/api/ml-client';
import {
  BatchPredictionV4Request,
  BatchPredictionV4Response,
} from '@/types/ml-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mlClient = new MLClient();

/**
 * POST /api/ml/v4/predict/batch
 * 
 * Batch predict stock prices using V4 models
 * 
 * Request body:
 * {
 *   symbols: string[];
 *   horizon: '1d' | '5d' | '10d' | '30d';
 *   recent_prices: number[]; // 60 recent closing prices (shared or stock-specific)
 * }
 * 
 * Response:
 * {
 *   predictions: StockPredictionV4Response[];
 *   summary: {
 *     total: number;
 *     successful: number;
 *     failed: number;
 *     errors: Array<{ symbol: string; error: string }> | null;
 *   };
 *   execution_time: number;
 *   timestamp: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: BatchPredictionV4Request = await request.json();
    const { symbols, horizon, recent_prices } = body;

    // Validation
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: symbols array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!horizon || !['1d', '5d', '10d', '30d'].includes(horizon)) {
      return NextResponse.json(
        { error: 'Invalid request: horizon must be one of 1d, 5d, 10d, 30d' },
        { status: 400 }
      );
    }

    if (!recent_prices || !Array.isArray(recent_prices) || recent_prices.length < 60) {
      return NextResponse.json(
        { error: 'Invalid request: recent_prices must be an array of at least 60 numbers' },
        { status: 400 }
      );
    }

    // Call ML service V4 batch API
    const batchPrediction: BatchPredictionV4Response = await mlClient.predictBatchV4({
      symbols: symbols.map(s => s.toUpperCase()),
      horizon,
      recent_prices,
    });

    return NextResponse.json(batchPrediction);

  } catch (error) {
    console.error('ML V4 Batch Prediction API Error:', error);
    
    if (error instanceof MLAPIError) {
      return NextResponse.json(
        { error: error.message, statusCode: error.statusCode },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
