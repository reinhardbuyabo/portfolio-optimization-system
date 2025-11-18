import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { portfolioSchema } from "@/lib/validators";
import { normalizeWeights, computePortfolioMetrics, getLatestClosePriceByTicker } from "@/lib/portfolio-metrics";

/**
 * POST /api/portfolios/create
 * Create a new portfolio with stocks and compute metrics
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = portfolioSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.errors },
        { status: 400 }
      );
    }

    const { name, riskTolerance, targetReturn, stocks = [] } = validated.data;

    // Apply equal weighting to all stocks
    let normalizedStocks = stocks;
    if (stocks.length > 0) {
      const equalWeight = 1.0 / stocks.length;
      normalizedStocks = stocks.map(stock => ({
        ...stock,
        weight: equalWeight,
      }));
    }

    // Get or create assets for each ticker
    const assetMap = new Map<string, string>(); // ticker -> assetId

    for (const stock of normalizedStocks) {
      let asset = await prisma.asset.findUnique({
        where: { ticker: stock.ticker },
      });

      if (!asset) {
        // Create asset if it doesn't exist
        asset = await prisma.asset.create({
          data: {
            ticker: stock.ticker,
            name: stock.ticker, // Default name, can be updated later
            sector: null,
          },
        });
      }

      assetMap.set(stock.ticker, asset.id);
    }

    // Create allocations array
    const allocations = normalizedStocks.map((stock) => ({
      assetId: assetMap.get(stock.ticker)!,
      weight: stock.weight,
    }));

    // Compute portfolio metrics
    const metrics = await computePortfolioMetrics(allocations);

    // Create portfolio with allocations
    const portfolio = await prisma.$transaction(async (tx) => {
      const newPortfolio = await tx.portfolio.create({
        data: {
          name: name.trim(),
          userId: session.user.id,
          riskTolerance: riskTolerance as "LOW" | "MEDIUM" | "HIGH",
          targetReturn: targetReturn,
          value: metrics.value,
          expectedReturn: metrics.expectedReturn,
          sharpeRatio: metrics.sharpeRatio,
          volatility: metrics.volatility,
          holdingsCount: metrics.holdingsCount,
          status: "ACTIVE",
        },
      });

      // Create allocations with computed values
      const allocationData = await Promise.all(
        allocations.map(async (alloc) => {
          const latestPrice = await getLatestClosePriceByTicker(
            normalizedStocks.find((s) => assetMap.get(s.ticker) === alloc.assetId)!.ticker
          );
          const holdingValue = latestPrice ? metrics.value * alloc.weight : 0;

          return {
            portfolioId: newPortfolio.id,
            assetId: alloc.assetId,
            weight: alloc.weight,
            value: holdingValue,
          };
        })
      );

      await tx.portfolioAllocation.createMany({
        data: allocationData,
      });

      // Fetch the complete portfolio with relations
      return tx.portfolio.findUnique({
        where: { id: newPortfolio.id },
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

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/portfolios/create error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create portfolio" },
      { status: 500 }
    );
  }
}

