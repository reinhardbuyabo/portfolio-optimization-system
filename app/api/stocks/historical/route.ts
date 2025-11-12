import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalPricesWithDates } from '@/lib/api/ml-data-helper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/stocks/historical?symbol=SCOM&days=60
 * 
 * Get historical prices with dates from CSV data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const days = parseInt(searchParams.get('days') || '60');
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'symbol parameter is required' },
        { status: 400 }
      );
    }
    
    const prices = getHistoricalPricesWithDates(symbol, days);
    
    if (prices.length === 0) {
      return NextResponse.json(
        { error: `No historical data found for ${symbol}` },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      symbol,
      prices,
      latestPrice: prices[prices.length - 1]?.price || null,
      latestDate: prices[prices.length - 1]?.date || null,
      count: prices.length,
    });
    
  } catch (error) {
    console.error('Historical data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



