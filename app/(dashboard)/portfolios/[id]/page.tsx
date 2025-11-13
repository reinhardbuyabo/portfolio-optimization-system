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
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { toast } from "sonner";

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
}

const CHART_COLORS = [
  "oklch(0.7 0.15 142)",
  "oklch(0.65 0.15 258)",
  "oklch(0.75 0.12 192)",
  "oklch(0.7 0.14 60)",
  "oklch(0.65 0.13 312)",
  "oklch(0.72 0.11 25)",
];

export default function PortfolioDetailsPage() {
  const params = useParams<{ id: string }>();
  const portfolioId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [portfolio, setPortfolio] = useState<PortfolioApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      return {
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
    });
  }, [portfolio]);

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
    try {
      const response = await fetch(`/api/portfolios/${portfolioId}/recompute`, {
          method: "POST",
      });
        if (!response.ok) {
          const errorData = await response.json();
        throw new Error(errorData.error || "Failed to rebalance portfolio");
      }
      toast.success("Portfolio rebalanced successfully");
      fetchPortfolio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rebalance portfolio");
    }
  };

  const handleAddStock = async () => {
    if (!portfolioId || !selectedAsset) {
      toast.error("Please select a stock");
      return;
    }

    try {
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

      toast.success(`${selectedAsset.ticker} added and portfolio rebalanced`);
      setAddStockOpen(false);
      setSelectedAsset(null);
      fetchPortfolio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add stock");
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
            <Badge className={getRiskColor(portfolio.riskTolerance)}>
              <Shield className="w-3 h-3 mr-1" />
              {portfolio.riskTolerance} Risk
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
        <div className="flex gap-3">
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
          <p className="text-3xl text-success">
            {formatPercent((latestResult?.expectedReturn ?? portfolio.expectedReturn) * 100)}
          </p>
          <p className="text-xs text-muted-foreground">Model forecast</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Volatility</p>
            <Activity className="w-4 h-4 text-chart-2" />
          </div>
          <p className="text-3xl">
            {formatPercent((latestResult?.expectedVolatility ?? portfolio.volatility) * 100)}
          </p>
          <p className="text-xs text-muted-foreground">Annualized</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sharpe Ratio</p>
            <BarChart3 className="w-4 h-4 text-chart-1" />
          </div>
          <p className="text-3xl">
            {(latestResult?.sharpeRatio ?? portfolio.sharpeRatio ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">Risk-adjusted return</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sortino Ratio</p>
            <TrendingUp className="w-4 h-4 text-chart-3" />
                </div>
          <p className="text-3xl">
            {(latestResult?.sortinoRatio ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">Downside risk-adjusted</p>
                </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Max Drawdown</p>
            <TrendingDown className="w-4 h-4 text-destructive" />
                </div>
          <p className="text-3xl text-destructive">
            {formatPercent(Math.abs(latestResult?.maxDrawdown ?? 0) * 100)}
          </p>
          <p className="text-xs text-muted-foreground">Historical performance</p>
              </div>
            </div>

      {/* Allocation chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Portfolio Allocation by Asset</h2>
          <div className="text-sm text-muted-foreground">
            Total Value:{" "}
            <span className="text-foreground font-medium">
              {formatCurrency(portfolio.value ?? 0)}
            </span>
          </div>
      </div>
        <div className="h-[400px]">
          {chartData.length > 0 ? (
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
                  formatter={(value: number, _name, props: any) => [
                    `${value.toFixed(1)}%`,
                    props.payload.fullName,
                  ]}
                />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  formatter={(value, entry: any) => (
                    <span className="text-sm">
                      {entry.payload.name} ({entry.payload.value.toFixed(1)}%)
                    </span>
                  )}
                />
            </PieChart>
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
                              <span>
                                {asset.currentPrice
                                  ? formatCurrency(asset.currentPrice)
                                  : "Price unavailable"}
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
