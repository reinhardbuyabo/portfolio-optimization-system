import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Stock } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CSV_PATH = path.join(process.cwd(), 'ml', 'datasets', 'NSE_data_all_stocks_2024_jan_to_oct.csv');

interface CSVRow {
  Date: string;
  Code: string;
  Name: string;
  'Day Price': string;
  'Previous': string;
  'Change': string;
  'Change%': string;
  'Volume': string;
  '12m Low': string;
  '12m High': string;
  [key: string]: string;
}

/**
 * Parse CSV file
 */
function parseCSV(csv: string): CSVRow[] {
  const lines = csv.split('\n');
  const headers = lines[0].split(',');
  const data: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = line.split(',');
      if (values.length === headers.length) {
        const entry: any = {};
        for (let j = 0; j < headers.length; j++) {
          entry[headers[j]] = values[j];
        }
        data.push(entry);
      }
    }
  }
  return data;
}

/**
 * Map NSE sector codes to readable sector names
 */
function getSectorName(stockCode: string, stockName: string): string {
  // Banking sector
  if (['ABSA', 'BKG', 'COOP', 'DTK', 'EQTY', 'HFCK', 'IMH', 'KCB', 'NBK', 'NCBA', 'SBIC', 'SCBK'].includes(stockCode)) {
    return 'Banking';
  }
  // Telecommunications
  if (['SCOM'].includes(stockCode)) {
    return 'Telecommunications';
  }
  // Consumer Goods (Breweries, Tobacco)
  if (['EABL', 'BAT', 'UNGA', 'KEGN'].includes(stockCode)) {
    return 'Consumer Goods';
  }
  // Construction & Materials
  if (['BAMB', 'ARMN', 'CABL'].includes(stockCode)) {
    return 'Construction';
  }
  // Insurance
  if (['BRIT', 'CIC', 'JUB', 'KNRE', 'LBTY', 'SANLAM'].includes(stockCode)) {
    return 'Insurance';
  }
  // Manufacturing
  if (['TOTL', 'BATA', 'BERG', 'CARB', 'CBKG', 'EGAD'].includes(stockCode)) {
    return 'Manufacturing';
  }
  // Energy & Petroleum
  if (['KEGN', 'KPLC', 'TOTL'].includes(stockCode)) {
    return 'Energy';
  }
  // Investment
  if (['EVRD', 'ICDC', 'NASI', 'OLMP', 'TRAN'].includes(stockCode)) {
    return 'Investment';
  }
  // Real Estate
  if (stockName.toLowerCase().includes('real estate') || stockName.toLowerCase().includes('property')) {
    return 'Real Estate';
  }
  // Agriculture (Tea, Coffee, etc)
  if (['KAPC', 'KAKZ', 'LIMT', 'SASN', 'WTK'].includes(stockCode)) {
    return 'Agriculture';
  }
  
  return 'Other';
}

/**
 * Clean numeric string (remove commas, handle special characters)
 */
function cleanNumeric(value: string): number {
  if (!value || value === '-' || value === '') return 0;
  // Remove quotes and commas
  const cleaned = value.replace(/["',]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate market cap estimate (simplified)
 * Using: Market Cap ≈ Current Price × Volume × 1000 (rough approximation)
 */
function estimateMarketCap(price: number, volume: number): number {
  // This is a rough estimate - real market cap requires shares outstanding
  // For NSE stocks, we'll use a multiplier based on typical market data
  return price * volume * 100; // Simplified calculation
}

/**
 * GET /api/market-data/latest
 * 
 * Returns latest stock data from CSV formatted for the new UI
 */
export async function GET() {
  try {
    const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const data = parseCSV(fileContent);
    
    // Group by stock symbol and get the most recent entry for each
    const latestBySymbol: Map<string, CSVRow> = new Map();
    
    data.forEach(row => {
      const symbol = row.Code;
      const date = new Date(row.Date);
      
      if (symbol && !isNaN(date.getTime())) {
        const existing = latestBySymbol.get(symbol);
        if (!existing || new Date(existing.Date) < date) {
          latestBySymbol.set(symbol, row);
        }
      }
    });
    
    // Convert to Stock interface format
    const stocks: Stock[] = Array.from(latestBySymbol.values())
      .map(row => {
        const currentPrice = cleanNumeric(row['Day Price']);
        const previous = cleanNumeric(row['Previous']);
        const change = cleanNumeric(row['Change']);
        const changePercent = cleanNumeric(row['Change%']);
        const volume = cleanNumeric(row['Volume']);
        
        // Skip if no valid price data
        if (currentPrice === 0) return null;
        
        return {
          symbol: row.Code,
          name: row.Name,
          sector: getSectorName(row.Code, row.Name),
          currentPrice,
          change: change || (previous > 0 ? currentPrice - previous : 0),
          changePercent: changePercent || (previous > 0 ? ((currentPrice - previous) / previous) * 100 : 0),
          volume: volume,
          marketCap: estimateMarketCap(currentPrice, volume),
        } as Stock;
      })
      .filter((stock): stock is Stock => stock !== null)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0)); // Sort by market cap descending
    
    return NextResponse.json({
      stocks,
      lastUpdated: new Date().toISOString(),
      dataDate: Array.from(latestBySymbol.values())[0]?.Date || 'Unknown',
      totalStocks: stocks.length,
    });
    
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
