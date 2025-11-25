import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for batch processing

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

function calculateLogReturns(prices: number[]): number[] {
  const logReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1] > 0 && prices[i] > 0) {
      logReturns.push(Math.log(prices[i] / prices[i-1]));
    }
  }
  return logReturns;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, horizon } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    // Fetch historical data for all symbols
    const historicalDataPromises = symbols.map(async (symbol: string) => {
      try {
        const response = await fetch(
          `${request.nextUrl.origin}/api/stocks/historical?symbol=${symbol}&days=60`
        );
        
        if (!response.ok) {
          console.warn(`Failed to fetch historical data for ${symbol}`);
          return null;
        }
        
        const data = await response.json();
        const prices = data.prices?.map((p: any) => p.price) || [];
        
        return {
          symbol,
          prices,
          data: data.prices?.map((p: any) => ({ 'Day Price': p.price })) || [],
          currentPrice: data.latestPrice || prices[prices.length - 1] || null,
        };
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        return null;
      }
    });

    const historicalDataResults = await Promise.all(historicalDataPromises);
    const validStocks = historicalDataResults.filter(Boolean);

    if (validStocks.length === 0) {
      return NextResponse.json(
        { error: 'No valid historical data found for any symbols' },
        { status: 400 }
      );
    }

    // Run LSTM and GARCH predictions in parallel
    const [lstmResponse, garchResponse] = await Promise.all([
      // LSTM batch prediction
      fetch(`${ML_SERVICE_URL}/api/v1/predict/lstm/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stocks: validStocks.map((stock: any) => ({
            symbol: stock.symbol,
            prediction_days: horizon || 60,
            data: stock.data,
          })),
          max_workers: 4,
        }),
      }),
      
      // GARCH batch prediction
      fetch(`${ML_SERVICE_URL}/api/v1/predict/garch/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stocks: validStocks.map((stock: any) => ({
            symbol: stock.symbol,
            log_returns: calculateLogReturns(stock.prices),
          })),
          max_workers: 4,
        }),
      }),
    ]);

    if (!lstmResponse.ok) {
      const error = await lstmResponse.json();
      return NextResponse.json(
        { detail: error.detail || 'LSTM batch prediction failed' },
        { status: lstmResponse.status }
      );
    }

    if (!garchResponse.ok) {
      const error = await garchResponse.json();
      return NextResponse.json(
        { detail: error.detail || 'GARCH batch prediction failed' },
        { status: garchResponse.status }
      );
    }

    const lstmResults = await lstmResponse.json();
    const garchResults = await garchResponse.json();
    
    // Combine LSTM and GARCH results
    const combinedResults = validStocks.map((stock: any) => {
      const lstmResult = lstmResults.results.find((r: any) => r.symbol === stock.symbol);
      const garchResult = garchResults.results.find((r: any) => r.symbol === stock.symbol);
      
      const currentPrice = stock.currentPrice || 0;
      const predictedPrice = lstmResult?.prediction || 0;
      const expectedReturn = currentPrice > 0 ? ((predictedPrice - currentPrice) / currentPrice) : 0;
      
      return {
        symbol: stock.symbol,
        currentPrice,
        lstm: lstmResult ? {
          ...lstmResult,
          horizon: horizon || 60,
        } : null,
        garch: garchResult || null,
        expectedReturn,
        status: (lstmResult && garchResult) ? 'success' : 'partial',
      };
    });

    return NextResponse.json({
      results: combinedResults,
      total: validStocks.length,
      successful: combinedResults.filter((r: any) => r.status === 'success').length,
      failed: combinedResults.filter((r: any) => r.status !== 'success').length,
      execution_time: (lstmResults.execution_time || 0) + (garchResults.execution_time || 0),
    });

  } catch (error: any) {
    console.error('Batch prediction error:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
