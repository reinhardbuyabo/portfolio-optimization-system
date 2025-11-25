"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface PortfolioOverviewProps {
  name: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  riskTolerance: "LOW" | "MEDIUM" | "HIGH";
  portfolioId: string;
  onRebalance?: () => void;
}

export function PortfolioOverview({
  name,
  status,
  riskTolerance,
  portfolioId,
  onRebalance,
}: PortfolioOverviewProps) {
  const handleRebalance = async () => {
    try {
      const response = await fetch(`/api/portfolios/${portfolioId}/recompute`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to rebalance portfolio");
      }

      toast.success("Portfolio rebalanced successfully");
      onRebalance?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rebalance portfolio");
    }
  };

  const statusColors = {
    DRAFT: "bg-gray-500",
    ACTIVE: "bg-green-500",
    ARCHIVED: "bg-gray-400",
  };

  const riskColors = {
    LOW: "bg-blue-500",
    MEDIUM: "bg-yellow-500",
    HIGH: "bg-red-500",
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{name}</h1>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[status]}>{status}</Badge>
          <Badge className={riskColors[riskTolerance]}>{riskTolerance} RISK</Badge>
        </div>
      </div>
      <Button
        onClick={handleRebalance}
        disabled={status === "DRAFT"}
        className="flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Rebalance Portfolio
      </Button>
    </div>
  );
}

