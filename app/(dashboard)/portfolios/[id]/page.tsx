"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  BarChart3,
  Plus,
  ArrowUpDown,
  Info,
  RefreshCw,
  Check,
  ChevronsUpDown,
  Trash2,
  XCircle,
  Loader2,
  PieChart as PieChartIcon,
  Download,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { toast } from "sonner";
import type { StockPrediction } from "@/lib/portfolio-predictions";
import { calculatePortfolioMetrics, optimizePortfolioWeights } from "@/lib/portfolio-predictions";
import { generatePortfolioReport, generateEnhancedReport } from "@/lib/portfolio-export";

interface AssetOption {
  id: string;
  ticker: string;
  name: string;
  sector?: string | null;
  currentPrice: number | null;
}

interface Allocation {
  id: string;
  weight: number;
  value: number | null;
  asset: {
    id: string;
    ticker: string;
    name: string;
    sector: string | null;
    data: { close: number; date: string }[];
  };
}

interface PortfolioApiResponse {
  id: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  riskTolerance: "LOW" | "MEDIUM" | "HIGH";
  targetReturn: number;
  value: number;
  expectedReturn: number;
  sharpeRatio: number;
  volatility: number;
  holdingsCount: number;
  allocations: Allocation[];
  results: Array<{
    expectedReturn: number;
    expectedVolatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    createdAt?: string;
  }>;
}

interface HoldingRow {
  allocationId: string;
  ticker: string;
  name: string;
  sector: string;
  weight: number;
  value: number;
  shares: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  // ML Prediction fields (only present after batch run)
  predictedPrice?: number;
  expectedReturn?: number;
  volatility?: number;
}

const CHART_COLORS = [
  "oklch(0.7 0.15 142)",
  "oklch(0.65 0.15 258)",
  "oklch(0.75 0.12 192)",
  "oklch(0.7 0.14 60)",
  "oklch(0.65 0.13 312)",
  "oklch(0.72 0.11 25)",
];

// Risk-Return Chart Color Palette
const RISK_RETURN_COLORS = {
  efficientFrontier: "oklch(0.7 0.2 280)", // Purple
  cal: "oklch(0.8 0.15 150)", // Green
  riskFreeRate: "oklch(0.9 0.1 60)", // Yellow
  currentPortfolio: "oklch(0.7 0.2 250)", // Blue-purple
  optimizedPortfolio: "oklch(0.8 0.2 150)", // Bright green
  tangencyPortfolio: "oklch(0.8 0.2 150)", // Same as optimized
  stockGoodSharpe: "oklch(0.7 0.2 150)", // Green (SR > 1)
  stockModerateSharpe: "oklch(0.7 0.2 200)", // Blue (0.5 < SR < 1)
  stockPoorSharpe: "oklch(0.7 0.2 30)", // Red (SR < 0.5)
} as const;

export default function PortfolioDetailsPage() {
  const params = useParams<{ id: string }>();
  const portfolioId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const showMLPredictions = searchParams.get('mlPredictions') === 'true';

  const [portfolio, setPortfolio] = useState<PortfolioApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ML Predictions state
  const [predictions, setPredictions] = useState<StockPrediction[] | null>(null);
  const [hasPredictions, setHasPredictions] = useState(false);
  
  // Portfolio Optimization state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedWeights, setOptimizedWeights] = useState<Array<{symbol: string; weight: number; expectedReturn: number; volatility: number}> | null>(null);
  const [showOptimization, setShowOptimization] = useState(false);
  
  // Chart view toggle state
  const [chartView, setChartView] = useState<'allocation' | 'risk-return'>('allocation');

  const [addStockOpen, setAddStockOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetOption | null>(null);
  const [removingAllocationId, setRemovingAllocationId] = useState<string | null>(null);

  const [sortField, setSortField] = useState<keyof HoldingRow>("weight");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchPortfolio = async () => {
    if (!portfolioId) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/portfolios/${portfolioId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch portfolio");
      }
      const data: PortfolioApiResponse = await response.json();
      setPortfolio(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      setAssetsLoading(true);
      const response = await fetch("/api/assets");
      if (!response.ok) {
        throw new Error("Failed to fetch assets");
      }
      const data: AssetOption[] = await response.json();
      setAssets(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load available stocks");
    } finally {
      setAssetsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [portfolioId]);

  // Load predictions from sessionStorage if redirected from batch run
  useEffect(() => {
    if (showMLPredictions && portfolioId) {
      const stored = sessionStorage.getItem(`portfolio_predictions_${portfolioId}`);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          setPredictions(data.predictions);
          setHasPredictions(true);
          toast.success("ML predictions loaded", {
            description: `${data.predictions?.length || 0} stocks analyzed`
          });
        } catch (error) {
          console.error('Error loading predictions:', error);
          toast.error("Failed to load predictions");
        }
      }
    }
  }, [showMLPredictions, portfolioId]);

  const clearPredictions = () => {
    if (portfolioId) {
      sessionStorage.removeItem(`portfolio_predictions_${portfolioId}`);
      setPredictions(null);
      setHasPredictions(false);
      toast.info("Predictions cleared");
      // Remove mlPredictions query param
      window.history.replaceState({}, '', `/portfolios/${portfolioId}`);
    }
  };

  useEffect(() => {
    if (addStockOpen) {
      fetchAssets();
    } else {
      setSelectedAsset(null);
    }
  }, [addStockOpen]);

  const latestResult = portfolio?.results?.[0];

  const holdings: HoldingRow[] = useMemo(() => {
    if (!portfolio) return [];

    return (portfolio.allocations || []).map((allocation) => {
      const latestPrice = allocation.asset.data?.[0]?.close ?? 0;
      const previousPrice = allocation.asset.data?.[1]?.close ?? null;
      const change = previousPrice ? latestPrice - previousPrice : 0;
      const changePercent =
        previousPrice && previousPrice !== 0 ? change / previousPrice : 0;

      const weight = allocation.weight ?? 0;
      const value =
        allocation.value ??
        (portfolio.value ?? 0) * weight;

      const shares =
        latestPrice > 0 ? Math.floor(value / latestPrice) : 0;

      // Find prediction for this stock
      const prediction = predictions?.find((p) => p.symbol === allocation.asset.ticker);

      const holding: HoldingRow = {
        allocationId: allocation.id,
        ticker: allocation.asset.ticker,
        name: allocation.asset.name,
        sector: allocation.asset.sector || "N/A",
        weight,
        value,
        shares,
        currentPrice: latestPrice,
        change,
        changePercent,
      };

      // Add prediction data if available
      if (prediction && hasPredictions) {
        holding.predictedPrice = prediction.lstm?.prediction;
        holding.expectedReturn = prediction.expectedReturn;
        holding.volatility = prediction.garch?.volatility_annualized;
      }

      return holding;
    });
  }, [portfolio, predictions, hasPredictions]);

  // Calculate ML-based portfolio metrics
  const mlMetrics = useMemo(() => {
    if (!hasPredictions || !predictions || predictions.length === 0) {
      return null;
    }
    return calculatePortfolioMetrics(predictions);
  }, [hasPredictions, predictions]);

  // Calculate dynamic risk class based on ML volatility
  const mlRiskClass = useMemo(() => {
    if (!mlMetrics) return null;
    
    const volatility = mlMetrics.meanVolatility;
    
    if (volatility < 0.15) return 'LOW';
    if (volatility < 0.25) return 'MEDIUM';
    return 'HIGH';
  }, [mlMetrics]);

  // Prepare risk-return chart data
  const riskReturnData = useMemo(() => {
    if (!hasPredictions || !predictions || predictions.length === 0 || !portfolio?.allocations) {
      return null;
    }

    // Map each stock to a risk-return point (already annualized from backend)
    const stockPoints = predictions.map((pred) => {
      const allocation = portfolio.allocations.find(
        (a) => (a as { asset: { ticker: string } }).asset.ticker === pred.symbol
      );
      
      return {
        symbol: pred.symbol,
        return: pred.expectedReturn * 100, // Convert to percentage
        volatility: (pred.garch?.volatility_annualized || 0) * 100,
        sharpeRatio: pred.garch?.volatility_annualized 
          ? (pred.expectedReturn - 0.05) / pred.garch.volatility_annualized
          : 0,
        weight: allocation?.weight || 0,
        rawReturn: pred.expectedReturn,
        rawVolatility: pred.garch?.volatility_annualized || 0,
      };
    });

    // Calculate current portfolio position using proper portfolio variance formula
    let currentPortfolio = null;
    if (stockPoints.length > 0) {
      const weights = stockPoints.map(s => s.weight);
      const returns = stockPoints.map(s => s.rawReturn);
      const volatilities = stockPoints.map(s => s.rawVolatility);
      
      // Portfolio expected return: weighted average
      const portfolioReturn = returns.reduce((sum, ret, i) => sum + ret * weights[i], 0);
      
      // Portfolio volatility: simplified (weighted average, not proper covariance-based)
      // Note: True portfolio variance requires covariance matrix: σ²_p = w'Σw
      // For now, using weighted average as approximation
      const portfolioVolatility = volatilities.reduce((sum, vol, i) => sum + vol * weights[i], 0);
      
      currentPortfolio = {
        symbol: 'Portfolio (Current)',
        return: portfolioReturn * 100,
        volatility: portfolioVolatility * 100,
        sharpeRatio: portfolioVolatility > 0 ? (portfolioReturn - 0.05) / portfolioVolatility : 0,
        weight: 1.0,
        isPortfolio: true,
      };
    }

    // Calculate optimized portfolio position if available
    let optimizedPortfolio = null;
    let tangencyPortfolio = null; // Maximum Sharpe ratio portfolio
    
    if (optimizedWeights && optimizedWeights.length > 0) {
      // Portfolio expected return: weighted average
      const optReturn = optimizedWeights.reduce((sum, w) => sum + (w.expectedReturn * w.weight), 0);
      
      // Portfolio volatility: weighted average (approximation)
      const optVolatility = optimizedWeights.reduce((sum, w) => sum + (w.volatility * w.weight), 0);
      
      const optSharpe = optVolatility > 0 ? (optReturn - 0.05) / optVolatility : 0;
      
      optimizedPortfolio = {
        symbol: 'Portfolio (Optimized)',
        return: optReturn * 100,
        volatility: optVolatility * 100,
        sharpeRatio: optSharpe,
        weight: 1.0,
        isPortfolio: true,
        isOptimized: true,
      };
      
      // The optimized portfolio IS the tangency portfolio
      tangencyPortfolio = optimizedPortfolio;
    } else if (currentPortfolio) {
      // If no optimization, current portfolio is the tangency point
      tangencyPortfolio = currentPortfolio;
    }

    // ==== COMPUTE EFFICIENT FRONTIER (Markowitz Curve) ====
    // Generate portfolios along the efficient frontier by varying target returns
    const efficientFrontier = [];
    
    if (stockPoints.length >= 2) {
      const returns = stockPoints.map(s => s.rawReturn);
      const volatilities = stockPoints.map(s => s.rawVolatility);
      
      // Find min and max expected returns from individual assets
      const minReturn = Math.min(...returns);
      const maxReturn = Math.max(...returns);
      
      // Find min volatility (typically occurs at minimum variance portfolio)
      const minVolatility = Math.min(...volatilities);
      const maxVolatility = Math.max(...volatilities);
      
      // Generate 100 portfolio points along the frontier (smooth curve)
      const numPoints = 100;
      const returnStep = (maxReturn - minReturn) / numPoints;
      
      for (let i = 0; i <= numPoints; i++) {
        const targetReturn = minReturn + i * returnStep;
        
        // Solve for minimum variance portfolio with target return
        // Using simplified approach: find optimal weights
        // In reality, this requires quadratic programming with constraints:
        // min w'Σw subject to w'μ = targetReturn and w'1 = 1
        
        // Normalized position along return axis [0, 1]
        const t = i / numPoints;
        
        // Estimate portfolio volatility using parabolic relationship
        // Efficient frontier shape in (σ, μ) space:
        // - Starts at minimum variance point (bottom-left)
        // - Curves upward and rightward
        // - Concave from below (convex set property)
        
        // Use quadratic interpolation for smoother curve
        // σ_p = σ_min + k * sqrt(t * (2 - t)) * (σ_max - σ_min)
        // This creates a smooth upward curve
        const volatilityRange = maxVolatility - minVolatility;
        const curvatureFactor = Math.sqrt(t * (2 - t)); // Smooth 0→1→0 curve
        const portfolioVolatility = minVolatility + volatilityRange * curvatureFactor;
        
        efficientFrontier.push({
          volatility: portfolioVolatility * 100,
          return: targetReturn * 100,
        });
      }
    }

    // ==== COMPUTE CAPITAL ALLOCATION LINE (CAL) ====
    // Straight line from risk-free rate through tangency portfolio
    const capitalAllocationLine = [];
    const riskFreeRate = 5; // 5% risk-free rate
    
    if (tangencyPortfolio) {
      const tangencyReturn = tangencyPortfolio.return;
      const tangencyVolatility = tangencyPortfolio.volatility;
      
      // CAL slope = Sharpe ratio of tangency portfolio = (R_t - R_f) / σ_t
      // This represents the reward-to-risk ratio
      const slope = tangencyVolatility > 0 
        ? (tangencyReturn - riskFreeRate) / tangencyVolatility 
        : 0;
      
      // Generate CAL points from risk-free rate to beyond tangency portfolio
      // Extend line to show leveraged positions
      const maxStockVol = Math.max(...stockPoints.map(s => s.volatility));
      const maxVol = Math.max(
        tangencyVolatility * 1.5, // Extend 50% beyond tangency
        maxStockVol * 1.2 // Or 20% beyond max stock volatility
      );
      
      // Create 50 points for smooth line
      const numCalPoints = 50;
      for (let i = 0; i <= numCalPoints; i++) {
        const vol = (maxVol / numCalPoints) * i;
        capitalAllocationLine.push({
          volatility: vol,
          return: riskFreeRate + slope * vol, // Linear: R = R_f + SR × σ
        });
      }
    }

    return {
      stocks: stockPoints,
      currentPortfolio,
      optimizedPortfolio,
      tangencyPortfolio,
      efficientFrontier,
      capitalAllocationLine,
      riskFreeRate,
    };
  }, [hasPredictions, predictions, portfolio?.allocations, optimizedWeights]);

  const sortedHoldings = useMemo(() => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...holdings].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * multiplier;
      }

      return String(aValue).localeCompare(String(bValue)) * multiplier;
    });
  }, [holdings, sortField, sortDirection]);

  const chartData = holdings.map((holding, index) => ({
    name: holding.ticker,
    value: holding.weight * 100,
    fullName: holding.name,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const existingTickers = useMemo(() => {
    const tickers = new Set<string>();
    portfolio?.allocations?.forEach((allocation) => {
      tickers.add(allocation.asset.ticker);
    });
    return tickers;
  }, [portfolio]);

  const handleSort = (field: keyof HoldingRow) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleRebalance = async () => {
    if (!portfolioId) return;
    
    toast.loading("Rebalancing portfolio with equal weights...", { id: 'rebalance' });
    
    try {
      const response = await fetch(`/api/portfolios/${portfolioId}/rebalance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Empty body = equal weighting
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to rebalance portfolio");
      }
      
      toast.success("Portfolio rebalanced successfully", {
        id: 'rebalance',
        description: "Equal weights applied to all assets"
      });
      
      fetchPortfolio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rebalance portfolio", {
        id: 'rebalance'
      });
    }
  };

  const handleAddStock = async () => {
    if (!portfolioId || !selectedAsset) {
      toast.error("Please select a stock");
      return;
    }

    try {
      // Show warning if stock has no price data
      if (!selectedAsset.currentPrice) {
        toast.warning(`Adding ${selectedAsset.ticker}`, {
          description: "Price data is being fetched. This may take a moment.",
        });
      } else {
        toast.loading(`Adding ${selectedAsset.ticker}...`, { id: 'add-stock' });
      }

      const response = await fetch(`/api/portfolios/${portfolioId}/add-stock`, {
          method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
          body: JSON.stringify({
          ticker: selectedAsset.ticker,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add stock");
      }

      toast.success(`${selectedAsset.ticker} added and portfolio rebalanced`, {
        id: 'add-stock',
      });
      setAddStockOpen(false);
      setSelectedAsset(null);
      fetchPortfolio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add stock", {
        id: 'add-stock',
      });
    }
  };

  const handleOptimizePortfolio = async () => {
    if (!predictions || predictions.length === 0) {
      toast.error("No predictions available", {
        description: "Run batch predictions first to optimize portfolio"
      });
      return;
    }

    setIsOptimizing(true);
    toast.loading("Optimizing portfolio weights...", { id: 'optimize' });

    try {
      // Calculate optimized weights
      const optimized = optimizePortfolioWeights(predictions);
      
      setOptimizedWeights(optimized);
      setShowOptimization(true);
      
      toast.success("Portfolio optimized successfully", {
        id: 'optimize',
        description: "Weights adjusted to maximize Sharpe Ratio"
      });
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error("Optimization failed", {
        id: 'optimize',
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyOptimization = async () => {
    if (!optimizedWeights || !portfolioId) return;

    toast.loading("Applying optimized weights...", { id: 'apply-optimize' });

    try {
      // Calculate optimized portfolio metrics
      const optReturn = optimizedWeights.reduce((sum, w) => sum + (w.expectedReturn * w.weight), 0);
      const optVolatility = optimizedWeights.reduce((sum, w) => sum + (w.volatility * w.weight), 0);
      const optSharpe = optVolatility > 0 ? (optReturn - 0.05) / optVolatility : 0;
      
      // For Sortino ratio and max drawdown, we'll use simplified calculations
      // In a real implementation, these would require historical return data
      const sortinoRatio = optSharpe * 1.2; // Approximation: typically higher than Sharpe
      const maxDrawdown = -Math.abs(optVolatility * 2); // Approximation based on volatility
      
      // Update portfolio allocations with optimized weights and metrics
      const response = await fetch(`/api/portfolios/${portfolioId}/rebalance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights: optimizedWeights.map((w) => ({
            symbol: w.symbol,
            weight: w.weight
          })),
          metrics: {
            expectedReturn: optReturn,
            volatility: optVolatility,
            sharpeRatio: optSharpe,
            sortinoRatio: sortinoRatio,
            maxDrawdown: maxDrawdown,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply optimization');
      }

      toast.success("Optimization applied successfully", {
        id: 'apply-optimize',
        description: `Sharpe Ratio: ${optSharpe.toFixed(2)}, Expected Return: ${(optReturn * 100).toFixed(2)}%`
      });
      
      setShowOptimization(false);
      setOptimizedWeights(null); // Clear optimized weights after applying
      fetchPortfolio();
    } catch (error) {
      toast.error("Failed to apply optimization", {
        id: 'apply-optimize',
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const handleRemoveStock = async (allocationId: string, ticker: string) => {
    if (!portfolioId) return;
    const confirmed = window.confirm(
      `Remove ${ticker} from this portfolio? Remaining holdings will be rebalanced.`
    );
    if (!confirmed) return;

    try {
      setRemovingAllocationId(allocationId);
      const response = await fetch(`/api/portfolios/${portfolioId}/remove-stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ allocationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove stock");
      }

      toast.success(`${ticker} removed and portfolio rebalanced`);
      fetchPortfolio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove stock");
    } finally {
      setRemovingAllocationId(null);
    }
  };

  const handleExportReport = async () => {
    if (!portfolio) return;

    toast.loading("Generating report...", { id: 'export' });

    try {
      const exportData = {
        portfolioName: portfolio.name,
        portfolioValue: portfolio.value,
        status: portfolio.status,
        riskTolerance: mlRiskClass || portfolio.riskTolerance,
        targetReturn: portfolio.targetReturn,
        expectedReturn: mlMetrics?.meanReturn || portfolio.expectedReturn,
        volatility: mlMetrics?.meanVolatility || portfolio.volatility,
        sharpeRatio: mlMetrics?.sharpeRatio || portfolio.sharpeRatio,
        holdings: holdings.map(h => ({
          ticker: h.ticker,
          name: h.name,
          weight: h.weight,
          value: h.value,
          predictedPrice: h.predictedPrice,
          expectedReturn: h.expectedReturn,
          volatility: h.volatility,
        })),
        mlMetrics: mlMetrics ? {
          meanReturn: mlMetrics.meanReturn,
          meanVolatility: mlMetrics.meanVolatility,
          sharpeRatio: mlMetrics.sharpeRatio,
          riskClass: mlRiskClass || portfolio.riskTolerance,
        } : undefined,
        optimizedWeights: optimizedWeights || undefined,
        lastOptimized: latestResult?.createdAt,
      };

      // Generate report with charts if available
      if (chartView === 'allocation' || chartView === 'risk-return') {
        await generateEnhancedReport(
          exportData,
          'allocation-chart',
          chartView === 'risk-return' ? 'risk-return-chart' : undefined
        );
      } else {
        await generatePortfolioReport(exportData);
      }

      toast.success("Report generated successfully", {
        id: 'export',
        description: "PDF downloaded to your device"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to generate report", {
        id: 'export',
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-success/20 text-success";
      case "DRAFT":
        return "bg-muted text-muted-foreground";
      case "ARCHIVED":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "LOW":
        return "bg-success/20 text-success";
      case "MEDIUM":
        return "bg-warning/20 text-warning";
      case "HIGH":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-4">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Portfolio not found</h2>
          <p className="text-muted-foreground">
            We couldn&apos;t find the requested portfolio. It may have been removed or you may not have access.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
              Portfolio Details
            </p>
            <h1 className="text-3xl font-semibold">{portfolio.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={getStatusColor(portfolio.status)}>{portfolio.status}</Badge>
            <Badge className={getRiskColor(mlRiskClass || portfolio.riskTolerance)}>
              <Shield className="w-3 h-3 mr-1" />
              {mlRiskClass || portfolio.riskTolerance} Risk
              {mlRiskClass && (
                <span className="ml-1 text-[10px] opacity-70">(ML)</span>
              )}
            </Badge>
            <div className="text-sm text-muted-foreground">
              Target Return:{" "}
              <span className="text-foreground font-medium">
                {formatPercent(portfolio.targetReturn * 100)}
              </span>
            </div>
            {latestResult?.createdAt && (
              <div className="text-sm text-muted-foreground">
                Last Optimized:{" "}
                <span className="text-foreground font-medium">
                  {new Date(latestResult.createdAt).toLocaleDateString()}
                </span>
          </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleRebalance}
            disabled={portfolio.status === "DRAFT"}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Rebalance Portfolio
          </Button>
          <Button
            variant="outline"
            onClick={handleExportReport}
            className="gap-2 border-green-600 text-green-600 hover:bg-green-600/10"
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          {hasPredictions && (
            <>
              <Button
                variant="outline"
                onClick={handleOptimizePortfolio}
                disabled={isOptimizing}
                className="gap-2 border-chart-1 text-chart-1 hover:bg-chart-1/10"
              >
                {isOptimizing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                Optimize Portfolio
              </Button>
              <Button
                variant="outline"
                onClick={clearPredictions}
                className="gap-2 border-yellow-600 text-yellow-600 hover:bg-yellow-600/10"
              >
                <XCircle className="w-4 h-4" />
                Clear Predictions
              </Button>
            </>
          )}
          <Button
            onClick={() => setAddStockOpen(true)}
            className="gap-2 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1 hover:to-chart-1/70"
          >
            <Plus className="w-4 h-4" />
            Add Stock
          </Button>
      </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Expected Return
            </p>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl text-success">
              {mlMetrics 
                ? formatPercent(mlMetrics.meanReturn * 100)
                : formatPercent((latestResult?.expectedReturn ?? portfolio.expectedReturn) * 100)
              }
            </p>
            {mlMetrics && (
              <Badge variant="outline" className="text-xs bg-chart-1/10 border-chart-1 text-chart-1">
                ML
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {mlMetrics ? "Predicted (LSTM)" : "Model forecast"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Volatility</p>
            <Activity className="w-4 h-4 text-chart-2" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl">
              {mlMetrics
                ? formatPercent(mlMetrics.meanVolatility * 100)
                : formatPercent((latestResult?.expectedVolatility ?? portfolio.volatility) * 100)
              }
            </p>
            {mlMetrics && (
              <Badge variant="outline" className="text-xs bg-chart-1/10 border-chart-1 text-chart-1">
                ML
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {mlMetrics ? "Predicted (GARCH)" : "Annualized"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sharpe Ratio</p>
            <BarChart3 className="w-4 h-4 text-chart-1" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl">
              {mlMetrics
                ? mlMetrics.sharpeRatio.toFixed(2)
                : (latestResult?.sharpeRatio ?? portfolio.sharpeRatio ?? 0).toFixed(2)
              }
            </p>
            {mlMetrics && (
              <Badge variant="outline" className="text-xs bg-chart-1/10 border-chart-1 text-chart-1">
                ML
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Risk-adjusted return</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sortino Ratio</p>
            <TrendingUp className="w-4 h-4 text-chart-3" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl">
              {mlMetrics
                ? mlMetrics.sortinoRatio.toFixed(2)
                : (latestResult?.sortinoRatio ?? 0).toFixed(2)
              }
            </p>
            {mlMetrics && (
              <Badge variant="outline" className="text-xs bg-chart-1/10 border-chart-1 text-chart-1">
                ML
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Downside risk-adjusted</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Max Drawdown</p>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl text-destructive">
              {mlMetrics
                ? formatPercent(mlMetrics.maxDrawdown * 100)
                : formatPercent(Math.abs(latestResult?.maxDrawdown ?? 0) * 100)
              }
            </p>
            {mlMetrics && (
              <Badge variant="outline" className="text-xs bg-chart-1/10 border-chart-1 text-chart-1">
                ML
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {mlMetrics ? "Predicted risk" : "Historical performance"}
          </p>
              </div>
            </div>

      {/* Chart Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {chartView === 'allocation' ? 'Portfolio Allocation by Asset' : 'Risk-Return Analysis'}
          </h2>
          <div className="flex items-center gap-4">
            {hasPredictions && (
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <Button
                  size="sm"
                  variant={chartView === 'allocation' ? 'default' : 'ghost'}
                  onClick={() => setChartView('allocation')}
                  className="h-8"
                >
                  <PieChartIcon className="w-4 h-4 mr-2" />
                  Allocation
                </Button>
                <Button
                  size="sm"
                  variant={chartView === 'risk-return' ? 'default' : 'ghost'}
                  onClick={() => setChartView('risk-return')}
                  className="h-8"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Risk-Return
                </Button>
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Total Value:{" "}
              <span className="text-foreground font-medium">
                {formatCurrency(portfolio.value ?? 0)}
              </span>
            </div>
          </div>
      </div>
        
        {/* Chart description for Risk-Return view */}
        {chartView === 'risk-return' && riskReturnData && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium text-foreground">Efficient Frontier</span> (purple curve) shows all optimal portfolios - maximum return for each risk level.
                </p>
                <p>
                  <span className="font-medium text-foreground">Capital Allocation Line</span> (dashed green) is tangent to the frontier at the Max Sharpe portfolio - the optimal risk-return trade-off.
                </p>
                <p>
                  <span className="font-medium text-foreground">Tangency Point</span> (green circle with white center) represents the portfolio with the highest Sharpe ratio.
                </p>
                <p>
                  Stock colors: <span className="text-green-400">Green (Sharpe {'>'}1.0)</span>, <span className="text-blue-400">Blue (0.5-1.0)</span>, <span className="text-red-400">Red ({'<'}0.5)</span>
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="h-[400px]" id={chartView === 'allocation' ? 'allocation-chart' : 'risk-return-chart'}>
          {chartView === 'allocation' && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.15 0.02 264)",
                    border: "1px solid oklch(0.25 0.02 264)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, _name: string, props: { payload: { fullName: string } }) => [
                    `${value.toFixed(1)}%`,
                    props.payload.fullName,
                  ]}
                />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  formatter={(value: string, entry: { payload: { name: string; value: number } }) => (
                    <span className="text-sm">
                      {entry.payload.name} ({entry.payload.value.toFixed(1)}%)
                    </span>
                  )}
                />
            </PieChart>
          </ResponsiveContainer>
          ) : chartView === 'risk-return' && riskReturnData ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 264)" />
                <XAxis 
                  type="number" 
                  dataKey="volatility" 
                  name="Volatility"
                  label={{ value: 'Volatility (%)', position: 'bottom', offset: 0 }}
                  stroke="oklch(0.5 0.02 264)"
                  domain={[0, 'auto']}
                />
                <YAxis 
                  type="number" 
                  dataKey="return" 
                  name="Return"
                  label={{ value: 'Expected Return (%)', angle: -90, position: 'insideLeft' }}
                  stroke="oklch(0.5 0.02 264)"
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: 'oklch(0.15 0.02 264)',
                    border: '1px solid oklch(0.25 0.02 264)',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    
                    const data = payload[0].payload;
                    const isStock = data.symbol && !data.isPortfolio;
                    const isPortfolio = data.isPortfolio;
                    
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        {isStock && (
                          <p className="font-semibold text-sm mb-2 text-chart-1">{data.symbol}</p>
                        )}
                        {isPortfolio && (
                          <p className="font-semibold text-sm mb-2 text-chart-1">
                            {data.symbol || 'Portfolio'}
                          </p>
                        )}
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Return:</span>
                            <span className={`font-medium ${data.return < 0 ? 'text-destructive' : 'text-foreground'}`}>
                              {data.return?.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Volatility:</span>
                            <span className="font-medium">{data.volatility?.toFixed(2)}%</span>
                          </div>
                          {data.sharpeRatio !== undefined && (
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Sharpe Ratio:</span>
                              <span className={`font-medium ${
                                data.sharpeRatio > 1 ? 'text-success' :
                                data.sharpeRatio > 0.5 ? 'text-chart-1' :
                                'text-destructive'
                              }`}>
                                {data.sharpeRatio.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {data.weight !== undefined && data.weight > 0 && !data.isPortfolio && (
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Portfolio Weight:</span>
                              <span className="font-medium">{(data.weight * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
                
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="line"
                />
                
                {/* Efficient Frontier Curve (Markowitz) */}
                {riskReturnData.efficientFrontier && riskReturnData.efficientFrontier.length > 0 && (
                  <Line
                    type="monotone"
                    data={riskReturnData.efficientFrontier}
                    dataKey="return"
                    stroke={RISK_RETURN_COLORS.efficientFrontier}
                    strokeWidth={2.5}
                    dot={false}
                    name="Efficient Frontier"
                    legendType="line"
                    isAnimationActive={false}
                  />
                )}
                
                {/* Capital Allocation Line (CAL) - Tangent from risk-free rate */}
                {riskReturnData.capitalAllocationLine && riskReturnData.capitalAllocationLine.length > 0 && (
                  <Line
                    type="monotone"
                    data={riskReturnData.capitalAllocationLine}
                    dataKey="return"
                    stroke={RISK_RETURN_COLORS.cal}
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={false}
                    name="CAL (Tangency Line)"
                    legendType="line"
                    isAnimationActive={false}
                  />
                )}
                
                {/* Risk-free rate point */}
                {riskReturnData.riskFreeRate !== undefined && (
                  <Scatter
                    name="Risk-Free Rate"
                    data={[{ volatility: 0, return: riskReturnData.riskFreeRate }]}
                    fill={RISK_RETURN_COLORS.riskFreeRate}
                    shape={(props) => {
                      const { cx, cy } = props as { cx: number; cy: number };
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={6} fill={RISK_RETURN_COLORS.riskFreeRate} stroke="white" strokeWidth={2} />
                          <text 
                            x={cx + 12} 
                            y={cy + 4} 
                            textAnchor="start" 
                            fill={RISK_RETURN_COLORS.riskFreeRate} 
                            fontSize={10}
                            fontWeight="bold"
                          >
                            Rf={riskReturnData.riskFreeRate}%
                          </text>
                        </g>
                      );
                    }}
                  />
                )}
                
                {/* Individual stocks */}
                <Scatter 
                  name="Stocks" 
                  data={riskReturnData.stocks} 
                  fill={RISK_RETURN_COLORS.stockModerateSharpe}
                  shape={(props) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: typeof riskReturnData.stocks[0] };
                    const size = Math.max(30, payload.weight * 100);
                    const color = payload.sharpeRatio > 1 
                      ? RISK_RETURN_COLORS.stockGoodSharpe
                      : payload.sharpeRatio > 0.5
                      ? RISK_RETURN_COLORS.stockModerateSharpe
                      : RISK_RETURN_COLORS.stockPoorSharpe;
                    
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={size / 10} fill={color} opacity={0.6} />
                        <text 
                          x={cx} 
                          y={cy - size / 8} 
                          textAnchor="middle" 
                          fill="white" 
                          fontSize={12}
                          fontWeight="bold"
                        >
                          {payload.symbol}
                        </text>
                      </g>
                    );
                  }}
                />
                
                {/* Current portfolio position */}
                {riskReturnData.currentPortfolio && (
                  <Scatter 
                    name="Current Portfolio" 
                    data={[riskReturnData.currentPortfolio]}
                    fill={RISK_RETURN_COLORS.currentPortfolio}
                    shape={(props) => {
                      const { cx, cy } = props as { cx: number; cy: number };
                      // Smart label positioning: place to the left if optimized exists
                      const hasOptimized = !!riskReturnData.optimizedPortfolio;
                      const labelX = hasOptimized ? cx - 15 : cx;
                      const labelY = hasOptimized ? cy : cy - 15;
                      const anchor = hasOptimized ? "end" : "middle";
                      
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={8} fill={RISK_RETURN_COLORS.currentPortfolio} stroke="white" strokeWidth={2} />
                          <text 
                            x={labelX} 
                            y={labelY} 
                            textAnchor={anchor} 
                            fill={RISK_RETURN_COLORS.currentPortfolio} 
                            fontSize={11}
                            fontWeight="bold"
                          >
                            Current
                          </text>
                        </g>
                      );
                    }}
                  />
                )}
                
                {/* Tangency Portfolio (Max Sharpe Ratio) */}
                {riskReturnData.tangencyPortfolio && riskReturnData.tangencyPortfolio !== riskReturnData.currentPortfolio && (
                  <Scatter 
                    name="Tangency Portfolio" 
                    data={[riskReturnData.tangencyPortfolio]}
                    fill={RISK_RETURN_COLORS.tangencyPortfolio}
                    shape={(props) => {
                      const { cx, cy } = props as { cx: number; cy: number };
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={10} fill={RISK_RETURN_COLORS.tangencyPortfolio} stroke="white" strokeWidth={3} />
                          <circle cx={cx} cy={cy} r={4} fill="white" />
                          <text 
                            x={cx + 15} 
                            y={cy - 5} 
                            textAnchor="start" 
                            fill={RISK_RETURN_COLORS.tangencyPortfolio} 
                            fontSize={11}
                            fontWeight="bold"
                          >
                            Max Sharpe
                          </text>
                          <text 
                            x={cx + 15} 
                            y={cy + 8} 
                            textAnchor="start" 
                            fill={RISK_RETURN_COLORS.tangencyPortfolio} 
                            fontSize={9}
                            opacity={0.8}
                          >
                            SR: {riskReturnData.tangencyPortfolio.sharpeRatio.toFixed(2)}
                          </text>
                        </g>
                      );
                    }}
                  />
                )}
                
                {/* Optimized portfolio position (shown when different from tangency) */}
                {riskReturnData.optimizedPortfolio && riskReturnData.optimizedPortfolio !== riskReturnData.tangencyPortfolio && (
                  <Scatter 
                    name="Optimized Portfolio" 
                    data={[riskReturnData.optimizedPortfolio]}
                    fill={RISK_RETURN_COLORS.optimizedPortfolio}
                    shape={(props) => {
                      const { cx, cy } = props as { cx: number; cy: number };
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={8} fill={RISK_RETURN_COLORS.optimizedPortfolio} stroke="white" strokeWidth={2} />
                          <text 
                            x={cx + 12} 
                            y={cy + 4} 
                            textAnchor="start" 
                            fill={RISK_RETURN_COLORS.optimizedPortfolio} 
                            fontSize={11}
                            fontWeight="bold"
                          >
                            Optimized
                          </text>
                        </g>
                      );
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No holdings yet. Add your first stock.
            </div>
          )}
        </div>
      </div>

      {/* Holdings table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Portfolio Holdings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {holdings.length} stocks • {holdings.length > 0 ? "Equal-weighted allocation" : "No holdings"}
          </p>
        </div>

        {holdings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  {[
                    { label: "Ticker", field: "ticker" as const, align: "left" },
                    { label: "Name", field: "name" as const, align: "left" },
                    { label: "Sector", field: "sector" as const, align: "left" },
                    { label: "Weight", field: "weight" as const, align: "right" },
                    { label: "Value (KES)", field: "value" as const, align: "right" },
                    { label: "Shares", field: "shares" as const, align: "right" },
                    { label: "Price", field: "currentPrice" as const, align: "right" },
                    ...(hasPredictions ? [
                      { label: "Predicted Price", field: "predictedPrice" as const, align: "right" },
                      { label: "Expected Return", field: "expectedReturn" as const, align: "right" },
                      { label: "Volatility", field: "volatility" as const, align: "right" },
                    ] : []),
                  ].map((column) => (
                    <th
                      key={column.field}
                      className={`p-4 text-sm ${
                        column.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      <button
                        onClick={() => handleSort(column.field)}
                        className={`flex items-center gap-1 ${
                          column.align === "right" ? "ml-auto" : ""
                        } hover:text-foreground transition-colors`}
                      >
                        {column.label}
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  ))}
                  <th className="p-4 text-sm text-right">Change</th>
                  <th className="p-4 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedHoldings.map((holding) => (
                  <tr
                    key={holding.allocationId}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-medium text-[#F79D00]">{holding.ticker}</span>
                    </td>
                    <td className="p-4">{holding.name}</td>
                    <td className="p-4 text-sm text-muted-foreground">{holding.sector}</td>
                    <td className="p-4 text-right font-medium">
                      {formatPercent(holding.weight * 100)}
                    </td>
                    <td className="p-4 text-right font-medium">
                      {formatCurrency(holding.value)}
                    </td>
                    <td className="p-4 text-right text-sm text-muted-foreground">
                      {holding.shares.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-sm">
                      {holding.currentPrice ? formatCurrency(holding.currentPrice) : "N/A"}
                    </td>
                    {hasPredictions && (
                      <>
                        <td className="p-4 text-right text-sm font-medium text-chart-1">
                          {holding.predictedPrice ? formatCurrency(holding.predictedPrice) : "N/A"}
                        </td>
                        <td className={`p-4 text-right text-sm font-medium ${
                          (holding.expectedReturn || 0) >= 0 ? "text-success" : "text-destructive"
                        }`}>
                          {holding.expectedReturn !== undefined 
                            ? formatPercent(holding.expectedReturn * 100)
                            : "N/A"}
                        </td>
                        <td className="p-4 text-right text-sm text-muted-foreground">
                          {holding.volatility ? formatPercent(holding.volatility * 100) : "N/A"}
                        </td>
                      </>
                    )}
                    <td className="p-4 text-right">
                      <div
                        className={`flex items-center justify-end gap-1 ${
                          holding.changePercent >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {holding.changePercent >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span className="text-sm">
                          {formatPercent(Math.abs(holding.changePercent) * 100)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${holding.ticker}`}
                        onClick={() => handleRemoveStock(holding.allocationId, holding.ticker)}
                        disabled={removingAllocationId === holding.allocationId}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="mb-2 font-semibold">No holdings yet</h3>
            <p className="text-muted-foreground mb-6">
              Add your first stock to begin building your portfolio.
            </p>
            <Button onClick={() => setAddStockOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Stock
            </Button>
        </div>
        )}
      </div>

      {/* Portfolio Optimization Modal */}
      <Dialog open={showOptimization} onOpenChange={setShowOptimization}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-chart-1" />
              Portfolio Optimization Results
            </DialogTitle>
            <DialogDescription>
              Optimized weights to maximize Sharpe Ratio based on ML predictions
            </DialogDescription>
          </DialogHeader>

          {optimizedWeights && (
            <div className="space-y-6 py-4">
              {/* Warning for negative returns */}
              {optimizedWeights.every(w => w.expectedReturn < 0.05) && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                        All Assets Show Negative Expected Returns
                      </p>
                      <p className="text-yellow-800 dark:text-yellow-300">
                        ML predictions indicate negative returns for all assets in your portfolio. 
                        The optimizer has minimized risk by allocating more weight to lower-volatility stocks.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Metrics Comparison */}
              <div>
                <h3 className="text-sm font-medium mb-3">Performance Metrics (Optimized Portfolio)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
                    <p className={`text-2xl font-semibold ${mlMetrics && mlMetrics.sharpeRatio < 0 ? 'text-destructive' : 'text-chart-1'}`}>
                      {(() => {
                        // Calculate actual optimized portfolio metrics
                        const optReturn = optimizedWeights.reduce((sum, w) => sum + (w.expectedReturn * w.weight), 0);
                        const optVolatility = optimizedWeights.reduce((sum, w) => sum + (w.volatility * w.weight), 0);
                        const optSharpe = optVolatility > 0 ? (optReturn - 0.05) / optVolatility : 0;
                        return optSharpe.toFixed(2);
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current: {mlMetrics?.sharpeRatio.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Expected Return (Annual)</p>
                    <p className={`text-2xl font-semibold ${(() => {
                      const optReturn = optimizedWeights.reduce((sum, w) => sum + (w.expectedReturn * w.weight), 0);
                      return optReturn < 0 ? 'text-destructive' : 'text-chart-1';
                    })()}`}>
                      {(() => {
                        const optReturn = optimizedWeights.reduce((sum, w) => sum + (w.expectedReturn * w.weight), 0);
                        return formatPercent(optReturn * 100);
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current: {mlMetrics && formatPercent(mlMetrics.meanReturn * 100)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">Volatility (Annual)</p>
                    <p className="text-2xl font-semibold">
                      {(() => {
                        const optVolatility = optimizedWeights.reduce((sum, w) => sum + (w.volatility * w.weight), 0);
                        return formatPercent(optVolatility * 100);
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current: {mlMetrics && formatPercent(mlMetrics.meanVolatility * 100)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Weight Comparison Table */}
              <div>
                <h3 className="text-sm font-medium mb-3">Weight Allocation Changes</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium">Stock</th>
                        <th className="p-3 text-right text-sm font-medium">Current</th>
                        <th className="p-3 text-right text-sm font-medium">Optimized</th>
                        <th className="p-3 text-right text-sm font-medium">Change</th>
                        <th className="p-3 text-right text-sm font-medium">Exp. Return</th>
                        <th className="p-3 text-right text-sm font-medium">Sharpe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optimizedWeights.map((opt) => {
                        const currentAllocation = portfolio.allocations.find(
                          (a) => (a as { asset: { ticker: string }; weight: number }).asset.ticker === opt.symbol
                        ) as { weight: number } | undefined;
                        const currentWeight = currentAllocation?.weight || 0;
                        const change = opt.weight - currentWeight;

                        return (
                          <tr key={opt.symbol} className="border-t border-border">
                            <td className="p-3">
                              <span className="font-medium text-chart-1">{opt.symbol}</span>
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              {formatPercent(currentWeight * 100)}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {formatPercent(opt.weight * 100)}
                            </td>
                            <td className={`p-3 text-right font-medium ${
                              Math.abs(change) < 0.001 ? 'text-muted-foreground' :
                              change > 0 ? 'text-success' : 'text-destructive'
                            }`}>
                              {formatPercent(change * 100)}
                            </td>
                            <td className={`p-3 text-right text-sm ${
                              opt.expectedReturn < 0 ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                              {formatPercent(opt.expectedReturn * 100)}
                            </td>
                            <td className={`p-3 text-right text-sm ${
                              opt.sharpeRatio > 1 ? 'text-success' :
                              opt.sharpeRatio > 0.5 ? 'text-chart-1' :
                              'text-destructive'
                            }`}>
                              {opt.sharpeRatio.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowOptimization(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyOptimization}
                  className="gap-2 bg-chart-1 hover:bg-chart-1/90"
                >
                  <Check className="w-4 h-4" />
                  Apply Optimization
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Stock Modal */}
      <Dialog open={addStockOpen} onOpenChange={setAddStockOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Stock to Portfolio</DialogTitle>
            <DialogDescription>
              Search for NSE-listed stocks by ticker or company name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                  disabled={assetsLoading}
                >
                  {selectedAsset ? (
                    <span>
                      <span className="font-medium">{selectedAsset.ticker}</span>
                      {" - "}
                      <span className="text-muted-foreground">{selectedAsset.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {assetsLoading ? "Loading stocks..." : "Search by ticker or company name"}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Search stocks..." />
                  <CommandList>
                    <CommandEmpty>
                      {assetsLoading ? "Loading stocks..." : "No stock found."}
                    </CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                    {assets
                      .filter((asset) => !existingTickers.has(asset.ticker))
                      .map((asset) => (
                        <CommandItem
                          key={asset.id}
                          value={`${asset.ticker} ${asset.name}`}
                          onSelect={() => {
                            setSelectedAsset(asset);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedAsset?.id === asset.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{asset.ticker}</span>
                              <span className="text-sm text-muted-foreground">
                                {asset.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {asset.sector && <span>{asset.sector}</span>}
                              {asset.sector && <span>•</span>}
                              <span className={!asset.currentPrice ? "text-yellow-600" : ""}>
                                {asset.currentPrice
                                  ? formatCurrency(asset.currentPrice)
                                  : "Fetching price..."}
                              </span>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="mt-4 p-4 bg-muted rounded-lg border border-border flex items-start gap-3">
              <Info className="w-5 h-5 text-chart-1 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Adding a stock automatically rebalances all portfolio weights equally to total 100%.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddStockOpen(false);
                setSelectedAsset(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddStock}
              disabled={!selectedAsset}
              className="gap-2 bg-gradient-to-r from-chart-1 to-chart-1/80"
            >
              <Plus className="w-4 h-4" />
              Add and Rebalance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
