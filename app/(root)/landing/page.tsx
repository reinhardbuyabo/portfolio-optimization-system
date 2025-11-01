'use client';

import { useEffect, useState } from "react";
import SyntheticMarketChart from "@/components/shared/synthetic-market-chart";
import MarketQuotesTable from "@/components/shared/market-quotes-table";
import StockHeatmap from "@/components/shared/stock-heatmap";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import HeatmapKey from "@/components/shared/heatmap-key";
import { Label } from "@/components/ui/label";
import NewsDisplay from "@/components/shared/news-display";

export default function LandingPage() {
  const [data, setData] = useState<{ time_series: any[], summary: any[] }>({ time_series: [], summary: [] });
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [marketHorizon, setMarketHorizon] = useState<string>("1M");

  useEffect(() => {
    async function fetchData() {
      console.log("Fetching data for horizon:", marketHorizon);
      try {
        const response = await fetch(`/api/market-data?horizon=${marketHorizon}`);
        const jsonData = await response.json();
        console.log("Fetched data:", jsonData);
        setData(jsonData);
        if (jsonData.summary.length > 0 && !selectedSymbol) {
          setSelectedSymbol(jsonData.summary[0].symbol);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    fetchData();
  }, [marketHorizon]);

  return (
    <main className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-10">
        <NewsDisplay />

        <div className="w-full max-w-6xl flex items-start justify-center md:space-x-10">
          {/* Chart */}
          <div className="w-full md:w-2/3" data-testid="synthetic-market-chart">
            {data.time_series.length > 0 && <SyntheticMarketChart data={data.time_series} selectedSymbol={selectedSymbol} marketHorizon={marketHorizon} />}
          </div>

          <div className="w-full md:w-1/3 flex flex-col items-center space-y-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="px-4 py-2 border rounded-lg font-bold">
                {selectedSymbol || "Select Symbol"}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {data.summary.map(stock => (
                  <DropdownMenuItem key={stock.symbol} onSelect={() => setSelectedSymbol(stock.symbol)}>
                    {stock.symbol}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <RadioGroup defaultValue="1M" onValueChange={setMarketHorizon} className="grid grid-cols-2 grid-rows-4 gap-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1H" id="1H" className="sr-only" />
                <Label htmlFor="1H" className={`radio-button-label px-4 py-2 border rounded-lg cursor-pointer ${marketHorizon === '1H' ? 'font-bold text-black' : ''}`}>1H</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1D" id="1D" className="sr-only" />
                <Label htmlFor="1D" className={`radio-button-label px-4 py-2 border rounded-lg cursor-pointer ${marketHorizon === '1D' ? 'font-bold text-black' : ''}`}>1D</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3D" id="3D" className="sr-only" />
                <Label htmlFor="3D" className={`radio-button-label px-4 py-2 border rounded-lg cursor-pointer ${marketHorizon === '3D' ? 'font-bold text-black' : ''}`}>3D</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1W" id="1W" className="sr-only" />
                <Label htmlFor="1W" className={`radio-button-label px-4 py-2 border rounded-lg cursor-pointer ${marketHorizon === '1W' ? 'font-bold text-black' : ''}`}>1W</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1M" id="1M" className="sr-only" />
                <Label htmlFor="1M" className={`radio-button-label px-4 py-2 border rounded-lg cursor-pointer ${marketHorizon === '1M' ? 'font-bold text-black' : ''}`}>1M</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3M" id="3M" className="sr-only" />
                <Label htmlFor="3M" className={`radio-button-label px-4 py-2 border rounded-lg cursor-pointer ${marketHorizon === '3M' ? 'font-bold text-black' : ''}`}>3M</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1Y" id="1Y" className="sr-only" />
                <Label htmlFor="1Y" className={`radio-button-label px-4 py-2 border rounded-lg cursor-pointer ${marketHorizon === '1Y' ? 'font-bold text-black' : ''}`}>1Y</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="5Y" id="5Y" className="sr-only" />
                <Label htmlFor="5Y" className={`radio-button-label px-4 py-2 border rounded-lg cursor-pointer ${marketHorizon === '5Y' ? 'font-bold text-black' : ''}`}>5Y</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="w-full max-w-6xl flex items-center justify-center md:space-x-10">
          {/* Heatmap */}
          <div className="w-full md:w-2/3" data-testid="stock-heatmap">
            <h2 className="text-2xl font-bold text-center mb-5">Stock Heatmap</h2>
            {data.summary.length > 0 && <StockHeatmap data={data.summary} />}
          </div>
          <div className="w-full md:w-1/3 flex flex-col items-center justify-center space-y-4">
            <HeatmapKey />
          </div>
        </div>

        {/* Quotes Table */}
        <div className="w-full max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-5">Market Quotes</h2>
          {data.summary.length > 0 && <MarketQuotesTable data={data.summary} />}
        </div>
      </div>
    </main>
  );
}
