
import { Suspense } from "react";
import { getPortfolios } from "@/lib/actions/portfolios.actions";
import { PortfoliosListSkeleton } from "@/components/shared/portfolios-list-skeleton";
import { ClientPortfoliosTable, columns } from "@/components/shared/client-portfolios-table";

type ClientPortfoliosPageProps = {
  searchParams: {
    investor?: string;
    sortBy?: string;
  };
};

export default async function ClientPortfoliosPage({ searchParams }: ClientPortfoliosPageProps) {
  const portfolios = await getPortfolios(searchParams);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Client Portfolios</h1>
      </div>
      <Suspense fallback={<PortfoliosListSkeleton />}>
        <ClientPortfoliosTable columns={columns} data={portfolios} />
      </Suspense>
    </div>
  );
}
