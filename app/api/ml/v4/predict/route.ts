import { NextRequest, NextResponse } from 'next/server';
import { MLClient, MLAPIError } from '@/lib/api/ml-client';
import {
  StockPredictionV4Request,
  StockPredictionV4Response,
} from '@/types/ml-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mlClient = new MLClient();

/**
 * POST /api/ml/v4/predict
 * 
 * Predict stock price using V4 models (stock-specific or general)
 * 
 * Request body:
 * {
 *   symbol: string;
 *   horizon: '1d' | '5d' | '10d' | '30d';
 *   recent_prices: number[]; // 60 recent closing prices
 * }
 * 
 * Response:
 * {
 *   symbol: string;
 *   prediction: number;
 *   horizon: string;
 *   mape: number;
 *   model_version: string;
 *   execution_time: number;
 *   cached: boolean;
 *   timestamp: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: StockPredictionV4Request = await request.json();
    const { symbol, horizon, recent_prices } = body;

    // Validation
    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: symbol is required' },
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

    // Call ML service V4 API
    const prediction: StockPredictionV4Response = await mlClient.predictStockV4({
      symbol: symbol.toUpperCase(),
      horizon,
      recent_prices,
    });

    return NextResponse.json(prediction);

  } catch (error) {
    console.error('ML V4 Prediction API Error:', error);
    
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

/**
 * GET /api/ml/v4/predict/history?symbol=SCOM&limit=10
 * 
 * Get historical predictions for a stock (not yet implemented)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Not yet implemented - use V1 API for historical data' },
    { status: 501 }
  );
}
