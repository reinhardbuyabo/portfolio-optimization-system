'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Role } from "@prisma/client";
import { toast } from "sonner";

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
import { OptimizationModal } from "./optimization-modal";

type PortfolioCardProps = {
  portfolio: Awaited<ReturnType<typeof getPortfoliosWithRelations>>[0];
};

export function PortfolioCard({ portfolio }: PortfolioCardProps) {
  const role = useRole();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOptimize = async () => {
    const response = await fetch(`/api/portfolios/${portfolio.id}/optimize`, {
      method: "POST",
    });
    const results = await response.json();
    setOptimizationResults(results);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete portfolio "${portfolio.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/portfolios/${portfolio.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete portfolio");
      }
      toast.success("Portfolio deleted");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete portfolio"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setOptimizationResults(null);
  };

  const canManage = role === Role.PORTFOLIO_MANAGER || role === Role.ADMIN;

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow flex flex-col justify-between">
        <Link
          href={`/dashboard/portfolios/${portfolio.id}`}
          data-testid={`portfolio-card-link-${portfolio.id}`}
        >
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
        {canManage && (
          <CardFooter className="flex gap-2">
            {role === Role.PORTFOLIO_MANAGER && (
              <Button onClick={handleOptimize} className="flex-1">
                Optimize
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </CardFooter>
        )}
      </Card>
      <OptimizationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        results={optimizationResults}
        portfolioId={portfolio.id}
      />
    </>
  );
}
