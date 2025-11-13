import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { normalizeWeights, computePortfolioMetrics, getLatestClosePriceByTicker } from "@/lib/portfolio-metrics";

const addStockSchema = z.object({
  ticker: z.string().min(1, "Ticker is required"),
  weight: z.number().min(0).max(1).optional(),
});

/**
 * POST /api/portfolios/[portfolioId]/add-stock
 * Add a stock to an existing portfolio and recalculate metrics
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

    const body = await request.json();
    const validated = addStockSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      );
    }

    const { ticker, weight } = validated.data;

    // Get portfolio with existing allocations
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: params.portfolioId },
      include: {
        allocations: {
          include: {
            asset: {
              include: {
                data: {
                  orderBy: { date: "desc" },
                  take: 1,
                  select: { close: true, date: true },
                },
              },
            },
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

    // Check if stock already exists in portfolio
    const existingAllocation = portfolio.allocations.find(
      (alloc) => alloc.asset.ticker === ticker
    );

    if (existingAllocation) {
      return NextResponse.json(
        { error: "Stock already in portfolio" },
        { status: 400 }
      );
    }

    // Get or create asset
    let asset = await prisma.asset.findUnique({
      where: { ticker },
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          ticker,
          name: ticker,
          sector: null,
        },
      });
    }

    // Prepare all allocations including the new one
    const allAllocations = portfolio.allocations.map((alloc) => ({
      assetId: alloc.assetId,
      weight: alloc.weight,
    }));

    // If weight is provided, use it; otherwise distribute equally
    const newWeight = weight ?? 1 / (allAllocations.length + 1);
    allAllocations.push({
      assetId: asset.id,
      weight: newWeight,
    });

    // Normalize weights
    const normalized = normalizeWeights(
      allAllocations.map((alloc) => ({
        ticker: portfolio.allocations.find((a) => a.assetId === alloc.assetId)?.asset.ticker || ticker,
        weight: alloc.weight,
      }))
    );

    // Map back to allocations with assetIds
    const normalizedAllocations = allAllocations.map((alloc, idx) => {
      const normalizedWeight = normalized.find(
        (n) =>
          n.ticker ===
          (portfolio.allocations.find((a) => a.assetId === alloc.assetId)?.asset.ticker || ticker)
      )?.weight ?? normalized[idx]?.weight ?? 0;

      return {
        assetId: alloc.assetId,
        weight: normalizedWeight,
      };
    });

    // Recompute portfolio metrics
    const metrics = await computePortfolioMetrics(normalizedAllocations);

    // Update portfolio and allocations in transaction
    const updatedPortfolio = await prisma.$transaction(async (tx) => {
      // Create new allocation
      const latestPrice = await getLatestClosePriceByTicker(ticker);
      const holdingValue = latestPrice ? metrics.value * (normalizedAllocations.find((a) => a.assetId === asset.id)?.weight ?? 0) : 0;

      await tx.portfolioAllocation.create({
        data: {
          portfolioId: portfolio.id,
          assetId: asset.id,
          weight: normalizedAllocations.find((a) => a.assetId === asset.id)?.weight ?? 0,
          value: holdingValue,
        },
      });

      // Update existing allocations with new weights
      await Promise.all(
        portfolio.allocations.map(async (alloc) => {
          const newWeight = normalizedAllocations.find((a) => a.assetId === alloc.assetId)?.weight ?? alloc.weight;
          const latestPrice = alloc.asset.data?.[0]?.close ?? await getLatestClosePriceByTicker(alloc.asset.ticker) ?? 0;
          const holdingValue = latestPrice ? metrics.value * newWeight : 0;

          return tx.portfolioAllocation.update({
            where: { id: alloc.id },
            data: {
              weight: newWeight,
              value: holdingValue,
            },
          });
        })
      );

      // Update portfolio metrics
      return tx.portfolio.update({
        where: { id: portfolio.id },
        data: {
          value: metrics.value,
          expectedReturn: metrics.expectedReturn,
          sharpeRatio: metrics.sharpeRatio,
          volatility: metrics.volatility,
          holdingsCount: metrics.holdingsCount,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          allocations: {
            include: {
              asset: true,
            },
          },
        },
      });
    });

    return NextResponse.json(updatedPortfolio, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/portfolios/[portfolioId]/add-stock error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add stock to portfolio" },
      { status: 500 }
    );
  }
}

