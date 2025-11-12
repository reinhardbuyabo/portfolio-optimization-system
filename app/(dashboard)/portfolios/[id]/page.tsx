"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { generateEfficientFrontier } from "@/lib/portfolio-optimizer";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import { ArrowLeft, TrendingUp, Activity, BarChart3, Target, Download, RefreshCw, AlertCircle } from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { MetricCard } from "@/components/figma/MetricCard";
import type { UIPortfolio } from "@/types";
import type { CombinedPrediction } from "@/types/ml-api";
import type { EfficientFrontierPoint } from "@/lib/portfolio-optimizer";

const LS_KEY = "uiPortfolios";

function loadCreated(): UIPortfolio[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as UIPortfolio[]) : [];
  } catch {
    return [];
  }
}

export default function PortfolioDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [created, setCreated] = useState<UIPortfolio[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimized, setShowOptimized] = useState(false);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [optimalWeights, setOptimalWeights] = useState<{ [symbol: string]: number } | null>(null);
  const [optimalMetrics, setOptimalMetrics] = useState<any>(null);
  const [currentMetrics, setCurrentMetrics] = useState<any>(null);
  const [mlEfficientFrontier, setMlEfficientFrontier] = useState<EfficientFrontierPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCreated(loadCreated());
  }, []);

  useEffect(() => {
    // Check if navigated from batch run with ML predictions
    if (portfolio?.id && searchParams.get("mlPredictions") === "true") {
      const storedPredictions = sessionStorage.getItem(`portfolio_predictions_${portfolio.id}`);
      if (storedPredictions) {
        try {
          const parsed = JSON.parse(storedPredictions);
          setPredictionData(parsed);
        } catch (err) {
          console.error("Failed to parse stored predictions:", err);
        }
      }
    }
  }, [portfolio?.id, searchParams]);

  const portfolio: UIPortfolio | undefined = useMemo(() => {
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
    if (!id) return undefined;
    return created.find((p) => p.id === id) || mockPortfolios.find((p) => p.id === id);
  }, [params, created]);

  const efficientFrontier = useMemo(() => {
    // Use ML-based efficient frontier if available, otherwise use mock
    return mlEfficientFrontier.length > 0 ? mlEfficientFrontier : generateEfficientFrontier(50);
  }, [mlEfficientFrontier]);

  if (!portfolio) {
    return (
      <div className="container py-10">
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="mb-4">Portfolio not found.</p>
          <Link href="/new/portfolios" className="px-4 py-2 bg-muted rounded-lg">Back to Portfolios</Link>
        </div>
      </div>
    );
  }

  const optimalPoint = useMemo(() => {
    if (optimalMetrics) {
      return {
        volatility: optimalMetrics.volatility,
        return: optimalMetrics.expectedReturn,
        sharpeRatio: optimalMetrics.sharpeRatio,
      };
    }
    return efficientFrontier.reduce((max, point) => (point.sharpeRatio > max.sharpeRatio ? point : max));
  }, [optimalMetrics, efficientFrontier]);

  const currentPoint = useMemo(() => {
    if (currentMetrics) {
      return {
        volatility: currentMetrics.volatility,
        return: currentMetrics.expectedReturn,
        sharpeRatio: currentMetrics.sharpeRatio,
      };
    }
    return {
      volatility: portfolio?.volatility || 0,
      return: (portfolio?.totalReturn || 0) / 100,
      sharpeRatio: portfolio?.sharpeRatio || 0,
    };
  }, [currentMetrics, portfolio]);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setError(null);

    try {
      // If we have stored ML predictions, use them directly
      if (predictionData?.predictions) {
        // Use stored prediction data - call portfolio API with it
        const response = await fetch("/api/ml/predict/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portfolioId: portfolio!.id,
            holdings: portfolio!.holdings.map(h => ({
              symbol: h.symbol,
              weight: h.weight,
              currentPrice: h.currentPrice,
            })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Optimization failed");
        }

        const data = await response.json();
        
        setPredictionData(data);
        setOptimalWeights(data.optimization.optimalWeights);
        setOptimalMetrics(data.optimization.optimalMetrics);
        setCurrentMetrics(data.optimization.currentMetrics);
        setMlEfficientFrontier(data.optimization.efficientFrontier || []);
        
      } else {
        // Run fresh predictions
        const response = await fetch("/api/ml/predict/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portfolioId: portfolio!.id,
            holdings: portfolio!.holdings.map(h => ({
              symbol: h.symbol,
              weight: h.weight,
              currentPrice: h.currentPrice,
            })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Optimization failed");
        }

        const data = await response.json();

        setPredictionData(data);
        setOptimalWeights(data.optimization.optimalWeights);
        setOptimalMetrics(data.optimization.optimalMetrics);
        setCurrentMetrics(data.optimization.currentMetrics);
        setMlEfficientFrontier(data.optimization.efficientFrontier || []);
      }

      setShowOptimized(true);
    } catch (err: any) {
      console.error("Optimization failed:", err);
      setError(err.message || "Failed to optimize portfolio");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRebalance = () => {
    alert("Rebalance confirmation: Apply optimal weights to portfolio?");
  };

  const COLORS = ["#FACC15", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"]; 

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => router.push("/new/portfolios")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Portfolios
        </button>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="mb-2">{portfolio.name}</h1>
            {portfolio.description && <p className="text-muted-foreground">{portfolio.description}</p>}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>Owner: {portfolio.ownerName}</span>
              <span>•</span>
              <span>{portfolio.holdings.length} holdings</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleOptimize} disabled={isOptimizing} className="px-6 py-3 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2">
              <Target className="w-4 h-4" aria-hidden="true" />
              {isOptimizing ? "Optimizing..." : "Optimize Portfolio"}
            </button>
            {showOptimized && (
              <button onClick={handleRebalance} className="px-6 py-3 border border-border hover:bg-muted rounded-lg transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Rebalance
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Value" value={formatCurrency(portfolio.totalValue)} change={portfolio.totalReturn} icon={TrendingUp} trend={portfolio.totalReturn > 0 ? "up" : "down"} />
        <MetricCard title="Total Return" value={formatPercent(portfolio.totalReturn)} icon={Activity} trend={portfolio.totalReturn > 0 ? "up" : "down"} />
        <MetricCard title="Volatility (Risk)" value={formatNumber(portfolio.volatility * 100, 2) + "%"} icon={Activity} trend="neutral" />
        <MetricCard title="Sharpe Ratio" value={formatNumber(portfolio.sharpeRatio, 2)} icon={BarChart3} trend={portfolio.sharpeRatio > 1.5 ? "up" : "neutral"} />
      </div>

      {/* Efficient Frontier Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="mb-1">
              {predictionData ? "ML-Based Efficient Frontier" : "Efficient Frontier"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {predictionData 
                ? "Based on LSTM predictions and GARCH volatility forecasts"
                : "Optimal risk-return trade-off visualization"}
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-lg transition-colors">
            <Download className="w-4 h-4" aria-hidden="true" />
            Export
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-destructive mb-1">Optimization Failed</h4>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        )}

        {isOptimizing ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-chart-1 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-lg">Computing efficient frontier...</p>
            <p className="text-sm text-muted-foreground">Optimizing portfolio allocation</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#30333A" />
              <XAxis type="number" dataKey="volatility" name="Volatility (Risk)" stroke="#9CA3AF" label={{ value: "Volatility (Risk)", position: "insideBottom", offset: -5 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <YAxis type="number" dataKey="return" name="Expected Return" stroke="#9CA3AF" label={{ value: "Expected Return", angle: -90, position: "insideLeft" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ backgroundColor: "#1B1F3B", border: "1px solid #30333A", borderRadius: "8px" }} formatter={(value: any) => `${(Number(value) * 100).toFixed(2)}%`} />
              <Legend />
              <Scatter name="Efficient Frontier" data={efficientFrontier} fill="#3B82F6" line lineType="monotone" />
              <Scatter name="Current Portfolio" data={[currentPoint]} fill="#FACC15" shape="diamond" />
              {showOptimized && <Scatter name="Optimal Portfolio" data={[optimalPoint]} fill="#10B981" shape="star" />}
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {showOptimized && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
              <h4 className="mb-2 text-success">Optimization Complete</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Expected Return</p>
                  <p className="font-medium">{formatPercent(optimalPoint.return * 100)}</p>
                  <p className="text-xs text-success">+{formatPercent((optimalPoint.return - currentPoint.return) * 100)} improvement</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Volatility</p>
                  <p className="font-medium">{formatNumber(optimalPoint.volatility * 100, 2)}%</p>
                  <p className="text-xs text-success">{formatPercent((currentPoint.volatility - optimalPoint.volatility) * 100)} reduction</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Sharpe Ratio</p>
                  <p className="font-medium">{formatNumber(optimalPoint.sharpeRatio, 2)}</p>
                  <p className="text-xs text-success">+{formatNumber(optimalPoint.sharpeRatio - currentPoint.sharpeRatio, 2)} improvement</p>
                </div>
              </div>
            </div>

            {predictionData && optimalWeights && (
              <div className="overflow-x-auto">
                <h4 className="mb-3 font-medium">Optimal Allocation (ML-Based)</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2">Symbol</th>
                      <th className="text-right py-2 px-2">Current</th>
                      <th className="text-right py-2 px-2">Predicted</th>
                      <th className="text-right py-2 px-2">Expected Return</th>
                      <th className="text-right py-2 px-2">Volatility</th>
                      <th className="text-right py-2 px-2">Current Weight</th>
                      <th className="text-right py-2 px-2">Optimal Weight</th>
                      <th className="text-right py-2 px-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictionData.predictions.map((pred: CombinedPrediction) => {
                      const holding = portfolio?.holdings.find(h => h.symbol === pred.symbol);
                      const currentWeight = holding?.weight || 0;
                      const optimalWeight = optimalWeights[pred.symbol] || 0;
                      const change = optimalWeight - currentWeight;

                      return (
                        <tr key={pred.symbol} className="border-b border-border/50">
                          <td className="py-2 px-2 font-medium">{pred.symbol}</td>
                          <td className="py-2 px-2 text-right">
                            {holding ? formatCurrency(holding.currentPrice) : "N/A"}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {pred.lstm ? formatCurrency(pred.lstm.prediction) : "N/A"}
                          </td>
                          <td className={`py-2 px-2 text-right ${
                            pred.lstm && holding
                              ? pred.lstm.prediction > holding.currentPrice
                                ? "text-success"
                                : "text-destructive"
                              : ""
                          }`}>
                            {pred.lstm && holding
                              ? formatPercent(
                                  ((pred.lstm.prediction - holding.currentPrice) / holding.currentPrice) * 100
                                )
                              : "N/A"}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {pred.garch
                              ? `${formatNumber(pred.garch.volatility_annualized * 100, 2)}%`
                              : "N/A"}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatNumber(currentWeight * 100, 1)}%
                          </td>
                          <td className="py-2 px-2 text-right font-medium">
                            {formatNumber(optimalWeight * 100, 1)}%
                          </td>
                          <td className={`py-2 px-2 text-right ${
                            change > 0 ? "text-success" : change < 0 ? "text-destructive" : ""
                          }`}>
                            {change > 0 ? "+" : ""}{formatNumber(change * 100, 1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Holdings and Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="mb-6">Asset Allocation</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={portfolio.holdings} cx="50%" cy="50%" labelLine={false} label={({ symbol, weight }) => `${symbol}: ${(weight * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="weight">
                {portfolio.holdings.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1B1F3B", border: "1px solid #30333A", borderRadius: "8px" }} formatter={(value: any) => `${(Number(value) * 100).toFixed(2)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
          <h3 className="mb-4">Holdings</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm text-muted-foreground">Symbol</th>
                  <th className="text-right py-3 px-2 text-sm text-muted-foreground">Quantity</th>
                  <th className="text-right py-3 px-2 text-sm text-muted-foreground">Avg Price</th>
                  <th className="text-right py-3 px-2 text-sm text-muted-foreground">Current</th>
                  <th className="text-right py-3 px-2 text-sm text-muted-foreground">Value</th>
                  <th className="text-right py-3 px-2 text-sm text-muted-foreground">Weight</th>
                  <th className="text-right py-3 px-2 text-sm text-muted-foreground">Return</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((h) => (
                  <tr key={h.symbol} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2">
                      <div>
                        <div className="text-primary">{h.symbol}</div>
                        <div className="text-xs text-muted-foreground">{h.name}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">{h.quantity.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(h.averagePrice)}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(h.currentPrice)}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(h.value)}</td>
                    <td className="py-3 px-2 text-right">{formatNumber(h.weight * 100, 1)}%</td>
                    <td className={`py-3 px-2 text-right ${h.return >= 0 ? "text-success" : "text-destructive"}`}>{formatPercent(h.return)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
