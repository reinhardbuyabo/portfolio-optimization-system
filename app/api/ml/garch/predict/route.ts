import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

function calculateLogReturns(data: { "Day Price": number }[]): number[] {
    const prices = data.map(d => d["Day Price"]);
    const logReturns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i-1] !== 0) {
            logReturns.push(Math.log(prices[i] / prices[i-1]));
        }
    }
    return logReturns;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, data } = body;

    if (!symbol || !data) {
      return NextResponse.json(
        { error: 'Symbol and data are required' },
        { status: 400 }
      );
    }

    const logReturns = calculateLogReturns(data);

    const mlRequestBody = {
      symbol: symbol,
      log_returns: logReturns,
    };

    const response = await fetch(
      `${ML_SERVICE_URL}/api/v1/predict/garch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlRequestBody),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { detail: error.detail || 'GARCH prediction failed' },
        { status: response.status }
      );
    }

    const prediction = await response.json();
    return NextResponse.json(prediction);

  } catch (error: any) {
    console.error('GARCH prediction error:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
