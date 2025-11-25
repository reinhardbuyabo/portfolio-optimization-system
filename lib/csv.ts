import fs from 'fs';
import path from 'path';

const DATASETS_DIR = path.join(process.cwd(), 'ml', 'datasets');
const STOCKS_CSV = path.join(DATASETS_DIR, 'NSE_data_all_stocks_2024_jan_to_oct.csv');

export function parseCSVLine(line: string): string[] {
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

export function getLatestDataFromCsvLines(lines: string[]): any[] {
    const latestData: { [key: string]: any } = {};
    const headers = parseCSVLine(lines[0]);
    const codeIndex = headers.findIndex(h => h.trim().toUpperCase() === 'CODE');
    const dateIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DATE');
    const dayPriceIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DAY PRICE');
    const nameIndex = headers.findIndex(h => h.trim().toUpperCase() === 'NAME');
    const sectorIndex = headers.findIndex(h => h.trim().toUpperCase() === 'SECTOR');


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

            if (!symbol || !dateStr || !currentPriceStr) {
                continue;
            }

            const date = new Date(dateStr);
            const currentPrice = parseFloat(currentPriceStr.replace(/,/g, ''));

            if (isNaN(date.getTime()) || isNaN(currentPrice)) {
                continue;
            }

            if (!latestData[symbol] || date > new Date(latestData[symbol].Date)) {
                const entry: { [key: string]: string | number } = {};
                headers.forEach((header, j) => {
                    entry[header] = values[j];
                });
                latestData[symbol] = entry;
            }
        }
    }
    return Object.values(latestData);
}
