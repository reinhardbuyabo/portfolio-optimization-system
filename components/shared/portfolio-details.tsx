import { getPortfolioByIdWithRelations } from "@/lib/actions/portfolios.actions";
import { AddStockToPortfolio } from "./add-stock-to-portfolio";
import { HoldingsTable } from "./holdings-table";
import { PerformanceMetrics } from "./performance-metrics";
import { PortfolioMetadata } from "./portfolio-metadata";

type PortfolioDetailsProps = {
  portfolio: NonNullable<Awaited<ReturnType<typeof getPortfolioByIdWithRelations>>>;
};

export function PortfolioDetails({ portfolio }: PortfolioDetailsProps) {
  return (
    <div className="space-y-4">
      <PortfolioMetadata portfolio={portfolio} />
      <AddStockToPortfolio portfolioId={portfolio.id} />
      <HoldingsTable portfolioId={portfolio.id} allocations={portfolio.allocations} />
      <PerformanceMetrics results={portfolio.results} />
    </div>
  );
}
