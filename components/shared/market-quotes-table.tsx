"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Brain } from 'lucide-react';
import PredictionDisplay from './prediction-display';
import { CombinedPrediction } from '@/types/ml-api';

interface StockSummary {
  symbol: string;
  price: number;
  change: number;
  pct_change: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

interface MarketQuotesTableProps {
  data: StockSummary[];
}

const MarketQuotesTable: React.FC<MarketQuotesTableProps> = ({ data }) => {
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState<CombinedPrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleStock = (symbol: string) => {
    const newSelected = new Set(selectedStocks);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      newSelected.add(symbol);
    }
    setSelectedStocks(newSelected);
  };

  const toggleAll = () => {
    if (selectedStocks.size === data.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(data.map(s => s.symbol)));
    }
  };

  const runPredictions = async () => {
    if (selectedStocks.size === 0) {
      setError('Please select at least one stock');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPredictions([]);

    try {
      const symbols = Array.from(selectedStocks);

      // Step 1: Prepare historical data
      const prepareResponse = await fetch('/api/ml/prepare-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      });

      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json();
        throw new Error(errorData.error || 'Failed to prepare data');
      }

      const preparedData = await prepareResponse.json();

      // Step 2: Run predictions
      const predictResponse = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preparedData),
      });

      if (!predictResponse.ok) {
        const errorData = await predictResponse.json();
        throw new Error(errorData.error || 'Predictions failed');
      }

      const predictionResults = await predictResponse.json();
      setPredictions(predictionResults.predictions);
      setShowPredictions(true);

    } catch (err) {
      console.error('Prediction error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div data-testid="market-quotes-table" className="overflow-x-auto relative shadow-md sm:rounded-lg mt-10">
        {/* Action Bar */}
        <div className="bg-gray-100 dark:bg-gray-700 px-6 py-3 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {selectedStocks.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={runPredictions}
              disabled={isLoading || selectedStocks.size === 0}
              size="sm"
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Run ML Predictions
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 px-6 py-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="py-3 px-6">
                <Checkbox
                  checked={selectedStocks.size === data.length}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th scope="col" className="py-3 px-6">Symbol</th>
              <th scope="col" className="py-3 px-6">Price</th>
              <th scope="col" className="py-3 px-6">Change</th>
              <th scope="col" className="py-3 px-6">% Change</th>
              <th scope="col" className="py-3 px-6">Open</th>
              <th scope="col" className="py-3 px-6">High</th>
              <th scope="col" className="py-3 px-6">Low</th>
              <th scope="col" className="py-3 px-6">Volume</th>
            </tr>
          </thead>
          <tbody>
            {data.map((stock) => (
              <tr
                key={stock.symbol}
                className={`border-b dark:border-gray-700 ${
                  selectedStocks.has(stock.symbol)
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'bg-white dark:bg-gray-800'
                }`}
              >
                <td className="py-4 px-6">
                  <Checkbox
                    checked={selectedStocks.has(stock.symbol)}
                    onCheckedChange={() => toggleStock(stock.symbol)}
                  />
                </td>
                <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  {stock.symbol}
                </th>
                <td className="py-4 px-6">{stock.price.toFixed(2)}</td>
                <td className={`py-4 px-6 ${stock.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stock.change.toFixed(2)}
                </td>
                <td className={`py-4 px-6 ${stock.pct_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(stock.pct_change * 100).toFixed(2)}%
                </td>
                <td className="py-4 px-6">{stock.open.toFixed(2)}</td>
                <td className="py-4 px-6">{stock.high.toFixed(2)}</td>
                <td className="py-4 px-6">{stock.low.toFixed(2)}</td>
                <td className="py-4 px-6">{stock.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Predictions Dialog */}
      <Dialog open={showPredictions} onOpenChange={setShowPredictions}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ML Predictions Results</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {predictions.map((prediction) => {
              const stock = data.find(s => s.symbol === prediction.symbol);
              return (
                <PredictionDisplay
                  key={prediction.symbol}
                  prediction={prediction}
                  currentPrice={stock?.price}
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MarketQuotesTable;
