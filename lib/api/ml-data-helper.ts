import fs from 'fs';
import path from 'path';

/**
 * Helper functions to prepare historical data for ML predictions
 */

const DATASETS_DIR = path.join(process.cwd(), 'ml', 'datasets');

interface CSVRow {
  Date: string;
  Code: string;
  CODE?: string;
  DATE?: string;
  Name: string;
  'Day Price': string;
  [key: string]: string | undefined;
}

/**
 * Parse CSV line handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Push the last value
  if (currentValue) {
    values.push(currentValue.trim());
  }
  
  return values;
}

/**
 * Parse CSV file and extract historical data
 */
function parseCSV(csv: string): CSVRow[] {
  const lines = csv.split('\n');
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const data: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = parseCSVLine(line);
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
 * Load data from all historical CSV files (2013-2024)
 * This matches the test script behavior
 */
function loadAllHistoricalData(symbol: string): CSVRow[] {
  try {
    // Check if datasets directory exists
    if (!fs.existsSync(DATASETS_DIR)) {
      console.error(`Datasets directory not found: ${DATASETS_DIR}`);
      return [];
    }
    
    // Get all CSV files, excluding sector files
    const allFiles = fs.readdirSync(DATASETS_DIR)
      .filter(file => file.startsWith('NSE_data_all_stocks_') && file.endsWith('.csv'))
      .filter(file => !file.toLowerCase().includes('sector'))
      .map(file => path.join(DATASETS_DIR, file))
      .sort();
    
    console.log(`Loading ${symbol} data from ${allFiles.length} CSV files`);
    
    const allData: CSVRow[] = [];
    
    for (const file of allFiles) {
      try {
        const fileContent = fs.readFileSync(file, 'utf-8');
        const data = parseCSV(fileContent);
        
        // Filter for the specific symbol (handle both Code and CODE columns)
        const symbolData = data.filter(row => {
          const code = row.Code || row.CODE || '';
          return code.toUpperCase() === symbol.toUpperCase();
        });
        
        allData.push(...symbolData);
      } catch (error) {
        console.warn(`Error reading ${path.basename(file)}:`, error);
      }
    }
    
    // Sort by date (oldest first) - handle both Date and DATE columns
    allData.sort((a, b) => {
      const dateA = new Date(a.Date || a.DATE || '');
      const dateB = new Date(b.Date || b.DATE || '');
      return dateA.getTime() - dateB.getTime();
    });
    
    console.log(`Loaded ${allData.length} total records for ${symbol} (2013-2024)`);
    
    return allData;
  } catch (error) {
    console.error(`Error loading historical data for ${symbol}:`, error);
    return [];
  }
}

/**
 * Get historical prices for a stock symbol
 * @param symbol - Stock symbol (e.g., "SCOM")
 * @param days - Number of days to fetch (default: 200 for GARCH, minimum 60 for LSTM)
 * @returns Array of prices, most recent last
 */
export interface PriceDataPoint {
  date: string;
  price: number;
}

export function getHistoricalPricesWithDates(symbol: string, days: number = 200): PriceDataPoint[] {
  try {
    // Load data from ALL historical CSV files (2013-2024)
    const stockData = loadAllHistoricalData(symbol);
    
    if (stockData.length === 0) {
      console.error(`No historical data found for ${symbol}`);
      return [];
    }
    
    // Extract prices with dates and filter out NaN values
    const pricesWithDates: PriceDataPoint[] = stockData
      .map(row => {
        const priceStr = row['Day Price']?.replace(/,/g, '') || '';
        const price = parseFloat(priceStr);
        return {
          date: row.Date || row.DATE || '',
          price: price,
        };
      })
      .filter(point => !isNaN(point.price) && point.date);
    
    console.log(`Extracted ${pricesWithDates.length} price points for ${symbol}`);
    
    // Return the most recent `days` prices
    return pricesWithDates.slice(-days);
  } catch (error) {
    console.error(`Error fetching historical prices with dates for ${symbol}:`, error);
    return [];
  }
}

export function getHistoricalPrices(symbol: string, days: number = 200): number[] {
  try {
    // Load data from ALL historical CSV files (2013-2024)
    const stockData = loadAllHistoricalData(symbol);
    
    if (stockData.length === 0) {
      console.error(`No historical data found for ${symbol}`);
      return [];
    }
    
    // Extract prices and filter out NaN values
    const prices = stockData
      .map(row => {
        // Remove commas from price string if present
        const priceStr = row['Day Price']?.replace(/,/g, '') || '';
        return parseFloat(priceStr);
      })
      .filter(price => !isNaN(price));
    
    console.log(`Extracted ${prices.length} valid prices for ${symbol}`);
    
    // Return the most recent `days` prices
    return prices.slice(-days);
  } catch (error) {
    console.error(`Error fetching historical prices for ${symbol}:`, error);
    return [];
  }
}

/**
 * Calculate log returns from prices
 * @param prices - Array of prices
 * @returns Array of log returns
 */
export function calculateLogReturns(prices: number[]): number[] {
  const returns: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > 0 && prices[i - 1] > 0) {
      const logReturn = Math.log(prices[i] / prices[i - 1]);
      returns.push(logReturn);
    }
  }
  
  return returns;
}

/**
 * Prepare data for ML prediction
 * @param symbol - Stock symbol
 * @param options - Optional configuration
 * @returns Object with prices and returns for prediction
 */
export function prepareMLData(
  symbol: string,
  options: { lstmDays?: number; garchDays?: number } = {}
) {
  const { lstmDays = 60, garchDays = 200 } = options;
  
  // Get prices for GARCH (need more historical data)
  const allPrices = getHistoricalPrices(symbol, garchDays);
  
  if (allPrices.length < lstmDays) {
    throw new Error(`Insufficient data for ${symbol}: need at least ${lstmDays} days, got ${allPrices.length}`);
  }
  
  // Get most recent prices for LSTM
  const lstmPrices = allPrices.slice(-lstmDays);
  
  // Calculate log returns for GARCH
  const returns = calculateLogReturns(allPrices);
  
  return {
    prices: lstmPrices,
    returns,
    dataPoints: allPrices.length,
  };
}

/**
 * Prepare batch data for multiple symbols
 * @param symbols - Array of stock symbols
 * @returns Object with historical data for all symbols
 */
export function prepareBatchMLData(symbols: string[]) {
  const historicalData: {
    [symbol: string]: {
      prices: number[];
      returns: number[];
    };
  } = {};
  
  const errors: { [symbol: string]: string } = {};
  
  for (const symbol of symbols) {
    try {
      const data = prepareMLData(symbol);
      historicalData[symbol] = {
        prices: data.prices,
        returns: data.returns,
      };
    } catch (error) {
      if (error instanceof Error) {
        errors[symbol] = error.message;
      } else {
        errors[symbol] = 'Unknown error preparing data';
      }
    }
  }
  
  return {
    symbols: Object.keys(historicalData),
    historical_data: historicalData,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}
