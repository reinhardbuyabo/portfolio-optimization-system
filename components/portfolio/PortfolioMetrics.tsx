"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";
import { TrendingUp, Activity, BarChart3, TrendingDown, AlertTriangle } from "lucide-react";

interface PortfolioMetricsProps {
  expectedReturn?: number;
  volatility?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
}

export function PortfolioMetrics({
  expectedReturn,
  volatility,
  sharpeRatio,
  sortinoRatio,
  maxDrawdown,
}: PortfolioMetricsProps) {
  const metrics = [
    {
      title: "Expected Return",
      value: expectedReturn ? formatPercent(expectedReturn * 100) : "N/A",
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      title: "Volatility",
      value: volatility ? formatPercent(volatility * 100) : "N/A",
      icon: Activity,
      color: "text-orange-500",
    },
    {
      title: "Sharpe Ratio",
      value: sharpeRatio ? sharpeRatio.toFixed(2) : "N/A",
      icon: BarChart3,
      color: "text-blue-500",
    },
    {
      title: "Sortino Ratio",
      value: sortinoRatio ? sortinoRatio.toFixed(2) : "N/A",
      icon: TrendingUp,
      color: "text-purple-500",
    },
    {
      title: "Max Drawdown",
      value: maxDrawdown ? formatPercent(Math.abs(maxDrawdown) * 100) : "N/A",
      icon: TrendingDown,
      color: "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

