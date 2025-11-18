import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { Role } from "@prisma/client";

/**
 * GET /api/portfolios/[portfolioId]
 * Get a single portfolio with computed metrics and allocations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { portfolioId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: params.portfolioId },
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

    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    // Check authorization
    if (session.user.role === "INVESTOR" && portfolio.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch prices from CSV data for assets without MarketData
    const enrichedAllocations = await Promise.all(
      portfolio.allocations.map(async (allocation) => {
        // If asset already has data, return as is
        if (allocation.asset.data && allocation.asset.data.length > 0) {
          return allocation;
        }

        // Otherwise, fetch from CSV via historical API
        try {
          const priceResponse = await fetch(
            `${request.nextUrl.origin}/api/stocks/historical?symbol=${allocation.asset.ticker}&days=2`
          );

          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            // Transform to match the expected structure
            const mockData = priceData.prices?.slice(0, 2).map((p: any) => ({
              close: p.price,
              date: new Date(p.date),
            })) || [];

            return {
              ...allocation,
              asset: {
                ...allocation.asset,
                data: mockData,
              },
            };
          }
        } catch (error) {
          console.warn(`Could not fetch price for ${allocation.asset.ticker}:`, error);
        }

        // Return allocation with empty data if fetch fails
        return allocation;
      })
    );

    // Return portfolio with enriched allocations
    return NextResponse.json({
      ...portfolio,
      allocations: enrichedAllocations,
    });
  } catch (error: any) {
    console.error("GET /api/portfolios/[portfolioId] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      select: {
        id: true,
        userId: true,
      },
    });

    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    const isOwner = portfolio.userId === session.user.id;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.portfolio.delete({
      where: { id: params.portfolioId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/portfolios/[portfolioId] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete portfolio" },
      { status: 500 }
    );
  }
}

