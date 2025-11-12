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

export async function GET(request: NextRequest) {
    try {
        const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
        const jsonData = parseCSV(fileContent);

        const filteredData = jsonData.filter(row => {
            return !isNaN(parseFloat(row.Open)) &&
                   !isNaN(parseFloat(row.High)) &&
                   !isNaN(parseFloat(row.Low)) &&
                   !isNaN(parseFloat(row.Close)) &&
                   !isNaN(parseInt(row.Volume));
        });

        const timeSeries = filteredData.map(row => ({
            timestamp: new Date(row.Date).getTime(),
            symbol: row.Symbol,
            open: parseFloat(row.Open),
            high: parseFloat(row.High),
            low: parseFloat(row.Low),
            close: parseFloat(row.Close),
            volume: parseInt(row.Volume)
        }));

        const summary = filteredData.reduce((acc: any[], row) => {
            const existing = acc.find(item => item.symbol === row.Symbol);
            if (existing) {
                existing.volume += parseInt(row.Volume);
                if (new Date(row.Date) > new Date(existing.last_updated)) {
                    existing.last_updated = row.Date;
                    existing.price = parseFloat(row.Close);
                    existing.open = parseFloat(row.Open);
                    existing.high = parseFloat(row.High);
                    existing.low = parseFloat(row.Low);
                    existing.change = existing.price - existing.open;
                    existing.pct_change = (existing.change / existing.open);
                }
            } else {
                const price = parseFloat(row.Close);
                const open = parseFloat(row.Open);
                const change = price - open;
                const pct_change = (change / open);
                acc.push({
                    symbol: row.Symbol,
                    price: price,
                    change: change,
                    pct_change: pct_change,
                    open: open,
                    high: parseFloat(row.High),
                    low: parseFloat(row.Low),
                    volume: parseInt(row.Volume),
                    last_updated: row.Date,
                });
            }
            return acc;
        }, []);

        const sanitizedSummary = summary.map(item => ({
            ...item,
            price: isNaN(item.price) ? 0 : item.price,
            change: isNaN(item.change) ? 0 : item.change,
            pct_change: isNaN(item.pct_change) ? 0 : item.pct_change,
            open: isNaN(item.open) ? 0 : item.open,
            high: isNaN(item.high) ? 0 : item.high,
            low: isNaN(item.low) ? 0 : item.low,
            volume: isNaN(item.volume) ? 0 : item.volume,
        }));

        return NextResponse.json({ time_series: timeSeries, summary: sanitizedSummary });

    } catch (error) {
        console.error("Error reading or parsing CSV file:", error);
        return NextResponse.json({ error: 'Failed to read or parse CSV file' }, { status: 500 });
    }
}
