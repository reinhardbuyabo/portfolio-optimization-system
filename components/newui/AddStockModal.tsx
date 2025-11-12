"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Search, TrendingUp, TrendingDown, Plus, Check } from "lucide-react";

interface StockWithPrediction {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  predictedReturn?: number;
  volatility?: number;
  beta?: number;
  sharpeRatio?: number;
  hasLSTMData: boolean;
  hasGARCHData: boolean;
}

interface AddStockModalProps {
  open: boolean;
  onClose: () => void;
  onAddStocks: (stocks: StockWithPrediction[]) => void;
  portfolioName: string;
  existingSymbols?: string[]; // symbols already in the portfolio (case-insensitive)
}

// Mock NSE stocks data
const mockNSEStocks: StockWithPrediction[] = [
  {
    symbol: "SCOM",
    name: "Safaricom PLC",
    sector: "Telecommunications",
    currentPrice: 32.5,
    change: 0.5,
    changePercent: 0.0156,
    predictedReturn: 0.063,
    volatility: 0.081,
    beta: 0.72,
    sharpeRatio: 0.78,
    hasLSTMData: true,
    hasGARCHData: true,
  },
  {
    symbol: "EQTY",
    name: "Equity Group Holdings",
    sector: "Banking",
    currentPrice: 58.75,
    change: -1.25,
    changePercent: -0.0208,
    predictedReturn: 0.072,
    volatility: 0.124,
    beta: 0.95,
    sharpeRatio: 0.58,
    hasLSTMData: true,
    hasGARCHData: true,
  },
  {
    symbol: "KCB",
    name: "KCB Group",
    sector: "Banking",
    currentPrice: 45.0,
    change: 0.75,
    changePercent: 0.0169,
    predictedReturn: 0.055,
    volatility: 0.098,
    beta: 0.88,
    sharpeRatio: 0.56,
    hasLSTMData: true,
    hasGARCHData: true,
  },
  {
    symbol: "ABSA",
    name: "Absa Bank Kenya",
    sector: "Banking",
    currentPrice: 12.85,
    change: 0.15,
    changePercent: 0.0118,
    predictedReturn: 0.048,
    volatility: 0.092,
    beta: 0.82,
    sharpeRatio: 0.52,
    hasLSTMData: true,
    hasGARCHData: true,
  },
  {
    symbol: "EABL",
    name: "East African Breweries",
    sector: "Consumer Goods",
    currentPrice: 185.0,
    change: -2.5,
    changePercent: -0.0133,
    predictedReturn: 0.041,
    volatility: 0.076,
    beta: 0.68,
    sharpeRatio: 0.54,
    hasLSTMData: true,
    hasGARCHData: true,
  },
  {
    symbol: "BAT",
    name: "British American Tobacco",
    sector: "Consumer Goods",
    currentPrice: 425.0,
    change: 5.0,
    changePercent: 0.0119,
    predictedReturn: 0.035,
    volatility: 0.063,
    beta: 0.55,
    sharpeRatio: 0.56,
    hasLSTMData: true,
    hasGARCHData: true,
  },
  {
    symbol: "SCBK",
    name: "Standard Chartered Bank",
    sector: "Banking",
    currentPrice: 156.0,
    change: 2.0,
    changePercent: 0.013,
    predictedReturn: 0.052,
    volatility: 0.087,
    beta: 0.79,
    sharpeRatio: 0.6,
    hasLSTMData: true,
    hasGARCHData: true,
  },
  {
    symbol: "COOP",
    name: "Co-operative Bank",
    sector: "Banking",
    currentPrice: 14.5,
    change: -0.25,
    changePercent: -0.017,
    predictedReturn: 0.058,
    volatility: 0.095,
    beta: 0.85,
    sharpeRatio: 0.61,
    hasLSTMData: true,
    hasGARCHData: true,
  },
  {
    symbol: "BAMB",
    name: "Bamburi Cement",
    sector: "Construction",
    currentPrice: 22.5,
    change: 0.5,
    changePercent: 0.0227,
    predictedReturn: 0.045,
    volatility: 0.112,
    beta: 0.92,
    sharpeRatio: 0.4,
    hasLSTMData: true,
    hasGARCHData: false,
  },
  {
    symbol: "KGN",
    name: "Kenya Airways",
    sector: "Transport",
    currentPrice: 3.85,
    change: 0.15,
    changePercent: 0.0405,
    predictedReturn: 0.082,
    volatility: 0.215,
    beta: 1.35,
    sharpeRatio: 0.38,
    hasLSTMData: true,
    hasGARCHData: true,
  },
  {
    symbol: "KPLC",
    name: "Kenya Power & Lighting",
    sector: "Energy",
    currentPrice: 1.95,
    change: -0.05,
    changePercent: -0.025,
    predictedReturn: 0.028,
    volatility: 0.156,
    beta: 1.12,
    sharpeRatio: 0.18,
    hasLSTMData: false,
    hasGARCHData: true,
  },
  {
    symbol: "TOTL",
    name: "Total Energies",
    sector: "Energy",
    currentPrice: 320.0,
    change: 5.0,
    changePercent: 0.0159,
    predictedReturn: 0.038,
    volatility: 0.074,
    beta: 0.65,
    sharpeRatio: 0.51,
    hasLSTMData: true,
    hasGARCHData: true,
  },
];

export function AddStockModal({ open, onClose, onAddStocks, portfolioName, existingSymbols = [] }: AddStockModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [volatilityFilter, setVolatilityFilter] = useState<string>("all");
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());

  // Get unique sectors
  const sectors = ["all", ...new Set(mockNSEStocks.map((s) => s.sector))];

  // Filter stocks
  const filteredStocks = mockNSEStocks.filter((stock) => {
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSector = sectorFilter === "all" || stock.sector === sectorFilter;

    let matchesVolatility = true;
    if (volatilityFilter === "low" && stock.volatility && stock.volatility >= 0.1) {
      matchesVolatility = false;
    } else if (
      volatilityFilter === "medium" &&
      stock.volatility &&
      (stock.volatility < 0.1 || stock.volatility >= 0.2)
    ) {
      matchesVolatility = false;
    } else if (volatilityFilter === "high" && stock.volatility && stock.volatility < 0.2) {
      matchesVolatility = false;
    }

    return matchesSearch && matchesSector && matchesVolatility;
  });

  const toggleStock = (symbol: string) => {
    const newSelected = new Set(selectedStocks);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      newSelected.add(symbol);
    }
    setSelectedStocks(newSelected);
  };

  const handleAddStocks = () => {
    const stocksToAdd = mockNSEStocks.filter((s) => selectedStocks.has(s.symbol));
    onAddStocks(stocksToAdd);
    setSelectedStocks(new Set());
    setSearchQuery("");
    onClose();
  };

  const totalAllocation = selectedStocks.size > 0 ? 100 / selectedStocks.size : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add Stocks to {portfolioName}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Search and select NSE-listed stocks with LSTM predictions and GARCH volatility data
          </p>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by symbol or company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1"
              aria-label="Search stocks"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-2 block">Sector</label>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1"
              >
                {sectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector === "all" ? "All Sectors" : sector}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-2 block">Volatility Range</label>
              <select
                value={volatilityFilter}
                onChange={(e) => setVolatilityFilter(e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1"
              >
                <option value="all">All Volatility</option>
                <option value="low">Low (&lt; 10%)</option>
                <option value="medium">Medium (10-20%)</option>
                <option value="high">High (&gt; 20%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stock List */}
        <div className="flex-1 overflow-y-auto border border-border rounded-lg">
          {filteredStocks.length > 0 ? (
            <table className="w-full">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-4 text-sm font-medium w-12"></th>
                  <th className="text-left p-4 text-sm font-medium">Symbol</th>
                  <th className="text-left p-4 text-sm font-medium">Company</th>
                  <th className="text-right p-4 text-sm font-medium">Price</th>
                  <th className="text-right p-4 text-sm font-medium">Predicted Return</th>
                  <th className="text-right p-4 text-sm font-medium">Volatility</th>
                  <th className="text-right p-4 text-sm font-medium">Sharpe</th>
                  <th className="text-center p-4 text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock) => {
                  const isSelected = selectedStocks.has(stock.symbol);
                  const isDisabled = existingSymbols.map((s) => s.toUpperCase()).includes(stock.symbol.toUpperCase());
                  return (
                    <tr
                      key={stock.symbol}
                      className={`border-t border-border transition-colors ${
                        isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30 cursor-pointer"
                      } ${isSelected ? "bg-muted/50" : ""}`}
                      onClick={() => {
                        if (isDisabled) return;
                        toggleStock(stock.symbol);
                      }}
                    >
                      <td className="p-4">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-chart-1 border-chart-1" : "border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-background" />}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {stock.symbol}
                            {isDisabled && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border">In portfolio</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{stock.sector}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{stock.name}</td>
                      <td className="p-4 text-right">
                        <p className="font-medium">{formatCurrency(stock.currentPrice)}</p>
                        <p className={`text-xs ${stock.changePercent >= 0 ? "text-success" : "text-destructive"}`}>
                          {stock.changePercent >= 0 ? (
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 inline mr-1" />
                          )}
                          {formatPercent(Math.abs(stock.changePercent))}
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        {stock.predictedReturn ? (
                          <span className="text-success font-medium">{formatPercent(stock.predictedReturn)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No prediction</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {stock.volatility ? (
                          <span className="font-medium">{formatPercent(stock.volatility)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {stock.sharpeRatio ? (
                          <span className="font-medium">{stock.sharpeRatio.toFixed(2)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isDisabled) return;
                            toggleStock(stock.symbol);
                          }}
                          disabled={isDisabled}
                          className={`p-2 rounded-lg transition-colors ${
                            isDisabled
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : isSelected
                              ? "bg-success/20 text-success hover:bg-success/30"
                              : "bg-muted hover:bg-muted/70"
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="mb-2">No results found</h3>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* Footer with Summary */}
        <DialogFooter className="flex-col sm:flex-row gap-4 border-t border-border pt-4">
          <div className="flex-1 text-sm">
            {selectedStocks.size > 0 ? (
              <div>
                <p className="font-medium">
                  {selectedStocks.size} Stock{selectedStocks.size !== 1 ? "s" : ""} Selected
                </p>
                <p className="text-muted-foreground">Equal allocation: ~{totalAllocation.toFixed(1)}% each</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No stocks selected</p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2 hover:bg-muted rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAddStocks}
              disabled={selectedStocks.size === 0}
              className="px-6 py-2 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Selected Stocks
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
