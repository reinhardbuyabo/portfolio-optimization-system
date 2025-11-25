import fs from 'fs';
import path from 'path';

const DATASETS_DIR = path.join(process.cwd(), 'ml', 'datasets');
const STOCKS_CSV = path.join(DATASETS_DIR, 'NSE_data_all_stocks_2024_jan_to_oct.csv');
const SECTORS_CSV = path.join(DATASETS_DIR, 'NSE_data_stock_market_sectors_2023_2024.csv');

export interface StockInfo {
  code: string;
  name: string;
  sector?: string;
}

/**
 * Parse CSV line handling quoted fields
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
  
  if (currentValue) {
    values.push(currentValue.trim());
  }
  
  return values;
}

/**
 * Load sector information for stocks
 */
function loadSectorData(): Map<string, { name: string; sector: string }> {
  const sectorMap = new Map<string, { name: string; sector: string }>();
  
  try {
    if (!fs.existsSync(SECTORS_CSV)) {
      console.warn('Sectors CSV not found:', SECTORS_CSV);
      return sectorMap;
    }
    
    const content = fs.readFileSync(SECTORS_CSV, 'utf-8');
    const lines = content.split('\n');
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const [sector, code, name] = parseCSVLine(line);
      if (code && name && sector) {
        sectorMap.set(code.toUpperCase(), { 
          name: name.trim(), 
          sector: sector.trim() 
        });
      }
    }
    
  } catch (error) {
    console.error('Error loading sector data:', error);
  }
  
  return sectorMap;
}

function getLatestDataFromCsvLines(lines: string[]): any[] {
    const latestData: { [key: string]: any } = {};
    const headers = parseCSVLine(lines[0]);
    const codeIndex = headers.findIndex(h => h.trim().toUpperCase() === 'CODE');
    const dateIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DATE');
    const dayPriceIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DAY PRICE');

    if (codeIndex === -1 || dateIndex === -1 || dayPriceIndex === -1) {
        console.error("Error: Missing 'Code', 'Date', or 'Day Price' header in CSV.");
        return [];
    }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length === headers.length) {
            const symbol = values[codeIndex];
            const dateStr = values[dateIndex];
            const currentPriceStr = values[dayPriceIndex];

            // Basic validation for critical fields
            if (!symbol || !dateStr || !currentPriceStr) {
                // console.warn(`Skipping malformed row: ${line}`);
                continue;
            }

            const date = new Date(dateStr);
            const currentPrice = parseFloat(currentPriceStr.replace(/,/g, '')); // Remove commas for parsing

            if (isNaN(date.getTime()) || isNaN(currentPrice)) {
                // console.warn(`Skipping row with invalid date or price: ${line}`);
                continue;
            }

            if (!latestData[symbol] || date > new Date(latestData[symbol].Date)) {
                latestData[symbol] = {
                    Date: dateStr,
                    Code: symbol,
                    'Day Price': currentPrice,
                    Name: values[headers.findIndex(h => h.trim().toUpperCase() === 'NAME')]
                };
            }
        } else {
            // console.warn(`Row has incorrect number of columns (expected ${headers.length}, got ${values.length}): ${line}`);
        }
    }
    return Object.values(latestData);
}

/**
 * Get all available stocks from the training data
 */
export function getAvailableStocks(): StockInfo[] {
  try {
    if (!fs.existsSync(STOCKS_CSV)) {
      console.error('Stocks CSV not found:', STOCKS_CSV);
      return [];
    }
    
    // Load sector information
    const sectorMap = loadSectorData();
    
    // Read stocks CSV
    const content = fs.readFileSync(STOCKS_CSV, 'utf-8');
    const lines = content.split('\n');
    
    if (lines.length < 2) {
      return [];
    }
    
    const latestData = getLatestDataFromCsvLines(lines);

    // Convert to array and sort by code
    const stocks = latestData.map(stock => {
        const sectorInfo = sectorMap.get(stock.Code.toUpperCase());
        return {
            code: stock.Code,
            name: sectorInfo?.name || stock.Name,
            sector: sectorInfo?.sector,
        }
    }).sort((a, b) => a.code.localeCompare(b.code));
    
    return stocks;
  } catch (error) {
    console.error('Error reading available stocks:', error);
    return [];
  }
}

/**
 * Get stocks grouped by sector
 */
export function getStocksBySector(): Map<string, StockInfo[]> {
  const stocks = getAvailableStocks();
  const grouped = new Map<string, StockInfo[]>();
  
  stocks.forEach(stock => {
    const sector = stock.sector || 'Other';
    if (!grouped.has(sector)) {
      grouped.set(sector, []);
    }
    grouped.get(sector)!.push(stock);
  });
  
  // Sort sectors alphabetically
  return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}



