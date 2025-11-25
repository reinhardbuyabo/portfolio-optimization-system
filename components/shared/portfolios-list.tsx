import { getPortfoliosWithRelations } from "@/lib/actions/portfolios.actions";
import { PortfolioCard } from "./portfolio-card";

type PortfoliosListProps = {
  searchParams: {
    investor?: string;
    sortBy?: string;
  };
};

export async function PortfoliosList({ searchParams }: PortfoliosListProps) {
  const portfolios = await getPortfoliosWithRelations(searchParams);

  if (portfolios.length === 0) {
    return <p>No portfolios found.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {portfolios.map((portfolio) => (
        <PortfolioCard key={portfolio.id} portfolio={portfolio} />
      ))}
    </div>
  );
}
