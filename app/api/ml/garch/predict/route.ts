import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

function calculateLogReturns(data: { "Day Price": number }[]): { 
  logReturns: number[], 
  errors: string[] 
} {
    const prices = data.map(d => d["Day Price"]);
    const logReturns: number[] = [];
    const errors: string[] = [];
    
    // Validate prices
    for (let i = 0; i < prices.length; i++) {
      if (prices[i] === null || prices[i] === undefined) {
        errors.push(`Price at index ${i} is null or undefined`);
      }
      if (isNaN(prices[i])) {
        errors.push(`Price at index ${i} is NaN`);
      }
      if (prices[i] <= 0) {
        errors.push(`Price at index ${i} is non-positive: ${prices[i]}`);
      }
    }
    
    if (errors.length > 0) {
      return { logReturns: [], errors };
    }
    
    // Calculate log returns
    for (let i = 1; i < prices.length; i++) {
        const logReturn = Math.log(prices[i] / prices[i-1]);
        
        // Validate log return
        if (!isFinite(logReturn)) {
          errors.push(`Invalid log return at index ${i}: ${logReturn}`);
        } else {
          logReturns.push(logReturn);
        }
    }
    
    return { logReturns, errors };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, data } = body;

    // Validation 1: Required fields
    if (!symbol || !data) {
      return NextResponse.json(
        { detail: 'Symbol and data are required' },
        { status: 400 }
      );
    }

    // Validation 2: Data format
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { detail: 'Data must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validation 3: Minimum data points
    if (data.length < 30) {
      return NextResponse.json(
        { detail: `Insufficient data for GARCH: need at least 30 price points, got ${data.length}` },
        { status: 400 }
      );
    }

    // Calculate log returns with validation
    const { logReturns, errors } = calculateLogReturns(data);
    
    // Validation 4: Check for calculation errors
    if (errors.length > 0) {
      return NextResponse.json(
        { detail: `Data validation failed: ${errors[0]}` },
        { status: 400 }
      );
    }

    // Validation 5: Check log returns array
    if (logReturns.length === 0) {
      return NextResponse.json(
        { detail: 'Failed to calculate log returns from price data' },
        { status: 400 }
      );
    }

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
    
    // Validation 6: Validate response from ML service
    if (!prediction.forecasted_variance || !isFinite(prediction.forecasted_variance)) {
      return NextResponse.json(
        { detail: 'ML service returned invalid variance forecast' },
        { status: 500 }
      );
    }
    
    if (!prediction.volatility_annualized || !isFinite(prediction.volatility_annualized)) {
      return NextResponse.json(
        { detail: 'ML service returned invalid volatility forecast' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(prediction);

  } catch (error: any) {
    console.error('GARCH prediction error:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
