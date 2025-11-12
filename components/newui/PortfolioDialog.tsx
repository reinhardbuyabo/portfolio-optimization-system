"use client";

import { useState } from "react";
import type { UIPortfolio, EfficientFrontierPoint } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatPercent, formatNumber, getRiskCategory, riskBadgeClass } from "@/lib/utils";
import { TrendingUp, Activity, BarChart3, PieChart as PieIcon, Edit2, Trash2, Plus, Play, Download, AlertCircle, Search } from "lucide-react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RechartsPie, Pie, Cell } from "recharts";
import { StockAnalysisModal } from "@/components/newui/StockAnalysisModal";
import { toast } from "sonner";

interface PortfolioDialogProps {
  portfolio: UIPortfolio | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (portfolio: UIPortfolio) => void;
  onDelete?: (portfolioId: string) => void;
  onAddAsset?: (portfolio: UIPortfolio) => void;
  onRunOptimization?: (portfolio: UIPortfolio) => void;
  onSave?: (portfolio: UIPortfolio) => void;
}

export function PortfolioDialog({ portfolio, open, onClose, onEdit, onDelete, onAddAsset, onRunOptimization, onSave }: PortfolioDialogProps) {
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string; currentPrice: number } | null>(null);
  const [showStockAnalysis, setShowStockAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationComplete, setOptimizationComplete] = useState(false);

  if (!portfolio) return null;

  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setOptimizationComplete(true);
      onRunOptimization?.(portfolio);
    }, 2000);
  };

  // Mock efficient frontier data
  const efficientFrontierData: EfficientFrontierPoint[] = Array.from({ length: 50 }, (_, i) => {
    const volatility = 0.05 + (i / 50) * 0.4;
    const returnValue = 0.03 + volatility * 0.8 - Math.pow(volatility - 0.2, 2) * 0.5;
    return {
      volatility: volatility * 100,
      return: returnValue * 100,
      sharpeRatio: returnValue / volatility,
    };
  });

  const currentPortfolioPoint = {
    volatility: portfolio.volatility * 100,
    return: portfolio.totalReturn * 100,
  };

  const allocationData = portfolio.holdings.map((h) => ({
    name: h.symbol,
    value: h.weight * 100,
    displayValue: formatCurrency(h.value),
  }));

  const COLORS = ["#FACC15", "#F97316", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];

  const riskCategory = getRiskCategory(portfolio.volatility);
  const badgeClasses = riskBadgeClass(riskCategory);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{portfolio.name}</DialogTitle>
              {portfolio.description && <p className="text-sm text-muted-foreground">{portfolio.description}</p>}
              <div className="flex items-center gap-3 mt-3">
                <span className={`px-3 py-1 rounded text-xs border capitalize ${badgeClasses}`}>{riskCategory} Risk</span>
                <span className="text-xs text-muted-foreground">Created: {new Date(portfolio.createdAt).toLocaleDateString()}</span>
                <span className="text-xs text-muted-foreground">Updated: {new Date(portfolio.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button onClick={() => onEdit(portfolio)} className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Edit portfolio">
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this portfolio?")) {
                      onDelete(portfolio.id);
                      onClose();
                    }
                  }}
                  className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                  aria-label="Delete portfolio"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Total Value</span>
                </div>
                <p className="text-2xl">{formatCurrency(portfolio.totalValue)}</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Activity className="w-4 h-4" />
                  <span>Expected Return</span>
                </div>
                <p className={`text-2xl ${portfolio.totalReturn >= 0 ? "text-success" : "text-destructive"}`}>{formatPercent(portfolio.totalReturn)}</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Volatility</span>
                </div>
                <p className="text-2xl">{formatPercent(portfolio.volatility)}</p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Sharpe Ratio</span>
                </div>
                <p className="text-2xl">{formatNumber(portfolio.sharpeRatio, 2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <PieIcon className="w-5 h-5" />
                  Portfolio Allocation
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie data={allocationData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value.toFixed(1)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1E1E2E", border: "1px solid #30333A", borderRadius: "8px" }} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <h3 className="mb-4">Top Holdings</h3>
                <div className="space-y-3">
                  {portfolio.holdings
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 5)
                    .map((holding, index) => (
                      <div key={holding.symbol} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <div>
                            <p className="text-sm font-medium">{holding.symbol}</p>
                            <p className="text-xs text-muted-foreground">{holding.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatPercent(holding.weight)}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(holding.value)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{portfolio.holdings.length} stocks in portfolio</p>
              {onAddAsset && (
                <button onClick={() => onAddAsset(portfolio)} className="px-4 py-2 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Asset
                </button>
              )}
            </div>

            <div className="bg-muted/50 border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium">Symbol</th>
                      <th className="text-left p-4 text-sm font-medium">Name</th>
                      <th className="text-right p-4 text-sm font-medium">Weight</th>
                      <th className="text-right p-4 text-sm font-medium">Quantity</th>
                      <th className="text-right p-4 text-sm font-medium">Avg Price</th>
                      <th className="text-right p-4 text-sm font-medium">Current Price</th>
                      <th className="text-right p-4 text-sm font-medium">Value</th>
                      <th className="text-right p-4 text-sm font-medium">Return</th>
                      <th className="text-center p-4 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.map((holding) => (
                      <tr key={holding.symbol} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{holding.symbol}</td>
                        <td className="p-4 text-sm text-muted-foreground">{holding.name}</td>
                        <td className="p-4 text-right">{formatPercent(holding.weight)}</td>
                        <td className="p-4 text-right">{formatNumber(holding.quantity, 0)}</td>
                        <td className="p-4 text-right">{formatCurrency(holding.averagePrice)}</td>
                        <td className="p-4 text-right">{formatCurrency(holding.currentPrice)}</td>
                        <td className="p-4 text-right font-medium">{formatCurrency(holding.value)}</td>
                        <td className={`p-4 text-right font-medium ${holding.return >= 0 ? "text-success" : "text-destructive"}`}>{formatPercent(holding.return)}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button className="p-1 hover:bg-muted rounded transition-colors" aria-label="Edit holding">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-1 hover:bg-destructive/20 text-destructive rounded transition-colors" aria-label="Remove holding">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStock({ symbol: holding.symbol, name: holding.name, currentPrice: holding.currentPrice });
                                setShowStockAnalysis(true);
                              }}
                              className="p-1 hover:bg-chart-1/20 text-chart-1 rounded transition-colors"
                              aria-label="Analyze stock"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-6">
            {!optimizationComplete && !isOptimizing ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="mb-2">Run Portfolio Optimization</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Combine LSTM return forecasts with GARCH volatility models to calculate the efficient frontier and find the optimal portfolio allocation.
                </p>
                <button onClick={handleRunOptimization} className="px-6 py-3 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Run Optimization
                </button>
              </div>
            ) : isOptimizing ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 border-4 border-chart-1 border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="mb-2">Running Optimization...</h3>
                <p className="text-muted-foreground">Calculating efficient frontier and optimal allocations</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-muted/50 border border-border rounded-lg p-6">
                  <h3 className="mb-4">Efficient Frontier</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30333A" />
                      <XAxis type="number" dataKey="volatility" name="Volatility" unit="%" stroke="#9CA3AF" label={{ value: "Volatility (%)", position: "insideBottom", offset: -10 }} />
                      <YAxis type="number" dataKey="return" name="Return" unit="%" stroke="#9CA3AF" label={{ value: "Expected Return (%)", angle: -90, position: "insideLeft" }} />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ backgroundColor: "#1E1E2E", border: "1px solid #30333A", borderRadius: "8px" }} formatter={(value: number) => `${Number(value).toFixed(2)}%`} />
                      <Legend />
                      <Scatter name="Efficient Frontier" data={efficientFrontierData} fill="#FACC15" line lineType="monotone" />
                      <Scatter name="Current Portfolio" data={[currentPortfolioPoint]} fill="#10B981" shape="star" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-muted/50 border border-border rounded-lg p-6">
                  <h3 className="mb-4">Optimized Allocation</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium">Stock</th>
                          <th className="text-right p-4 text-sm font-medium">Current Weight</th>
                          <th className="text-right p-4 text-sm font-medium">Optimal Weight</th>
                          <th className="text-right p-4 text-sm font-medium">Predicted Return</th>
                          <th className="text-right p-4 text-sm font-medium">Volatility</th>
                          <th className="text-right p-4 text-sm font-medium">Sharpe Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.holdings.map((holding) => {
                          const optimalWeight = Math.random() * 0.4;
                          const predictedReturn = 0.05 + Math.random() * 0.1;
                          const volatility = 0.1 + Math.random() * 0.15;
                          const sharpe = predictedReturn / volatility;

                          return (
                            <tr key={holding.symbol} className="border-t border-border hover:bg-muted/30 transition-colors">
                              <td className="p-4 font-medium">{holding.symbol}</td>
                              <td className="p-4 text-right">{formatPercent(holding.weight)}</td>
                              <td className="p-4 text-right font-medium text-chart-1">{formatPercent(optimalWeight)}</td>
                              <td className="p-4 text-right text-success">{formatPercent(predictedReturn)}</td>
                              <td className="p-4 text-right">{formatPercent(volatility)}</td>
                              <td className="p-4 text-right">{formatNumber(sharpe, 2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => onSave?.(portfolio)} className="flex-1 px-6 py-3 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all flex items-center justify-center gap-2">
                    Save Optimized Portfolio
                  </button>
                  <button className="px-6 py-3 bg-muted hover:bg-muted/70 rounded-lg transition-all flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Download Report
                  </button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {selectedStock && (
        <StockAnalysisModal
          open={showStockAnalysis}
          onClose={() => setShowStockAnalysis(false)}
          symbol={selectedStock.symbol}
          name={selectedStock.name}
          currentPrice={selectedStock.currentPrice}
          onAddToPortfolio={() => toast.success(`Added ${selectedStock.symbol} to portfolio`)}
          onReplaceAsset={() => toast.success(`Replaced asset with ${selectedStock.symbol}`)}
          onExcludeFromOptimization={() => toast.info(`Excluded ${selectedStock.symbol} from optimization`)}
        />
      )}
    </Dialog>
  );
}
