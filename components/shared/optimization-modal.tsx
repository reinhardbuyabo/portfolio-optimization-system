
'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { updatePortfolioAllocations } from '@/lib/actions/portfolios.actions';

interface OptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: any; // Replace with a proper type
  portfolioId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function OptimizationModal({ isOpen, onClose, results, portfolioId }: OptimizationModalProps) {
  if (!results) return null;

  const { current, optimized } = results;

  const handleApplyOptimization = async () => {
    const allocations = optimized.allocations.map((a: any) => ({ assetId: a.assetId, weight: a.weight }));
    await updatePortfolioAllocations(portfolioId, allocations);
    onClose();
  };

  const renderPieChart = (data: any, title: string) => (
    <div className="w-1/2">
      <h3 className="text-center font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data.allocations}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="weight"
            nameKey="ticker"
          >
            {data.allocations.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const renderMetricsTable = (data: any, title: string) => (
    <div className="w-1/2">
      <h3 className="text-center font-semibold">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          <tr>
            <td className="font-medium">Expected Return</td>
            <td className="text-right">{(data.expectedReturn * 100).toFixed(2)}%</td>
          </tr>
          <tr>
            <td className="font-medium">Volatility</td>
            <td className="text-right">{(data.volatility * 100).toFixed(2)}%</td>
          </tr>
          <tr>
            <td className="font-medium">Sharpe Ratio</td>
            <td className="text-right">{data.sharpeRatio.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Optimization Results</DialogTitle>
          <DialogDescription>
            Side-by-side comparison of the current and optimized portfolios.
          </DialogDescription>
        </DialogHeader>
        <div className="flex space-x-4">
          {renderPieChart(current, 'Current Portfolio')}
          {renderPieChart(optimized, 'Optimized Portfolio')}
        </div>
        <div className="flex space-x-4 mt-4">
          {renderMetricsTable(current, 'Current Metrics')}
          {renderMetricsTable(optimized, 'Optimized Metrics')}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Discard</Button>
          <Button onClick={handleApplyOptimization}>Apply Optimization</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
