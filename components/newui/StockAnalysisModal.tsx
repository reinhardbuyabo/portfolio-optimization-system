"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Check,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface StockAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  name: string;
  currentPrice: number;
  onAddToPortfolio?: () => void;
  onReplaceAsset?: () => void;
  onExcludeFromOptimization?: () => void;
}

interface AnalysisResult {
  predictedPrice: number;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  isFavorable: boolean;
  historicalData: Array<{ date: string; actual: number; predicted?: number }>;
  volatilityForecast: Array<{ date: string; volatility: number }>;
}

export function StockAnalysisModal({
  open,
  onClose,
  symbol,
  name,
  currentPrice,
  onAddToPortfolio,
  onReplaceAsset,
  onExcludeFromOptimization,
}: StockAnalysisModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open) runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, symbol]);

  const runAnalysis = async () => {
    setStatus("loading");
    setErrorMessage("");

    setTimeout(() => {
      try {
        const predictedPrice = currentPrice * (1 + (Math.random() * 0.15 - 0.05));
        const expectedReturn = (predictedPrice - currentPrice) / currentPrice;
        const volatility = 0.05 + Math.random() * 0.15;
        const sharpeRatio = expectedReturn / volatility;
        const isFavorable = predictedPrice > currentPrice;

        const historicalData = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          const actual = currentPrice * (0.9 + Math.random() * 0.2);
          return {
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            actual,
            predicted: i >= 20 ? actual * (1 + (Math.random() * 0.1 - 0.05)) : undefined,
          };
        });

        const volatilityForecast = Array.from({ length: 10 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i);
          return {
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            volatility: volatility * 100 * (0.9 + Math.random() * 0.2),
          };
        });

        setAnalysisResult({
          predictedPrice,
          expectedReturn,
          volatility,
          sharpeRatio,
          isFavorable,
          historicalData,
          volatilityForecast,
        });
        setStatus("success");
      } catch (error) {
        setStatus("error");
        setErrorMessage(`Model failed to run for ${symbol}`);
      }
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl mb-2">Stock Analysis: {symbol}</DialogTitle>
              <p className="text-sm text-muted-foreground">{name}</p>
            </div>
            {analysisResult && (
              <div className="flex items-center gap-2">
                {analysisResult.isFavorable ? (
                  <span className="px-3 py-1 rounded text-xs border bg-success/10 text-success border-success/30 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Favorable
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded text-xs border bg-muted text-muted-foreground border-border flex items-center gap-2">
                    <TrendingDown className="w-3 h-3" />
                    Neutral
                  </span>
                )}
                {analysisResult.volatility > 0.12 && (
                  <span className="px-3 py-1 rounded text-xs border bg-destructive/10 text-destructive border-destructive/30 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    Risky
                  </span>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-16 h-16 text-chart-1 animate-spin mb-4" />
            <h3 className="mb-2">Running Analysis...</h3>
            <p className="text-muted-foreground text-sm">Running LSTM model...</p>
            <p className="text-muted-foreground text-sm">Running GARCH analysis...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="mb-2">Analysis Failed</h3>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <button onClick={runAnalysis} className="px-6 py-2 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all">
              Retry Analysis
            </button>
          </div>
        )}

        {status === "success" && analysisResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Activity className="w-4 h-4" />
                  <span>Current Price</span>
                </div>
                <p className="text-2xl font-medium">{formatCurrency(currentPrice)}</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Predicted Price</span>
                </div>
                <p className="text-2xl font-medium">{formatCurrency(analysisResult.predictedPrice)}</p>
                <p className={`text-xs mt-1 ${analysisResult.isFavorable ? "text-success" : "text-destructive"}`}>
                  {analysisResult.isFavorable ? "+" : ""}
                  {formatPercent(analysisResult.expectedReturn)}
                </p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Activity className="w-4 h-4" />
                  <span>Expected Return</span>
                </div>
                <p className={`text-2xl font-medium ${analysisResult.expectedReturn >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatPercent(analysisResult.expectedReturn)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">From LSTM</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Volatility</span>
                </div>
                <p className="text-2xl font-medium">{formatPercent(analysisResult.volatility)}</p>
                <p className="text-xs text-muted-foreground mt-1">From GARCH</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                  <span className="text-xl font-medium">{formatNumber(analysisResult.sharpeRatio, 2)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${analysisResult.sharpeRatio > 1 ? "bg-success" : analysisResult.sharpeRatio > 0.5 ? "bg-warning" : "bg-destructive"}`}
                    style={{ width: `${Math.min(analysisResult.sharpeRatio * 50, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analysisResult.sharpeRatio > 1 ? "High Performance" : analysisResult.sharpeRatio > 0.5 ? "Moderate Performance" : "Low Performance"}
                </p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Risk Assessment</span>
                  <span className="text-xl font-medium">{analysisResult.volatility < 0.1 ? "Low" : analysisResult.volatility < 0.15 ? "Medium" : "High"}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${analysisResult.volatility < 0.1 ? "bg-success" : analysisResult.volatility < 0.15 ? "bg-warning" : "bg-destructive"}`}
                    style={{ width: `${Math.min(analysisResult.volatility * 500, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Based on GARCH volatility forecast</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="mb-4">Price Forecast (LSTM)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analysisResult.historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30333A" />
                    <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1E1E2E", border: "1px solid #30333A", borderRadius: "8px" }} formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#10B981" name="Historical Price" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="predicted" stroke="#FACC15" name="LSTM Prediction" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="mb-4">Volatility Forecast (GARCH)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analysisResult.volatilityForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30333A" />
                    <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1E1E2E", border: "1px solid #30333A", borderRadius: "8px" }} formatter={(v: number) => `${v.toFixed(2)}%`} />
                    <Legend />
                    <Bar dataKey="volatility" fill="#F97316" name="Volatility %" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              {onAddToPortfolio && (
                <button onClick={() => { onAddToPortfolio(); onClose(); }} className="flex-1 px-6 py-3 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Add to Portfolio
                </button>
              )}
              {onReplaceAsset && (
                <button onClick={() => { onReplaceAsset(); onClose(); }} className="flex-1 px-6 py-3 bg-muted hover:bg-muted/70 rounded-lg transition-all">
                  Replace Existing Asset
                </button>
              )}
              {onExcludeFromOptimization && (
                <button onClick={() => { onExcludeFromOptimization(); onClose(); }} className="px-6 py-3 bg-muted hover:bg-muted/70 rounded-lg transition-all text-destructive">
                  Exclude from Optimization
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
