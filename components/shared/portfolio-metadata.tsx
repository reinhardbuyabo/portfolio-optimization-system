import { getPortfolioByIdWithRelations } from "@/lib/actions/portfolios.actions";

type PortfolioMetadataProps = {
  portfolio: NonNullable<Awaited<ReturnType<typeof getPortfolioByIdWithRelations>>>;
};

export function PortfolioMetadata({ portfolio }: PortfolioMetadataProps) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold">{portfolio.name}</h2>
      <p className="text-gray-500">
        Created by {portfolio.user.name} on{" "}
        {new Date(portfolio.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
