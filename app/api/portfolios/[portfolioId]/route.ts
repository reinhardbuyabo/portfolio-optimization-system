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

    return NextResponse.json(portfolio);
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

