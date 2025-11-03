import { getPortfolioByIdWithRelations } from "@/lib/actions/portfolios.actions";
import { PortfolioDetails } from "@/components/shared/portfolio-details";
import { notFound } from "next/navigation";

type PortfolioPageProps = {
  params: {
    portfolioId: string;
  };
};

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { portfolioId } = params;

  const portfolio = await getPortfolioByIdWithRelations(portfolioId);

  if (!portfolio) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4">
      <PortfolioDetails portfolio={portfolio} />
    </div>
  );
}
