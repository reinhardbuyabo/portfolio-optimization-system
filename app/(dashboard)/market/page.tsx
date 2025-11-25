"use client";

import { useState, useEffect } from "react";
import { Stock } from "@/types";
import { CombinedPrediction } from "@/types/ml-api";
import { StockTableWithML } from "@/components/figma/StockTableWithML";
import { MLPredictionModal } from "@/components/figma/MLPredictionModal";
import { NewsCard } from "@/components/figma/NewsCard";
import { formatPercent, formatLargeNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, RefreshCw, Filter, AlertCircle } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  sentiment?: "positive" | "negative" | "neutral";
  publishedAt: Date | string;
}

export default function MarketOverviewPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [dataDate, setDataDate] = useState<string>("");
  
  // ML Predictions state
  const [predictions, setPredictions] = useState<CombinedPrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);

  // Fetch real market data from CSV
  useEffect(() => {
    fetchMarketData();
    fetchNews();
  }, []);
  
  const fetchNews = async () => {
    try {
      const response = await fetch('/api/news');
      if (response.ok) {
        const data = await response.json();
        setNews(Array.isArray(data) ? data.slice(0, 3) : []);
      }
    } catch (err) {
      console.error("Failed to fetch news:", err);
    }
  };

  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/market-data/latest');
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      const data = await response.json();
      setStocks(data.stocks);
      setDataDate(data.dataDate);
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMarketData();
    setRefreshing(false);
  };

  const handlePredictionsComplete = (newPredictions: CombinedPrediction[]) => {
    setPredictions(newPredictions);
    setShowPredictions(true);
  };

  const sectors = ["all", ...new Set(stocks.map((s) => s.sector))];
  const filteredStocks = selectedSector === "all" ? stocks : stocks.filter((s) => s.sector === selectedSector);

  // Market stats
  const gainers = stocks.filter((s) => s.changePercent > 0).length;
  const losers = stocks.filter((s) => s.changePercent < 0).length;
  const unchanged = stocks.filter((s) => s.changePercent === 0).length;
  const avgChange = stocks.length > 0 ? stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length : 0;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2">Market Overview</h1>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground">Real-time market data and analysis from the Nairobi Securities Exchange</p>
          {dataDate && (
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">Data as of: {dataDate}</span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#F79D00]" />
            <p className="text-muted-foreground">Loading market data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <h4 className="font-medium text-destructive mb-1">Failed to load market data</h4>
            <p className="text-sm text-destructive/80">{error}</p>
            <button
              onClick={fetchMarketData}
              className="mt-2 text-sm text-destructive hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && stocks.length > 0 && (
      <>
      {/* Market Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">NSE 20 Index</span>
            <button onClick={handleRefresh} disabled={refreshing} className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50" aria-label="Refresh market data">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
          </div>
          <h3 className="mb-1">1,875.42</h3>
          <p className="text-sm text-success">{formatPercent(avgChange)}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">Gainers</span>
          </div>
          <h3>{gainers}</h3>
          <p className="text-sm text-muted-foreground">{stocks.length > 0 ? ((gainers / stocks.length) * 100).toFixed(0) : 0}% of stocks</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">Losers</span>
          </div>
          <h3>{losers}</h3>
          <p className="text-sm text-muted-foreground">{stocks.length > 0 ? ((losers / stocks.length) * 100).toFixed(0) : 0}% of stocks</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Total Volume</span>
          </div>
          <h3>{formatLargeNumber(stocks.reduce((sum, s) => sum + s.volume, 0))}</h3>
          <p className="text-sm text-muted-foreground">Shares traded</p>
        </div>
      </div>
      {/* Sector Heatmap */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4">Sector Performance Heatmap</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sectors
            .filter((s) => s !== "all")
            .map((sector) => {
              const sectorStocks = stocks.filter((s) => s.sector === sector);
              const avgSectorChange = sectorStocks.length > 0
                ? sectorStocks.reduce((sum, s) => sum + s.changePercent, 0) / sectorStocks.length
                : 0;
              const isPositive = avgSectorChange >= 0;
              return (
                <button
                  key={sector}
                  onClick={() => setSelectedSector(sector)}
                  className={`p-6 rounded-lg transition-all ${
                    isPositive ? "bg-success/20 hover:bg-success/30 border-2 border-success/40" : "bg-destructive/20 hover:bg-destructive/30 border-2 border-destructive/40"
                  } ${selectedSector === sector ? "ring-2 ring-chart-1" : ""}`}
                >
                  <div className="text-sm mb-2">{sector}</div>
                  <div className={`text-xl ${isPositive ? "text-success" : "text-destructive"}`}>{formatPercent(avgSectorChange)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{sectorStocks.length} stocks</div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Live Stock Quotes with ML Predictions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h3>Live Stock Quotes</h3>
            <p className="text-sm text-muted-foreground mt-1">Select stocks and run ML predictions for price forecasts and volatility analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} className="px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1" aria-label="Filter by sector">
              {sectors.map((sector) => (
                <option key={sector} value={sector}>{sector === "all" ? "All Sectors" : sector}</option>
              ))}
            </select>
          </div>
        </div>
        <StockTableWithML 
          stocks={filteredStocks} 
          onPredictionsComplete={handlePredictionsComplete}
        />
      </div>

      {/* Market News */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4">Latest Market News</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {news.length > 0 ? (
            news.map((n) => (
              <NewsCard key={n.id} article={n} />
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              No news available
            </div>
          )}
        </div>
      </div>

      {/* Market Insights */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="mb-4">Market Insights</h3>
        <div className="space-y-4">
          <div className="p-4 bg-info/10 border border-info/30 rounded-lg">
            <h4 className="text-sm text-info mb-2">Banking Sector Rally</h4>
            <p className="text-sm text-muted-foreground">The banking sector is showing strong performance with an average gain of 2.1% today, driven by positive earnings reports and increased lending activity.</p>
          </div>
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <h4 className="text-sm text-warning mb-2">Volatility Alert</h4>
            <p className="text-sm text-muted-foreground">Increased volatility detected in the consumer goods sector. Investors should monitor positions and consider risk management strategies.</p>
          </div>
        </div>
      </div>
      </>
      )}

      {/* ML Predictions Modal */}
      <MLPredictionModal
        isOpen={showPredictions}
        onClose={() => setShowPredictions(false)}
        predictions={predictions}
        stocks={stocks}
      />
    </div>
  );
}
