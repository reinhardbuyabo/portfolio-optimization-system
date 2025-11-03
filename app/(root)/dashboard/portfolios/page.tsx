import { Suspense } from "react";
import { PortfoliosList } from "@/components/shared/portfolios-list";
import { PortfoliosListSkeleton } from "@/components/shared/portfolios-list-skeleton";
import { PortfolioFilters } from "@/components/shared/portfolio-filters";

type PortfoliosPageProps = {
  searchParams: {
    investor?: string;
    sortBy?: string;
  };
};

export default function PortfoliosPage({ searchParams }: PortfoliosPageProps) {
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Portfolios</h1>
        <PortfolioFilters />
      </div>
      <Suspense fallback={<PortfoliosListSkeleton />}>
        <PortfoliosList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
