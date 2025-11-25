import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const csvFilePath = path.join(process.cwd(), 'ml', 'datasets', 'NSE_data_all_stocks_2024_jan_to_oct.csv');

function parseCSV(csv: string) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const values = line.split(',');
            if (values.length === headers.length) {
                const entry: { [key: string]: string } = {};
                for (let j = 0; j < headers.length; j++) {
                    entry[headers[j]] = values[j];
                }
                data.push(entry);
            }
        }
    }
    return data;
}

function getLatestData(data: any[]) {
    const latestData: { [key: string]: any } = {};
    for (const row of data) {
        const symbol = row.Symbol;
        if (!latestData[symbol] || new Date(row.Date) > new Date(latestData[symbol].Date)) {
            latestData[symbol] = row;
        }
    }
    return Object.values(latestData);
}

export async function GET(request: NextRequest) {
    try {
        const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
        const jsonData = parseCSV(fileContent);

        const latestData = getLatestData(jsonData);

        const timeSeries = latestData.map(row => ({
            timestamp: new Date(row.Date).getTime(),
            symbol: row.Symbol,
            open: parseFloat(row.Open),
            high: parseFloat(row.High),
            low: parseFloat(row.Low),
            close: parseFloat(row.Close),
            volume: parseInt(row.Volume)
        }));

        const summary = latestData.map(row => {
            const price = parseFloat(row.Close);
            const open = parseFloat(row.Open);
            const change = price - open;
            const pct_change = (change / open);
            return {
                symbol: row.Symbol,
                price: isNaN(price) ? 0 : price,
                change: isNaN(change) ? 0 : change,
                pct_change: isNaN(pct_change) ? 0 : pct_change,
                open: isNaN(open) ? 0 : open,
                high: isNaN(parseFloat(row.High)) ? 0 : parseFloat(row.High),
                low: isNaN(parseFloat(row.Low)) ? 0 : parseFloat(row.Low),
                volume: isNaN(parseInt(row.Volume)) ? 0 : parseInt(row.Volume),
                last_updated: row.Date,
            };
        });

        return NextResponse.json({ time_series: timeSeries, summary: summary });

    } catch (error) {
        console.error("Error reading or parsing CSV file:", error);
        return NextResponse.json({ error: 'Failed to read or parse CSV file' }, { status: 500 });
    }
}
