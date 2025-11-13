"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";

interface Allocation {
  id: string;
  weight: number;
  asset: {
    ticker: string;
    name: string;
    sector?: string;
  };
}

interface PortfolioPieChartProps {
  allocations: Allocation[];
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export function PortfolioPieChart({ allocations }: PortfolioPieChartProps) {
  if (allocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No holdings yet. Add your first stock.
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = allocations.map((allocation) => ({
    name: allocation.asset.ticker,
    value: allocation.weight,
    fullName: allocation.asset.name,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name} ${formatPercent(value * 100)}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatPercent(value * 100)}
              contentStyle={{
                backgroundColor: "#1B1F3B",
                border: "1px solid #30333A",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

