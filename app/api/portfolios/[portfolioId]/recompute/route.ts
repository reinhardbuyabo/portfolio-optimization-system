import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { computePortfolioMetrics, getLatestClosePriceByTicker } from "@/lib/portfolio-metrics";

/**
 * POST /api/portfolios/[portfolioId]/recompute
 * Recomputes portfolio metrics based on current allocations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { portfolioId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: params.portfolioId },
      include: {
        allocations: {
          include: {
            asset: true,
          },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    // Check authorization
    if (portfolio.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare allocations for metric computation
    const allocations = portfolio.allocations.map((alloc) => ({
      assetId: alloc.assetId,
      weight: alloc.weight,
    }));

    // Recompute portfolio metrics
    const metrics = await computePortfolioMetrics(allocations);

    // Update allocations with new values
    await prisma.$transaction(async (tx) => {
      // Update portfolio metrics
      await tx.portfolio.update({
        where: { id: portfolio.id },
        data: {
          value: metrics.value,
          expectedReturn: metrics.expectedReturn,
          sharpeRatio: metrics.sharpeRatio,
          volatility: metrics.volatility,
          holdingsCount: metrics.holdingsCount,
        },
      });

      // Update allocation values
      await Promise.all(
        portfolio.allocations.map(async (alloc) => {
          const latestPrice = await getLatestClosePriceByTicker(alloc.asset.ticker);
          const holdingValue = latestPrice ? metrics.value * alloc.weight : 0;

          return tx.portfolioAllocation.update({
            where: { id: alloc.id },
            data: {
              value: holdingValue,
            },
          });
        })
      );
    });

    // Fetch updated portfolio
    const updatedPortfolio = await prisma.portfolio.findUnique({
      where: { id: portfolio.id },
      include: {
        allocations: {
          include: {
            asset: true,
          },
        },
        results: {
          orderBy: { id: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json(updatedPortfolio);
  } catch (error: any) {
    console.error("POST /api/portfolios/[portfolioId]/recompute error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to recompute portfolio" },
      { status: 500 }
    );
  }
}

