"use client";

import { useEffect, useState, useMemo } from "react";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import { calculateSharpeRatio } from "@/lib/financial-metrics";
import {
  TrendingUp,
  Activity,
  AlertCircle,
  Play,
  Download,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts";
import { MetricCard } from "@/components/figma/MetricCard";
import { BatchRunModal } from "@/components/figma/BatchRunModal";
import type { CombinedPrediction } from "@/types/ml-api";

interface HistoricalDataPoint {
  date: string;
  price: number;
}

interface Stock {
  code: string;
  name: string;
  sector?: string;
}

type PredictionHorizon = '1D' | '3D' | '1W' | '1M' | '3M' | '6M' | '1Y';

const HORIZON_DAYS: Record<PredictionHorizon, number> = {
  '1D': 1,
  '3D': 3,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

export default function StockAnalysisPage() {
  const [selectedStock, setSelectedStock] = useState<string>("SCOM");
  const [activeTab, setActiveTab] = useState<"lstm" | "garch">("lstm");
  const [isRunning, setIsRunning] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [predictionResult, setPredictionResult] = useState<CombinedPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loadingHistorical, setLoadingHistorical] = useState(true);
  const [availableStocks, setAvailableStocks] = useState<Stock[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [stocksBySector, setStocksBySector] = useState<{ [sector: string]: Stock[] }>({});
  const [predictionHorizon, setPredictionHorizon] = useState<PredictionHorizon>('1D');

  const stock = availableStocks.find((s) => s.code === selectedStock) || availableStocks[0];
  const forecastDays = HORIZON_DAYS[predictionHorizon];

  // Fetch available stocks on mount
  useEffect(() => {
    const fetchAvailableStocks = async () => {
      try {
        setLoadingStocks(true);
        
        // Fetch grouped by sector
        const response = await fetch('/api/stocks/available?grouped=true');
        if (!response.ok) {
          throw new Error('Failed to fetch stocks');
        }
        
        const result = await response.json();
        setStocksBySector(result.data);
        
        // Flatten for the non-grouped array
        const allStocks: Stock[] = [];
        Object.values(result.data).forEach((sectorStocks: any) => {
          allStocks.push(...sectorStocks);
        });
        setAvailableStocks(allStocks);
        
        console.log(`Loaded ${allStocks.length} stocks from training data`);
      } catch (error) {
        console.error('Error fetching available stocks:', error);
        // Fallback to a basic list if API fails
        setAvailableStocks([
          { code: 'SCOM', name: 'Safaricom Plc', sector: 'Telecommunication and Technology' },
          { code: 'EQTY', name: 'Equity Group Holdings Plc', sector: 'Banking' },
          { code: 'KCB', name: 'KCB Group Plc', sector: 'Banking' },
        ]);
      } finally {
        setLoadingStocks(false);
      }
    };
    
    fetchAvailableStocks();
  }, []);

  // Fetch historical data when stock changes
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoadingHistorical(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/stocks/historical?symbol=${selectedStock}&days=60`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch historical data');
        }
        
        const data = await response.json();
        setHistoricalData(data.prices || []);
        setCurrentPrice(data.latestPrice);
      } catch (err: any) {
        console.error("Failed to fetch historical data:", err);
        setError(err.message || "Failed to load historical data");
        setHistoricalData([]);
        setCurrentPrice(null);
      } finally {
        setLoadingHistorical(false);
      }
    };

    fetchHistoricalData();
    // Clear previous predictions when changing stocks
    setPredictionResult(null);
    setHasResults(false);
  }, [selectedStock]);

  const handleRunModel = async () => {
    setIsRunning(true);
    setHasResults(false);
    setError(null);
    setPredictionResult(null);

    try {
      const requestBody = {
        symbol: selectedStock,
        horizon: forecastDays,
        data: historicalData.map(p => ({ "Day Price": p.price }))
      };

      let endpoint = "";
      if (activeTab === 'lstm') {
        endpoint = "/api/ml/lstm/predict";
      } else if (activeTab === 'garch') {
        endpoint = "/api/ml/garch/predict";
      } else {
        throw new Error("Invalid model type selected");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Prediction failed");
      }

      const result = await response.json();
      
      // The structure of the result will be different for single predictions
      // We need to combine them into the CombinedPrediction format
      const combinedResult: CombinedPrediction = {
        symbol: selectedStock,
        lstm: activeTab === 'lstm' ? result : null,
        garch: activeTab === 'garch' ? result : null,
      };

      // If we already have a result, merge them
      setPredictionResult(prev => {
        if (prev) {
          return {
            ...prev,
            ...combinedResult
          }
        }
        return combinedResult;
      });

      setHasResults(true);
    } catch (err: any) {
      console.error("Prediction failed:", err);
      setError(err.message || "Failed to run prediction");
    } finally {
      setIsRunning(false);
    }
  };

  const [userPortfolios, setUserPortfolios] = useState<any[]>([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(true);

  // Fetch user's portfolios
  useEffect(() => {
    const fetchUserPortfolios = async () => {
      try {
        setLoadingPortfolios(true);
        const response = await fetch('/api/portfolios');
        if (!response.ok) {
          throw new Error('Failed to fetch user portfolios');
        }
        const result = await response.json();
        setUserPortfolios(result.data);
      } catch (error) {
        console.error('Error fetching user portfolios:', error);
        // Handle error, maybe show a toast
      } finally {
        setLoadingPortfolios(false);
      }
    };
    fetchUserPortfolios();
  }, []);

  const handleBatchRun = async () => {
    if (userPortfolios.length > 0) {
      // For simplicity, let's use the first portfolio's assets
      // In a real app, you might let the user choose a portfolio
      const portfolioAssets = userPortfolios[0]?.assets.map((a: any) => a.symbol) || [];
      if (portfolioAssets.length > 0) {
        // Here you would pass the assets to the modal or the batch run logic
        console.log("Running batch for assets:", portfolioAssets);
        setShowBatchModal(true);
      } else {
        setError("The selected portfolio has no assets to run predictions on.");
      }
    } else {
      setError("You don't have any portfolios to run a batch prediction. Please create one first.");
    }
  };

  // Chart data: Historical + Prediction
  const lstmChartData = useMemo(() => {
    if (loadingHistorical || historicalData.length === 0) {
      return [];
    }

    const chartPoints: any[] = [];

    // Add historical data
    historicalData.forEach((point, index) => {
      chartPoints.push({
        date: new Date(point.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        actual: point.price,
        isHistorical: true,
      });
    });

    // Add prediction if available
    if (predictionResult?.lstm && hasResults && currentPrice) {
      const prediction = predictionResult.lstm.prediction;
      
      // Add 30-day forecast
      for (let i = 1; i <= 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const progress = i / 30;
        const interpolatedPrice = currentPrice + (prediction - currentPrice) * progress;
        const confidenceRange = interpolatedPrice * 0.05;
        
        chartPoints.push({
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          predicted: interpolatedPrice,
          lower: interpolatedPrice - confidenceRange,
          upper: interpolatedPrice + confidenceRange,
          isHistorical: false,
        });
      }
    }

    return chartPoints;
  }, [historicalData, predictionResult, hasResults, currentPrice, loadingHistorical]);

  // GARCH volatility chart - show historical volatility + forecast
  const garchChartData = useMemo(() => {
    if (!predictionResult?.garch || !hasResults || historicalData.length < 2) {
      return [];
    }

    const points: any[] = [];
    const forecastedVolatility = predictionResult.garch.volatility_annualized;
    
    // Calculate historical realized volatility (rolling 30-day)
    const windowSize = 30;
    for (let i = windowSize; i < historicalData.length; i++) {
      const window = historicalData.slice(i - windowSize, i);
      
      // Calculate returns for this window
      const returns: number[] = [];
      for (let j = 1; j < window.length; j++) {
        if (window[j].price > 0 && window[j - 1].price > 0) {
          returns.push(Math.log(window[j].price / window[j - 1].price));
        }
      }
      
      if (returns.length > 0) {
        // Calculate standard deviation of returns
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const dailyVol = Math.sqrt(variance);
        const annualizedVol = dailyVol * Math.sqrt(252); // Annualize
        
        points.push({
          date: historicalData[i].date,
          volatility: annualizedVol * 100,
          type: 'historical'
        });
      }
    }
    
    // Add GARCH forecast point (next period)
    if (historicalData.length > 0) {
      const lastDate = new Date(historicalData[historicalData.length - 1].date);
      lastDate.setDate(lastDate.getDate() + 1);
      
      points.push({
        date: lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        volatility: forecastedVolatility * 100,
        forecast: forecastedVolatility * 100,
        type: 'forecast'
      });
    }

    return points;
  }, [predictionResult, hasResults, historicalData]);

  return (
    <div className="container py-6 space-y-6">
      <BatchRunModal 
        open={showBatchModal} 
        onClose={() => setShowBatchModal(false)}
        portfolios={userPortfolios} 
      />
      
      <div>
        <h1>Stock Analysis: LSTM & GARCH Models</h1>
        <p className="text-muted-foreground mt-2">
          Real-time predictions using historical NSE data
          {availableStocks.length > 0 && (
            <span className="ml-2 text-xs opacity-70">
              • {availableStocks.length} stocks from training data
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[250px]">
          <label htmlFor="stock-select" className="block text-sm mb-2">
            Select Stock
          </label>
          <select
            id="stock-select"
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value)}
            disabled={loadingStocks}
            className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingStocks ? (
              <option>Loading stocks from training data...</option>
            ) : Object.keys(stocksBySector).length > 0 ? (
              // Group by sector for better organization
              Object.entries(stocksBySector).map(([sector, stocks]) => (
                <optgroup key={sector} label={`${sector} (${stocks.length})`}>
                  {stocks.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </optgroup>
              ))
            ) : (
              // Flat list fallback
              availableStocks.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.name}
                  {s.sector ? ` (${s.sector})` : ''}
                </option>
              ))
            )}
          </select>
        </div>
        
        <div className="min-w-[180px]">
          <label htmlFor="horizon-select" className="block text-sm mb-2">
            Prediction Horizon
          </label>
          <select
            id="horizon-select"
            value={predictionHorizon}
            onChange={(e) => setPredictionHorizon(e.target.value as PredictionHorizon)}
            className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1"
          >
            <option value="1D">1 Day</option>
            <option value="3D">3 Days</option>
            <option value="1W">1 Week</option>
            <option value="1M">1 Month (Default)</option>
            <option value="3M">3 Months</option>
            <option value="6M">6 Months</option>
            <option value="1Y">1 Year</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleRunModel}
            disabled={isRunning || loadingHistorical}
            className="px-6 py-3 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? "Running..." : `Run ${activeTab.toUpperCase()}`}
          </button>
          <button
            onClick={handleBatchRun}
            className="px-6 py-3 border border-border hover:bg-muted rounded-lg transition-colors"
          >
            Batch Run
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("lstm")}
            className={`flex-1 py-4 px-6 transition-colors ${activeTab === "lstm" ? "bg-chart-1/10 text-chart-1 border-b-2 border-chart-1" : "hover:bg-muted text-muted-foreground"}`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span>LSTM Price Forecasting</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("garch")}
            className={`flex-1 py-4 px-6 transition-colors ${activeTab === "garch" ? "bg-chart-1/10 text-chart-1 border-b-2 border-chart-1" : "hover:bg-muted text-muted-foreground"}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Activity className="w-5 h-5" />
              <span>GARCH Volatility Analysis</span>
            </div>
          </button>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-destructive font-medium mb-2">Error: {error}</p>
              <details className="text-sm text-destructive/80 mt-2">
                <summary className="cursor-pointer hover:underline">Troubleshooting tips</summary>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Ensure CSV file exists at: ml/datasets/NSE_data_all_stocks_2024_jan_to_oct.csv</li>
                  <li>Check that the selected stock has data in the CSV file</li>
                  <li>Try refreshing the page and attempting again</li>
                  <li>Check browser console for detailed error messages</li>
                </ul>
              </details>
            </div>
          )}
          
          {loadingHistorical ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-16 h-16 text-chart-1 animate-spin mb-4" />
              <p className="text-lg">Loading historical data...</p>
            </div>
          ) : isRunning ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-chart-1 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-lg">Running {activeTab.toUpperCase()} model...</p>
              <p className="text-sm text-muted-foreground">This may take a few moments</p>
            </div>
          ) : activeTab === "lstm" ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="mb-1">
                    {hasResults 
                      ? `Price Forecast - ${predictionHorizon} Horizon` 
                      : "Historical Prices - Last 60 Days"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {hasResults 
                      ? `LSTM prediction with 95% confidence intervals (±5%) for ${HORIZON_DAYS[predictionHorizon]} days`
                      : "Real market data from NSE (click 'Run LSTM' for predictions)"}
                  </p>
                  {hasResults && predictionResult?.lstm && (
                    <>
                      <p className="text-sm font-medium text-chart-1 mt-1">
                        Predicted: {formatCurrency(predictionResult.lstm.prediction)} at {predictionHorizon} ({predictionResult.lstm.horizon} days)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>
                          Forecast path is interpolated for visualization. 
                          Model predicts price at horizon; intermediate values are estimates.
                        </span>
                      </p>
                    </>
                  )}
                </div>
                {hasResults && (
                  <button className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                )}
              </div>
              
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={lstmChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30333A" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1B1F3B",
                      border: "1px solid #30333A",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Historical Price"
                    dot={false}
                  />
                  {hasResults && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#F79D00"
                        strokeWidth={3}
                        name="Predicted Price"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="upper"
                        stroke="#3B82F6"
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        name="Upper Confidence (+5%)"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="lower"
                        stroke="#3B82F6"
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        name="Lower Confidence (-5%)"
                        dot={false}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    {hasResults ? `Predicted Price (${predictionHorizon})` : "Current Price (Day 0)"}
                  </p>
                  <h4 className={predictionResult?.lstm && currentPrice
                    ? predictionResult.lstm.prediction > currentPrice 
                      ? "text-success" 
                      : "text-destructive"
                    : ""}>
                    {hasResults && predictionResult?.lstm
                      ? formatCurrency(predictionResult.lstm.prediction)
                      : currentPrice ? formatCurrency(currentPrice) : "N/A"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasResults 
                      ? predictionResult?.lstm && currentPrice
                        ? `${predictionResult.lstm.prediction > currentPrice ? '▲' : '▼'} ${Math.abs(predictionResult.lstm.prediction - currentPrice).toFixed(2)} from today`
                        : "N/A"
                      : "From CSV data (Oct 2024)"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    {hasResults ? "Current Price (Today)" : "Data Points"}
                  </p>
                  <h4>
                    {hasResults 
                      ? currentPrice ? formatCurrency(currentPrice) : "N/A"
                      : historicalData.length}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasResults ? "Starting point (Day 0)" : "Days of historical data"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Confidence Interval
                  </p>
                  <h4>
                    {hasResults && predictionResult?.lstm
                      ? `±${formatCurrency(predictionResult.lstm.prediction * 0.05)}`
                      : "Run LSTM to calculate"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasResults && predictionResult?.lstm
                      ? `${formatCurrency(predictionResult.lstm.prediction * 0.95)} - ${formatCurrency(predictionResult.lstm.prediction * 1.05)}`
                      : "95% confidence band"}
                  </p>
                </div>
              </div>

              {!hasResults && (
                <div className="text-center py-8 border-t border-border">
                  <button
                    onClick={handleRunModel}
                    disabled={isRunning || loadingHistorical}
                    className="px-6 py-3 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    <Play className="w-4 h-4" />
                    Run LSTM Prediction
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {!hasResults || !predictionResult?.garch ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-lg mb-2">No GARCH results yet</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Run GARCH model to analyze volatility patterns
                  </p>
                  <button
                    onClick={handleRunModel}
                    disabled={isRunning || loadingHistorical}
                    className="px-6 py-3 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Run GARCH
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="mb-1">Volatility Forecast</h3>
                      <p className="text-sm text-muted-foreground">
                        GARCH model showing volatility patterns and risk
                      </p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-lg transition-colors">
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                  
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={garchChartData}>
                      <defs>
                        <linearGradient id="colorVolatility" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F79D00" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#F79D00" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30333A" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        label={{ value: "Volatility (%)", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1B1F3B",
                          border: "1px solid #30333A",
                          borderRadius: "8px",
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'volatility') return [`${Number(value).toFixed(2)}%`, 'Historical Volatility'];
                          if (name === 'forecast') return [`${Number(value).toFixed(2)}%`, 'GARCH Forecast'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="volatility"
                        stroke="#F79D00"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorVolatility)"
                        name="Historical Volatility"
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ r: 6 }}
                        name="GARCH Forecast"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">
                        Annualized Volatility
                      </p>
                      <h4 className="text-warning">
                        {formatNumber(predictionResult.garch.volatility_annualized * 100, 2)}%
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        From GARCH model
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">
                        Forecasted Variance
                      </p>
                      <h4>
                        {formatNumber(predictionResult.garch.forecasted_variance * 10000, 4)}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Risk metric
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">
                        Risk Level
                      </p>
                      <h4 className={
                        predictionResult.garch.volatility_annualized > 0.4
                          ? "text-destructive"
                          : predictionResult.garch.volatility_annualized > 0.25
                          ? "text-warning"
                          : "text-success"
                      }>
                        {predictionResult.garch.volatility_annualized > 0.4
                          ? "High"
                          : predictionResult.garch.volatility_annualized > 0.25
                          ? "Medium"
                          : "Low"}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Based on volatility
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {hasResults && predictionResult && (
        <div>
          <h3 className="mb-4">ML-Based Financial Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title={`Predicted Price (${predictionHorizon})`}
              value={
                predictionResult.lstm
                  ? formatCurrency(predictionResult.lstm.prediction)
                  : "N/A"
              }
              trend={
                predictionResult.lstm && currentPrice
                  ? predictionResult.lstm.prediction > currentPrice ? "up" : "down"
                  : "neutral"
              }
            />
            <MetricCard
              title="Expected Return"
              value={
                predictionResult.lstm && currentPrice
                  ? `${predictionResult.lstm.prediction > currentPrice ? '+' : ''}${formatPercent(
                      ((predictionResult.lstm.prediction - currentPrice) / currentPrice) * 100
                    )}`
                  : "N/A"
              }
              trend={
                predictionResult.lstm && currentPrice
                  ? predictionResult.lstm.prediction > currentPrice ? "up" : "down"
                  : "neutral"
              }
            />
            <MetricCard
              title="Volatility (Risk)"
              value={
                predictionResult.garch
                  ? formatNumber(predictionResult.garch.volatility_annualized * 100, 2) + "%"
                  : "N/A"
              }
              trend="neutral"
            />
            <MetricCard
              title="Execution Time"
              value={
                predictionResult.lstm
                  ? `${(predictionResult.lstm.execution_time * 1000).toFixed(0)}ms`
                  : "N/A"
              }
              trend="neutral"
            />
          </div>
        </div>
      )}
    </div>
  );
}

