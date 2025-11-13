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
    
    // Include allocations for each portfolio
    const portfoliosWithAllocations = await Promise.all(
      portfolios.map(async (portfolio) => {
        const allocations = await prisma.portfolioAllocation.findMany({
          where: { portfolioId: portfolio.id },
          include: {
            asset: {
              select: {
                id: true,
                ticker: true,
                name: true,
                sector: true,
              },
            },
          },
        });

        return {
          ...portfolio,
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
 * Create a new portfolio
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Portfolio name is required" }, { status: 400 });
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        userId: session.user.id,
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



