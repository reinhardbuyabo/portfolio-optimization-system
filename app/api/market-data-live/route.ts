import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db/prisma';
import { getScrapedMarketData } from '@/lib/scrapers/stockanalysis-scraper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/market-data-live
 * Fetch live NSE market data from scraped database
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const horizon = searchParams.get('horizon') || '1M';
    const tickersParam = searchParams.get('tickers');
    
    const tickers = tickersParam 
      ? tickersParam.split(',').map(t => t.trim())
      : ['SCOM', 'EQTY', 'KCB', 'EABL', 'COOP']; // Default tickers if none provided
    
    const timeSeries: any[] = [];
    const summary: any[] = [];

    for (const ticker of tickers) {
      const scrapedData = await getScrapedMarketData(ticker, horizon);

      if (scrapedData.length > 0) {
        // Time series data
        timeSeries.push({
          symbol: ticker,
          data: scrapedData.map(data => ({
            date: data.date.toISOString().split('T')[0],
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            volume: Number(data.volume),
            change: data.changePercent ? (data.close * data.changePercent) / 100 : 0,
            pct_change: data.changePercent || 0,
          })),
        });

        // Summary data (latest for each ticker)
        const latest = scrapedData[scrapedData.length - 1]; // Last item is the latest due to orderBy: 'asc'
        summary.push({
          symbol: latest.ticker,
          price: latest.close,
          change: latest.changePercent ? (latest.close * latest.changePercent) / 100 : 0,
          pct_change: latest.changePercent || 0,
          open: latest.open,
          high: latest.high,
          low: latest.low,
          volume: Number(latest.volume),
        });
      }
    }
    
    return NextResponse.json({
      time_series: timeSeries,
      summary: summary,
      source: 'database',
      timestamp: new Date().toISOString(),
    });
    
      } catch (error: any) {
      console.error('Error fetching live market data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch market data', time_series: [], summary: [] },
        { status: 500 }
      );
    }}
