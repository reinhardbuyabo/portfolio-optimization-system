import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const STOCKS_CSV_PATH = path.join(process.cwd(), 'ml', 'datasets', 'NSE_data_all_stocks_2024_jan_to_oct.csv');
const SECTORS_CSV_PATH = path.join(process.cwd(), 'ml', 'datasets', 'NSE_data_stock_market_sectors_2023_2024.csv');

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

function loadSectorData(): Map<string, string> {
    const sectorMap = new Map<string, string>();
    if (!fs.existsSync(SECTORS_CSV_PATH)) {
        console.warn(`Sectors CSV not found at: ${SECTORS_CSV_PATH}`);
        return sectorMap;
    }
    const fileContent = fs.readFileSync(SECTORS_CSV_PATH, 'utf-8');
    const lines = fileContent.split('\n');
    const headers = parseCSVLine(lines[0]);
    const sectorIndex = headers.findIndex(h => h.trim().toUpperCase() === 'SECTOR');
    const codeIndex = headers.findIndex(h => h.trim().toUpperCase() === 'STOCK_CODE');

    if (sectorIndex === -1 || codeIndex === -1) {
        console.error("Sector or Stock_code column not found in sectors CSV.");
        return sectorMap;
    }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseCSVLine(line);
        if (values.length === headers.length) {
            const sector = values[sectorIndex];
            const code = values[codeIndex];
            if (sector && code) {
                sectorMap.set(code.trim().toUpperCase(), sector.trim());
            }
        }
    }
    return sectorMap;
}

async function main() {
    console.log("--- Starting Database Seeding Script ---");

    try {
        // 1. Read the CSV file
        if (!fs.existsSync(STOCKS_CSV_PATH)) {
            throw new Error(`CSV file not found at: ${STOCKS_CSV_PATH}`);
        }
        const fileContent = fs.readFileSync(STOCKS_CSV_PATH, 'utf-8');
        const lines = fileContent.split('\n');
        const headers = parseCSVLine(lines[0]);

        // Find header indices
        const codeIndex = headers.findIndex(h => h.trim().toUpperCase() === 'CODE');
        const nameIndex = headers.findIndex(h => h.trim().toUpperCase() === 'NAME');
        const dateIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DATE');
        const openIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DAY LOW');
        const highIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DAY HIGH');
        const lowIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DAY LOW');
        const closeIndex = headers.findIndex(h => h.trim().toUpperCase() === 'DAY PRICE');
        const volumeIndex = headers.findIndex(h => h.trim().toUpperCase() === 'VOLUME');

        if ([codeIndex, nameIndex, dateIndex, openIndex, highIndex, lowIndex, closeIndex, volumeIndex].includes(-1)) {
            throw new Error("One or more required columns are missing in the main stock CSV file.");
        }

        // 2. Get the latest data for each stock
        const latestData: { [key: string]: any } = {};
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const values = parseCSVLine(line);
            if (values.length === headers.length) {
                const ticker = values[codeIndex];
                const date = new Date(values[dateIndex]);
                if (ticker && !isNaN(date.getTime())) {
                    if (!latestData[ticker] || date >= new Date(latestData[ticker].Date)) {
                        const entry: { [key: string]: string } = {};
                        headers.forEach((header, j) => {
                            entry[header] = values[j];
                        });
                        latestData[ticker] = entry;
                    }
                }
            }
        }
        
        const latestStockData = Object.values(latestData);
        console.log(`Found ${latestStockData.length} unique stocks to seed.`);

        // 3. Load Sector Data
        const sectorMap = loadSectorData();
        console.log(`Loaded ${sectorMap.size} sector mappings.`);

        // 4. Clear existing Asset and MarketData tables
        console.log("Clearing old Asset and MarketData tables...");
        await prisma.marketData.deleteMany({});
        await prisma.asset.deleteMany({});

        // 5. Populate the database
        console.log("Seeding new data...");
        for (const stock of latestStockData) {
            const ticker = stock.Code;
            const name = stock.Name;
            const date = new Date(stock.Date);
            const open = parseFloat(stock['Day Low']?.replace(/,/g, '') || '0');
            const high = parseFloat(stock['Day High']?.replace(/,/g, '') || '0');
            const low = parseFloat(stock['Day Low']?.replace(/,/g, '') || '0');
            const close = parseFloat(stock['Day Price']?.replace(/,/g, '') || '0');
            const volume = parseInt(stock.Volume?.replace(/,/g, '') || '0');

            if (ticker && name && !isNaN(date.getTime()) && !isNaN(close) && !isNaN(volume)) {
                const asset = await prisma.asset.create({
                    data: {
                        ticker,
                        name,
                        sector: sectorMap.get(ticker.toUpperCase()) || 'Other',
                    }
                });

                await prisma.marketData.create({
                    data: {
                        assetId: asset.id,
                        ticker: asset.ticker,
                        date,
                        open,
                        high,
                        low,
                        close,
                        volume
                    }
                });
            }
        }

        console.log("✅ Database seeded successfully with latest stock data!");

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
