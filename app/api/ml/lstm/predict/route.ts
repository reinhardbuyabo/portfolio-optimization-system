import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, horizon, data } = body;

    if (!symbol || !data) {
      return NextResponse.json(
        { error: 'Symbol and data are required' },
        { status: 400 }
      );
    }

    const mlRequestBody = {
      symbol: symbol,
      prediction_days: horizon,
      data: data,
    };

    const response = await fetch(
      `${ML_SERVICE_URL}/api/v1/predict/lstm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlRequestBody),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { detail: error.detail || 'LSTM prediction failed' },
        { status: response.status }
      );
    }

    const prediction = await response.json();
    return NextResponse.json(prediction);

  } catch (error: any) {
    console.error('LSTM prediction error:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
