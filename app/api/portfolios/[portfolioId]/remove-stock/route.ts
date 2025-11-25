import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { computePortfolioMetrics, getLatestClosePriceByTicker } from "@/lib/portfolio-metrics";

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
    const allocationId = body?.allocationId as string | undefined;

    if (!allocationId) {
      return NextResponse.json(
        { error: "allocationId is required" },
        { status: 400 }
      );
    }

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

    if (portfolio.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allocationToRemove = portfolio.allocations.find(
      (alloc) => alloc.id === allocationId
    );

    if (!allocationToRemove) {
      return NextResponse.json(
        { error: "Allocation not found in portfolio" },
        { status: 404 }
      );
    }

    const remainingAllocations = portfolio.allocations.filter(
      (alloc) => alloc.id !== allocationId
    );

    await prisma.$transaction(async (tx) => {
      await tx.portfolioAllocation.delete({
        where: { id: allocationId },
      });

      if (remainingAllocations.length === 0) {
        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: {
            value: 0,
            expectedReturn: 0,
            sharpeRatio: 0,
            volatility: 0,
            holdingsCount: 0,
          },
        });
        return;
      }

      const equalWeight = 1 / remainingAllocations.length;
      const normalizedAllocations = remainingAllocations.map((alloc) => ({
        assetId: alloc.assetId,
        weight: equalWeight,
      }));

      const metrics = await computePortfolioMetrics(normalizedAllocations);

      await Promise.all(
        remainingAllocations.map(async (alloc) => {
          const latestPrice =
            alloc.asset.data?.[0]?.close ??
            (await getLatestClosePriceByTicker(alloc.asset.ticker)) ??
            0;
          const holdingValue = latestPrice ? metrics.value * equalWeight : 0;

          await tx.portfolioAllocation.update({
            where: { id: alloc.id },
            data: {
              weight: equalWeight,
              value: holdingValue,
            },
          });
        })
      );

      await tx.portfolio.update({
        where: { id: portfolio.id },
        data: {
          value: metrics.value,
          expectedReturn: metrics.expectedReturn,
          sharpeRatio: metrics.sharpeRatio,
          volatility: metrics.volatility,
          holdingsCount: normalizedAllocations.length,
        },
      });
    });

    const updatedPortfolio = await prisma.portfolio.findUnique({
      where: { id: portfolio.id },
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
        results: {
          orderBy: { id: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json(updatedPortfolio, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/portfolios/[portfolioId]/remove-stock error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove stock from portfolio" },
      { status: 500 }
    );
  }
}

