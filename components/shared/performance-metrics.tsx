import { getPortfolioById } from "@/lib/actions/portfolios.actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PerformanceMetricsProps = {
  results: NonNullable<Awaited<ReturnType<typeof getPortfolioById>>>["results"];
};

export function PerformanceMetrics({ results }: PerformanceMetricsProps) {
  const latestResult = results[0];

  if (!latestResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No performance data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold">Expected Return</p>
            <p>{(latestResult.expectedReturn * 100).toFixed(2)}%</p>
          </div>
          <div>
            <p className="font-semibold">Volatility</p>
            <p>{(latestResult.expectedVolatility * 100).toFixed(2)}%</p>
          </div>
          <div>
            <p className="font-semibold">Sharpe Ratio</p>
            <p>{latestResult.sharpeRatio.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
