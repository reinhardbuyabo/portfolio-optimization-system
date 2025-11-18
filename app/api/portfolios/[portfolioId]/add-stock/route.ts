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

    // Add new stock with equal weight distribution
    const totalAssets = allAllocations.length + 1;
    const equalWeight = 1 / totalAssets;
    
    allAllocations.push({
      assetId: asset.id,
      weight: equalWeight,
    });

    // Apply equal weighting to all allocations (rebalance with equal weights)
    const normalizedAllocations = allAllocations.map((alloc) => ({
      assetId: alloc.assetId,
      weight: equalWeight,
    }));

    // Recompute portfolio metrics
    const metrics = await computePortfolioMetrics(normalizedAllocations);

    // Get latest price for new stock (outside transaction to allow HTTP calls)
    let latestPriceForNewStock = await getLatestClosePriceByTicker(ticker);
    
    // If no price data exists in DB, try to fetch from historical API
    if (!latestPriceForNewStock) {
      try {
        const priceResponse = await fetch(`${request.nextUrl.origin}/api/stocks/historical?symbol=${ticker}&days=1`);
        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          latestPriceForNewStock = priceData.latestPrice || null;
        }
      } catch (fetchError) {
        console.warn(`Could not fetch price for ${ticker}:`, fetchError);
      }
    }

    // Update portfolio and allocations in transaction
    const updatedPortfolio = await prisma.$transaction(async (tx) => {
      // Create new allocation
      const holdingValue = latestPriceForNewStock ? metrics.value * (normalizedAllocations.find((a) => a.assetId === asset.id)?.weight ?? 0) : 0;

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

