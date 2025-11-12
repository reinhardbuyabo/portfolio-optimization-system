import { getHistoricalPrices } from './ml-data-helper';

/**
 * Get the latest price for a stock from CSV data
 * @param symbol - Stock symbol
 * @returns Latest price or null if not available
 */
export function getLatestPrice(symbol: string): number | null {
  try {
    const prices = getHistoricalPrices(symbol, 1); // Get just the latest price
    
    if (prices.length === 0) {
      console.warn(`No price data found for ${symbol}`);
      return null;
    }
    
    return prices[prices.length - 1]; // Return the most recent price
  } catch (error) {
    console.error(`Error fetching latest price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get latest prices for multiple symbols
 * @param symbols - Array of stock symbols
 * @returns Map of symbol to latest price
 */
export function getLatestPrices(symbols: string[]): { [symbol: string]: number | null } {
  const prices: { [symbol: string]: number | null } = {};
  
  for (const symbol of symbols) {
    prices[symbol] = getLatestPrice(symbol);
  }
  
  return prices;
}



