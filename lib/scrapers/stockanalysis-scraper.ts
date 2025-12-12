/**
 * NSE (Nairobi Securities Exchange) Web Scraper
 * Fetches live market data for NSE-listed companies from stockanalysis.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NSEStockData {
  ticker: string;
  name: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changePercent: number;
  marketCap?: number;
  sector?: string;
  date: Date;
}

export interface ScraperConfig {
  rateLimit: number; // milliseconds between requests
  timeout: number;
  retries: number;
}

const DEFAULT_CONFIG: ScraperConfig = {
  rateLimit: 2000, // 2 seconds between requests
  timeout: 10000,  // 10 seconds
  retries: 3,
};

/**
 * NSE Scraper class
 */
export class NSEScraper {
  private config: ScraperConfig;
  private lastRequestTime: number = 0;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Rate limiter
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.config.rateLimit) {
      const waitTime = this.config.rateLimit - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Save scraped data to database
   */
  async saveToDatabase(data: NSEStockData[]): Promise<void> {
    for (const stock of data) {
      await prisma.scrapedMarketData.upsert({
        where: {
          ticker_date_source: {
            ticker: stock.ticker,
            date: stock.date,
            source: 'stockanalysis.com',
          },
        },
        update: {
          open: stock.open,
          high: stock.high,
          low: stock.low,
          close: stock.close,
          volume: BigInt(stock.volume),
          changePercent: stock.changePercent,
          marketCap: stock.marketCap ? BigInt(stock.marketCap) : null,
          sector: stock.sector,
        },
        create: {
          ticker: stock.ticker,
          date: stock.date,
          open: stock.open,
          high: stock.high,
          low: stock.low,
          close: stock.close,
          volume: BigInt(stock.volume),
          changePercent: stock.changePercent,
          marketCap: stock.marketCap ? BigInt(stock.marketCap) : null,
          sector: stock.sector,
          source: 'nse.co.ke',
        },
      });
    }
  }

  /**
   * Parses markdown content to extract stock data.
   */
  private parseStockData(markdown: string, ticker: string): NSEStockData | null {
    const data: Partial<NSEStockData> = { ticker, date: new Date() };

    // Extract Name
    const nameMatch = markdown.match(/# (.+) \(NASE:[^)]+\)/);
    if (nameMatch) {
      data.name = nameMatch[1].trim();
    }

    // Extract Open, High, Low, Close, Volume, Change Percent
    const openMatch = markdown.match(/Open \| ([\d\.,]+)/);
    if (openMatch) data.open = parseFloat(openMatch[1].replace(/,/g, ''));

    const prevCloseMatch = markdown.match(/Previous Close \| ([\d\.,]+)/);
    if (prevCloseMatch) data.close = parseFloat(prevCloseMatch[1].replace(/,/g, ''));

    const dayRangeMatch = markdown.match(/Day's Range \| ([\d\.,]+) - ([\d\.,]+)/);
    if (dayRangeMatch) {
      data.low = parseFloat(dayRangeMatch[1].replace(/,/g, ''));
      data.high = parseFloat(dayRangeMatch[2].replace(/,/g, ''));
    }

    const volumeMatch = markdown.match(/Volume \| ([\d\.,]+)/);
    if (volumeMatch) data.volume = parseInt(volumeMatch[1].replace(/,/g, ''), 10);

    const changePercentMatch = markdown.match(/\(([\d\.-]+)%\)/);
    if (changePercentMatch && changePercentMatch[1]) {
      data.changePercent = parseFloat(changePercentMatch[1].replace('%', ''));
    }

    // Extract Market Cap
    const marketCapMatch = markdown.match(/\[Market Cap\]\(.+\) \| ([\d\.]+[BMQT])/);
    if (marketCapMatch) {
      const marketCapStr = marketCapMatch[1];
      let marketCapValue = parseFloat(marketCapStr.replace(/[BMQT]/, ''));
      if (marketCapStr.includes('B')) marketCapValue *= 1_000_000_000;
      if (marketCapStr.includes('M')) marketCapValue *= 1_000_000;
      if (marketCapStr.includes('T')) marketCapValue *= 1_000_000_000_000;
      if (marketCapStr.includes('Q')) marketCapValue *= 1_000_000_000_000_000; // Quadrillion, just in case
      data.marketCap = marketCapValue;
    }

    // Extract Sector (now Industry)
    const industryMatch = markdown.match(/Industry([A-Za-z ]+)\n/);
    if (industryMatch) {
      data.sector = industryMatch[1].trim();
    }
    
    if (data.name && data.open && data.high && data.low && data.close && data.volume && data.changePercent) {
      return data as NSEStockData;
    }

    console.warn("Could not parse all data for ticker", ticker, data);
    return null;
  }

  /**
   * Main scraping function
   */
  async scrape(tickers: string[], markdownContent: { [key: string]: string }): Promise<NSEStockData[]> {
    const scrapedData: NSEStockData[] = [];
    for (const ticker of tickers) {
      await this.rateLimit();
      try {
        const markdown = markdownContent[ticker.toUpperCase()];
        if (markdown) {
          const stockData = this.parseStockData(markdown, ticker);
          if (stockData) {
            scrapedData.push(stockData);
          }
        } else {
          console.error("No markdown content provided for ticker", ticker);
        }
      } catch (error) {
        console.error("Error scraping data for", ticker, error);
      }
    }
    return scrapedData;
  }
}

/**
 * Scrape and persist NSE market data
 */
export async function scrapeNSEData(tickers: string[], markdownContent: { [key: string]: string }): Promise<NSEStockData[]> {
  const scraper = new NSEScraper();
  const data = await scraper.scrape(tickers, markdownContent);
  await scraper.saveToDatabase(data);
  return data;
}

export async function getScrapedMarketData(ticker: string, horizon: string) {
  let startDate: Date;
  const endDate = new Date();

  switch (horizon) {
    case '1H': // 1 Hour (for demonstration, actual live data would be more frequent)
      startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
      break;
    case '1D': // 1 Day
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '3D': // 3 Days
      startDate = new Date(endDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      break;
    case '1W': // 1 Week
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1M': // 1 Month
      startDate = new Date(endDate.setMonth(endDate.getMonth() - 1));
      break;
    case '3M': // 3 Months
      startDate = new Date(endDate.setMonth(endDate.getMonth() - 3));
      break;
    case '1Y': // 1 Year
      startDate = new Date(endDate.setFullYear(endDate.getFullYear() - 1));
      break;
    case '5Y': // 5 Years
      startDate = new Date(endDate.setFullYear(endDate.getFullYear() - 5));
      break;
    default:
      startDate = new Date(0); // All time
  }

  const data = await prisma.scrapedMarketData.findMany({
    where: {
      ticker: ticker,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: 'asc',
    },
  });
  
  return data;
}
