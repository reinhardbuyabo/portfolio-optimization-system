import Link from "next/link";
import { getPortfoliosWithRelations } from "@/lib/actions/portfolios.actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PortfolioCardProps = {
  portfolio: Awaited<ReturnType<typeof getPortfoliosWithRelations>>[0];
};

export function PortfolioCard({ portfolio }: PortfolioCardProps) {
  return (
    <Link href={`/dashboard/portfolios/${portfolio.id}`} data-testid={`portfolio-card-link-${portfolio.id}`}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>{portfolio.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">{portfolio.user.name}</p>
          <p className="text-sm text-gray-400">
            Created on {new Date(portfolio.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
