"use client";

import { useState } from 'react';
import { Stock } from '@/types';
import { CombinedPrediction } from '@/types/ml-api';
import { formatCurrency, formatPercent, formatLargeNumber, getChangeColor } from '@/lib/utils';
import { Brain, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface StockTableWithMLProps {
  stocks: Stock[];
  onStockClick?: (symbol: string) => void;
  onPredictionsComplete?: (predictions: CombinedPrediction[]) => void;
}

export function StockTableWithML({ stocks, onStockClick, onPredictionsComplete }: StockTableWithMLProps) {
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
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
    if (selectedStocks.size === stocks.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(stocks.map(s => s.symbol)));
    }
  };

  const runPredictions = async () => {
    if (selectedStocks.size === 0) {
      setError('Please select at least one stock');
      return;
    }

    setIsLoading(true);
    setError(null);

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
      
      // Notify parent component
      if (onPredictionsComplete) {
        onPredictionsComplete(predictionResults.predictions);
      }

    } catch (err) {
      console.error('Prediction error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ML Prediction Controls */}
      <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-lg">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {selectedStocks.size} stock{selectedStocks.size !== 1 ? 's' : ''} selected
          </span>
          {error && (
            <span className="text-sm text-destructive">{error}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={runPredictions}
            disabled={isLoading || selectedStocks.size === 0}
            size="sm"
            className="bg-[#F79D00] hover:bg-[#F79D00]/90 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Predictions...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Run ML Predictions ({selectedStocks.size})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4">
                <Checkbox
                  checked={selectedStocks.size === stocks.length}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="text-left py-3 px-4 text-sm text-muted-foreground">Symbol</th>
              <th className="text-left py-3 px-4 text-sm text-muted-foreground">Name</th>
              <th className="text-left py-3 px-4 text-sm text-muted-foreground">Sector</th>
              <th className="text-right py-3 px-4 text-sm text-muted-foreground">Price</th>
              <th className="text-right py-3 px-4 text-sm text-muted-foreground">Change</th>
              <th className="text-right py-3 px-4 text-sm text-muted-foreground">Volume</th>
              <th className="text-right py-3 px-4 text-sm text-muted-foreground">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr
                key={stock.symbol}
                className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${
                  selectedStocks.has(stock.symbol) ? 'bg-[#F79D00]/10' : ''
                }`}
                onClick={() => onStockClick?.(stock.symbol)}
              >
                <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedStocks.has(stock.symbol)}
                    onCheckedChange={() => toggleStock(stock.symbol)}
                  />
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium text-[#F79D00]">{stock.symbol}</span>
                </td>
                <td className="py-3 px-4">{stock.name}</td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{stock.sector}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(stock.currentPrice)}</td>
                <td className={`py-3 px-4 text-right ${getChangeColor(stock.changePercent)}`}>
                  {formatPercent(stock.changePercent)}
                </td>
                <td className="py-3 px-4 text-right text-sm">{formatLargeNumber(stock.volume)}</td>
                <td className="py-3 px-4 text-right text-sm">
                  {stock.marketCap ? formatLargeNumber(stock.marketCap) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
