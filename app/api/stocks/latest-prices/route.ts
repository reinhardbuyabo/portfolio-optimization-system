import { NextRequest, NextResponse } from 'next/server';
import { getLatestPrices } from '@/lib/api/get-latest-price';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/stocks/latest-prices?symbols=SCOM,EQTY,KCB
 * 
 * Get latest prices from CSV data for specified stocks
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get('symbols');
    
    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'symbols parameter is required' },
        { status: 400 }
      );
    }
    
    const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);
    
    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'At least one symbol is required' },
        { status: 400 }
      );
    }
    
    const prices = getLatestPrices(symbols);
    
    return NextResponse.json({
      prices,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Latest prices API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



