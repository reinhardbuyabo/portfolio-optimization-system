import { NextRequest, NextResponse } from 'next/server';
import { prepareBatchMLData } from '@/lib/api/ml-data-helper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ml/prepare-data
 * 
 * Request body:
 * {
 *   symbols: string[];
 * }
 * 
 * Response:
 * {
 *   symbols: string[];
 *   historical_data: {
 *     [symbol]: { prices: number[]; returns: number[] }
 *   };
 *   errors?: { [symbol]: string };
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: symbols array is required' },
        { status: 400 }
      );
    }

    // Prepare data for all symbols
    const result = await prepareBatchMLData(symbols);

    if (result.symbols.length === 0) {
      // Provide more detailed error information
      const errorDetails = result.errors || {};
      const errorMessages = Object.entries(errorDetails)
        .map(([symbol, msg]) => `${symbol}: ${msg}`)
        .join('; ');
      
      console.error('Data preparation failed for all symbols:', errorDetails);
      
      return NextResponse.json(
        {
          error: 'No valid data available for any of the requested symbols',
          details: errorMessages || 'Unable to load historical data from database',
          errors: result.errors,
          symbols_requested: symbols,
        },
        { status: 404 }
      );
    }

    console.log(`Successfully prepared data for ${result.symbols.length} symbols:`, result.symbols);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Data preparation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
