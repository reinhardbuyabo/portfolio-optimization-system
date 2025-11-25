import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// --- Configuration ---
const DATASETS_DIR = path.join(process.cwd(), 'ml', 'datasets');
const STOCKS_CSV = path.join(DATASETS_DIR, 'NSE_data_all_stocks_2024_jan_to_oct.csv');

// --- Utility Functions ---

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

async function loadMarketData() {
    console.log("--- Starting Market Data Loading Script ---");

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
        
        const headers = parseCSVLine(lines[0]);
        const codeIndex = headers.findIndex(h => h.trim().toUpperCase() === 'CODE');
        const nameIndex = headers.findIndex(h => h.trim().toUpperCase() === 'NAME');
        const dateIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DATE');
        const openIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DAY LOW');
        const highIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DAY HIGH');
        const lowIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DAY LOW');
        const closeIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DAY PRICE');
        const volumeIndex = headers.findIndex(h => h.trim().toUpperCase() === 'VOLUME');
        
        console.log("Clearing old market data...");
        await prisma.marketData.deleteMany({});
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = parseCSVLine(line);
            if (values.length === headers.length) {
                const ticker = values[codeIndex];
                const name = values[nameIndex];
                const date = new Date(values[dateIndex]);
                const open = parseFloat(values[openIndex].replace(/,/g, ''));
                const high = parseFloat(values[highIndex].replace(/,/g, ''));
                const low = parseFloat(values[lowIndex].replace(/,/g, ''));
                const close = parseFloat(values[closeIndex].replace(/,/g, ''));
                const volume = parseInt(values[volumeIndex].replace(/,/g, ''));

                if (!ticker || !name || isNaN(date.getTime()) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume)) {
                    continue;
                }

                let asset = await prisma.asset.findUnique({
                    where: { ticker },
                });

                if (!asset) {
                    asset = await prisma.asset.create({
                        data: {
                            ticker,
                            name,
                            sector: 'N/A', // You may want to load this from another file
                        },
                    });
                }
                
                await prisma.marketData.create({
                    data: {
                        assetId: asset.id,
                        date,
                        open,
                        high,
                        low,
                        close,
                        volume,
                    },
                });
            }
        }
    } catch (error) {
        console.error("An unexpected error occurred:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }

    console.log("--- Market Data Loading Script Finished ---");
}

loadMarketData();
