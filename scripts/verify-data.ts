import fs from 'fs';
import path from 'path';

// --- Configuration ---
const DATASETS_DIR = path.join(process.cwd(), 'ml', 'datasets');
const STOCKS_CSV = path.join(DATASETS_DIR, 'NSE_data_all_stocks_2024_jan_to_oct.csv');

// --- Utility Functions (Copied from lib/api/get-available-stocks.ts for self-containment) ---

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
 * Extracts the latest data for each stock from an array of CSV lines.
 */
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
                    // Store other relevant fields if needed, or reconstruct full row
                    // For now, just store what's essential for verification
                };
            }
        } else {
            // console.warn(`Row has incorrect number of columns (expected ${headers.length}, got ${values.length}): ${line}`);
        }
    }
    return Object.values(latestData);
}

// --- Main Verification Logic ---
async function verifyData() {
    console.log("--- Starting Data Verification Script ---");

    try {
        if (!fs.existsSync(STOCKS_CSV)) {
            console.error(`Error: Stocks CSV not found at ${STOCKS_CSV}`);
            process.exit(1);
        }

        const fileContent = fs.readFileSync(STOCKS_CSV, 'utf-8');
        const lines = fileContent.split('\n');

        if (lines.length < 2) {
            console.error("Error: CSV file contains no data rows.");
            process.exit(1);
        }

        const latestStockData = getLatestDataFromCsvLines(lines);

        console.log(`\nFound ${latestStockData.length} unique stocks with their latest data.`);

        const exampleSymbols = ["SCOM", "EQTY", "KCB", "SAFCOM"]; // SAFCOM to test missing
        console.log("\n--- Latest Prices for Example Stocks ---");

        for (const symbol of exampleSymbols) {
            const stock = latestStockData.find(s => s.Code.toUpperCase() === symbol.toUpperCase());
            if (stock) {
                console.log(
                    `  ${stock.Code}: Ksh ${stock['Day Price'].toFixed(2)} (as of ${stock.Date})`
                );
            } else {
                console.log(`  ${symbol}: Not found in latest data.`);
            }
        }
        
        // Additional checks if needed
        const scomData = latestStockData.find(s => s.Code.toUpperCase() === "SCOM");
        if (scomData && scomData['Day Price'] === 16.75 && scomData.Date === "31-Oct-2024") {
            console.log("\n✅ SCOM price and date match expected values from Oct 31, 2024.");
        } else if (scomData) {
            console.log(`\n❌ SCOM data found: Ksh ${scomData['Day Price']} (as of ${scomData.Date}). Expected: Ksh 16.75 (31-Oct-2024).`);
        } else {
            console.log("\n❌ SCOM data not found in latest processed data.");
        }


    } catch (error) {
        console.error("An unexpected error occurred:", error);
        process.exit(1);
    }

    console.log("\n--- Data Verification Script Finished ---");
}

verifyData();
