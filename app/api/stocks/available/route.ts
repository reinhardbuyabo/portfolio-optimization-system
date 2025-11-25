import { NextResponse } from 'next/server';
import { getAvailableStocks, getStocksBySector } from '@/lib/api/get-available-stocks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/stocks/available
 * 
 * Query parameters:
 * - grouped: boolean (optional) - If true, returns stocks grouped by sector
 * 
 * Returns all available stocks from the training data with sector information
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grouped = searchParams.get('grouped') === 'true';
    
    if (grouped) {
      const stocksBySector = getStocksBySector();
      
      // Convert Map to object for JSON serialization
      const result: { [sector: string]: any[] } = {};
      stocksBySector.forEach((stocks, sector) => {
        result[sector] = stocks;
      });
      
      return NextResponse.json({
        grouped: true,
        sectors: Object.keys(result).sort(),
        data: result,
        total: getAvailableStocks().length,
      });
    } else {
      const stocks = getAvailableStocks();
      
      return NextResponse.json({
        grouped: false,
        data: stocks,
        total: stocks.length,
      });
    }
  } catch (error) {
    console.error('Error fetching available stocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available stocks' },
      { status: 500 }
    );
  }
}



