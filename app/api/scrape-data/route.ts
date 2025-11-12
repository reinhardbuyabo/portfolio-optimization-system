import { NextResponse } from 'next/server';
import { scrapeNSEData } from '@/lib/scrapers/stockanalysis-scraper';
import { readFileSync } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const csvFilePath = path.join(process.cwd(), 'ml/datasets/NSE_data_stock_market_sectors_2023_2024.csv');
    const csvContent = readFileSync(csvFilePath, 'utf-8');

    const tickers: string[] = csvContent.split('\n')
      .map(line => line.split(',')[1]) // Get the second column (Stock_code)
      .filter(ticker => ticker && ticker !== 'Stock_code' && !ticker.startsWith('^')); // Filter out header and empty lines and indices
    
    console.log("Triggering NSE data scraping for tickers:", tickers);
    const scrapedData = await scrapeNSEData(tickers, {}); // Pass an empty object for markdownContent for now
    console.log(`Scraped ${scrapedData.length} items.`);

    return NextResponse.json({ message: "Scraping initiated successfully", data: scrapedData });
  } catch (error) {
    console.error("Error during scraping process:", error);
    return NextResponse.json({ message: "Error initiating scraping", error: error.message }, { status: 500 });
  }
}