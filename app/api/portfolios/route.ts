import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPortfoliosWithRelations } from "@/lib/actions/portfolios.actions";
import { prisma } from "@/db/prisma";

/**
 * GET /api/portfolios
 * Fetch all portfolios for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const investor = searchParams.get("investor") || undefined;
    const sortBy = searchParams.get("sortBy") || undefined;

    const portfolios = await getPortfoliosWithRelations({ investor, sortBy });
    
    // Include allocations for each portfolio and ensure metrics are up-to-date
    const portfoliosWithAllocations = await Promise.all(
      portfolios.map(async (portfolio) => {
        const allocations = await prisma.portfolioAllocation.findMany({
          where: { portfolioId: portfolio.id },
          include: {
            asset: {
              include: {
                data: {
                  orderBy: { date: 'desc' },
                  take: 1, // Get most recent price only
                },
              },
            },
          },
        });

        // If portfolio has no allocations, ensure metrics are zeroed
        if (allocations.length === 0 && portfolio.holdingsCount !== 0) {
          await prisma.portfolio.update({
            where: { id: portfolio.id },
            data: {
              holdingsCount: 0,
              value: 0,
              expectedReturn: 0,
              volatility: 0,
              sharpeRatio: 0,
            },
          });
          
          return {
            ...portfolio,
            holdingsCount: 0,
            value: 0,
            expectedReturn: 0,
            volatility: 0,
            sharpeRatio: 0,
            allocations,
          };
        }

        // If portfolio has allocations but holdingsCount is wrong, update it
        if (allocations.length > 0 && portfolio.holdingsCount !== allocations.length) {
          await prisma.portfolio.update({
            where: { id: portfolio.id },
            data: { holdingsCount: allocations.length },
          });
          
          return {
            ...portfolio,
            holdingsCount: allocations.length,
            allocations,
          };
        }

        return {
          ...portfolio,
          // Ensure riskTolerance has a value (fallback for legacy portfolios)
          riskTolerance: portfolio.riskTolerance || "MEDIUM",
          allocations,
        };
      })
    );
    
    return NextResponse.json(portfoliosWithAllocations);
  } catch (error: any) {
    console.error("GET /api/portfolios error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch portfolios" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portfolios
 * Create a new portfolio (legacy endpoint - use /api/portfolios/create instead)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, riskTolerance, targetReturn } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Portfolio name is required" }, { status: 400 });
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        userId: session.user.id,
        riskTolerance: (riskTolerance as "LOW" | "MEDIUM" | "HIGH") || "MEDIUM",
        targetReturn: targetReturn || 0.12,
        value: 0,
        expectedReturn: 0,
        sharpeRatio: 0,
        volatility: 0,
        holdingsCount: 0,
        status: "DRAFT",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/portfolios error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create portfolio" },
      { status: 500 }
    );
  }
}



