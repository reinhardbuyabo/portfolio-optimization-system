import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";

/**
 * POST /api/portfolios/[portfolioId]/rebalance
 * Apply weights to portfolio allocations
 * - If weights provided: use custom weights (for optimization)
 * - If no weights: apply equal weighting (default rebalancing)
 * - Optionally accepts metrics to persist optimization results
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { portfolioId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { portfolioId } = params;
    const body = await request.json();
    const { weights: providedWeights, metrics } = body;

    // Verify portfolio exists and user has access
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        allocations: {
          include: {
            asset: true,
          },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    // Check authorization
    if (session.user.role === "INVESTOR" && portfolio.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const numAssets = portfolio.allocations.length;

    if (numAssets === 0) {
      return NextResponse.json(
        { error: "Portfolio has no assets to rebalance" },
        { status: 400 }
      );
    }

    // Determine weights to use
    let weights: Array<{ symbol: string; weight: number }>;

    if (providedWeights && Array.isArray(providedWeights) && providedWeights.length > 0) {
      // Use provided weights (optimization)
      weights = providedWeights;

      // Validate weights sum to 1 (100%)
      const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        return NextResponse.json(
          { error: `Weights must sum to 100% (currently ${(totalWeight * 100).toFixed(2)}%)` },
          { status: 400 }
        );
      }
    } else {
      // Apply equal weighting (default rebalancing)
      const equalWeight = 1.0 / numAssets;
      weights = portfolio.allocations.map((allocation) => ({
        symbol: allocation.asset.ticker,
        weight: equalWeight,
      }));
    }

    // Update allocations in a transaction
    await prisma.$transaction(async (tx) => {
      for (const weightData of weights) {
        const { symbol, weight } = weightData;

        // Find the allocation for this symbol
        const allocation = portfolio.allocations.find(
          (a) => a.asset.ticker === symbol
        );

        if (!allocation) {
          throw new Error(`Asset ${symbol} not found in portfolio`);
        }

        // Update the allocation weight
        await tx.portfolioAllocation.update({
          where: { id: allocation.id },
          data: {
            weight: weight,
            value: portfolio.value * weight, // Recalculate value
          },
        });
      }

      // Prepare portfolio update data
      const portfolioUpdateData: any = {
        updatedAt: new Date(),
      };

      // If metrics are provided, update portfolio metrics
      if (metrics) {
        if (metrics.expectedReturn !== undefined) {
          portfolioUpdateData.expectedReturn = metrics.expectedReturn;
        }
        if (metrics.volatility !== undefined) {
          portfolioUpdateData.volatility = metrics.volatility;
        }
        if (metrics.sharpeRatio !== undefined) {
          portfolioUpdateData.sharpeRatio = metrics.sharpeRatio;
        }
      }

      // Update portfolio with metrics and timestamp
      await tx.portfolio.update({
        where: { id: portfolioId },
        data: portfolioUpdateData,
      });

      // Create optimization result record if metrics provided
      if (metrics) {
        await tx.optimizationResult.create({
          data: {
            portfolioId: portfolioId,
            expectedReturn: metrics.expectedReturn || 0,
            expectedVolatility: metrics.volatility || 0,
            sharpeRatio: metrics.sharpeRatio || 0,
            sortinoRatio: metrics.sortinoRatio || 0,
            maxDrawdown: metrics.maxDrawdown || 0,
          },
        });
      }
    });

    // Fetch updated portfolio
    const updatedPortfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        allocations: {
          include: {
            asset: {
              include: {
                data: {
                  orderBy: { date: "desc" },
                  take: 2,
                  select: { close: true, date: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Portfolio rebalanced successfully",
      portfolio: updatedPortfolio,
    });
  } catch (error: any) {
    console.error("POST /api/portfolios/[portfolioId]/rebalance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to rebalance portfolio" },
      { status: 500 }
    );
  }
}
