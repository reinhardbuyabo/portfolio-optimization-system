'use client';

import Link from "next/link";
import { getPortfoliosWithRelations } from "@/lib/actions/portfolios.actions";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/use-role";
import { Role } from "@prisma/client";
import { useState } from "react";
import { OptimizationModal } from "./optimization-modal";

type PortfolioCardProps = {
  portfolio: Awaited<ReturnType<typeof getPortfoliosWithRelations>>[0];
};

export function PortfolioCard({ portfolio }: PortfolioCardProps) {
  const role = useRole();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState(null);

  const handleOptimize = async () => {
    const response = await fetch(`/api/portfolios/${portfolio.id}/optimize`, {
      method: "POST",
    });
    const results = await response.json();
    setOptimizationResults(results);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setOptimizationResults(null);
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow flex flex-col justify-between">
        <Link href={`/dashboard/portfolios/${portfolio.id}`} data-testid={`portfolio-card-link-${portfolio.id}`}>
          <CardHeader>
            <CardTitle>{portfolio.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">{portfolio.user.name}</p>
            <p className="text-sm text-gray-400">
              Created on {new Date(portfolio.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Link>
        {role === Role.PORTFOLIO_MANAGER && (
          <CardFooter>
            <Button onClick={handleOptimize} className="w-full">
              Optimize Portfolio
            </Button>
          </CardFooter>
        )}
      </Card>
      <OptimizationModal isOpen={isModalOpen} onClose={closeModal} results={optimizationResults} portfolioId={portfolio.id} />
    </>
  );
}
