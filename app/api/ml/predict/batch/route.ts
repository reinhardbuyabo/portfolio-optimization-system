import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/ml/predict/batch
 * Get predictions for multiple NSE stocks at once
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tickers } = body;
    
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json(
        { error: 'Tickers array is required and must not be empty' },
        { status: 400 }
      );
    }
    
    // Call ML service batch prediction endpoint
    const response = await fetch(
      `${ML_SERVICE_URL}/api/predict/batch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tickers),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail || 'Batch prediction failed' },
        { status: 500 }
      );
    }
    
    const predictions = await response.json();
    
    return NextResponse.json({
      ...predictions,
      timestamp: new Date().toISOString(),
      count: Object.keys(predictions.predictions || {}).length,
    });
    
  } catch (error: any) {
    console.error('Batch ML prediction error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
