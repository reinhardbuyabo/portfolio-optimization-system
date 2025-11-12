"use client";

import { useMemo, useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Activity, BarChart3, AlertTriangle } from "lucide-react";
import { MetricCard } from "@/components/figma/MetricCard";
import { NewsCard } from "@/components/figma/NewsCard";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Portfolio {
  id: string;
  name: string;
  totalValue?: number;
  totalReturn?: number;
  volatility?: number;
  sharpeRatio?: number;
}

interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  sentiment?: "positive" | "negative" | "neutral";
  publishedAt: Date | string;
}

export default function DashboardPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch portfolios from API
        const portfoliosRes = await fetch("/api/portfolios");
        if (portfoliosRes.ok) {
          const data = await portfoliosRes.json();
          setPortfolios(Array.isArray(data) ? data : []);
        }

        // Fetch news from API
        const newsRes = await fetch("/api/news");
        if (newsRes.ok) {
          const data = await newsRes.json();
          setNews(Array.isArray(data) ? data.slice(0, 5) : []);
        }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";
      setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const totalValue = useMemo(
    () => portfolios.reduce((sum, p) => sum + (p.totalValue || 0), 0),
    [portfolios]
  );
  
  const avgReturn = useMemo(
    () => portfolios.length 
      ? portfolios.reduce((s, p) => s + (p.totalReturn || 0), 0) / portfolios.length 
      : 0,
    [portfolios]
  );
  
  const avgVolatility = useMemo(
    () => portfolios.length 
      ? portfolios.reduce((s, p) => s + (p.volatility || 0), 0) / portfolios.length 
      : 0,
    [portfolios]
  );
  
  const avgSharpe = useMemo(
    () => portfolios.length 
      ? portfolios.reduce((s, p) => s + (p.sharpeRatio || 0), 0) / portfolios.length 
      : 0,
    [portfolios]
  );

  // Generate chart data from portfolios
  const performanceData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return months.map((month, i) => ({
      month,
      value: totalValue * (1 + (i * 0.02)),
    }));
  }, [totalValue]);

  const allocationData = useMemo(() => {
    if (portfolios.length === 0) return [];
    return portfolios.slice(0, 5).map((p, i) => ({
      name: p.name,
      value: p.totalValue || 0,
    }));
  }, [portfolios]);

  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Portfolio performance and market insights
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Portfolio Value"
          value={formatCurrency(totalValue)}
          icon={DollarSign}
          trend={avgReturn > 0 ? "up" : "down"}
          change={avgReturn * 100}
        />
        <MetricCard
          title="Average Return"
          value={formatPercent(avgReturn)}
          icon={avgReturn >= 0 ? TrendingUp : TrendingDown}
          trend={avgReturn > 0 ? "up" : "down"}
          change={Math.abs(avgReturn) * 100}
        />
        <MetricCard
          title="Volatility"
          value={formatPercent(avgVolatility)}
          icon={Activity}
        />
        <MetricCard
          title="Sharpe Ratio"
          value={avgSharpe.toFixed(2)}
          icon={BarChart3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Portfolio Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Allocation Chart */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Portfolio Allocation</h3>
          {allocationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No portfolios to display
            </div>
          )}
        </div>
      </div>

      {/* Portfolios Table */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Your Portfolios</h3>
        {portfolios.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-right py-3 px-4 font-medium">Value</th>
                  <th className="text-right py-3 px-4 font-medium">Return</th>
                  <th className="text-right py-3 px-4 font-medium">Volatility</th>
                  <th className="text-right py-3 px-4 font-medium">Sharpe</th>
                </tr>
              </thead>
              <tbody>
                {portfolios.map((portfolio) => (
                  <tr key={portfolio.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-4">{portfolio.name}</td>
                    <td className="text-right py-3 px-4">{formatCurrency(portfolio.totalValue || 0)}</td>
                    <td className="text-right py-3 px-4">
                      <span className={portfolio.totalReturn && portfolio.totalReturn >= 0 ? "text-success" : "text-destructive"}>
                        {formatPercent(portfolio.totalReturn || 0)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">{formatPercent(portfolio.volatility || 0)}</td>
                    <td className="text-right py-3 px-4">{(portfolio.sharpeRatio || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No portfolios yet</p>
            <p className="text-sm mt-2">Create your first portfolio to get started</p>
          </div>
        )}
      </div>

      {/* Market News */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Market News</h3>
        {news.length > 0 ? (
          <div className="space-y-4">
            {news.map((item) => (
              <NewsCard key={item.id} article={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No news available
          </div>
        )}
      </div>
    </div>
  );
}
