"use server";

import { z } from "zod";
import { createPortfolioSchema, updatePortfolioAllocationsSchema, portfolioSchema } from "@/lib/validators";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { formatError, getErrorMessage } from "../utils";
import { Portfolio, Prisma, Role } from "@prisma/client";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export type PortfolioFormState = {
  message: string;
  success: boolean; // Add success flag
  fields?: Record<string, string>;
  issues?: string[];
};

// Type for the createPortfolio function
type CreatePortfolioInput = z.infer<typeof portfolioSchema>;

/**
 * Creates a new portfolio for the authenticated user.
 * @param values - The portfolio data.
 * @returns An object with the created portfolio or an error message.
 */
export async function createPortfolio(
  values: CreatePortfolioInput
): Promise<{ portfolio?: Portfolio; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized: You must be logged in." };
    }

    const validatedFields = portfolioSchema.safeParse(values);
    if (!validatedFields.success) {
      return { error: "Invalid input." };
    }

    const { name, description, risk_profile, time_horizon, initial_investment } =
      validatedFields.data;

    const portfolio = await prisma.portfolio.create({
      data: {
        name,
        description,
        risk_profile,
        time_horizon,
        initial_investment,
        userId: session.user.id,
      },
    });

    revalidatePath("/dashboard/portfolios");

    return { portfolio };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function getPortfolioById(portfolioId: string) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      user: true,
      assets: {
        include: {
          asset: true,
        },
      },
    },
  });

  if (!portfolio) {
    return null;
  }

  // Investors can only see their own portfolios
  if (user.role === Role.INVESTOR && portfolio.userId !== user.id) {
    return null;
  }

  return portfolio;
}

export async function getPortfolioByIdWithRelations(portfolioId: string) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
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
      results: {
        orderBy: {
          id: "desc",
        },
        take: 1,
      },
    },
  });

  if (!portfolio) {
    return null;
  }

  const isInvestor = user.role === "INVESTOR";
  const isPortfolioManager = user.role === "PORTFOLIO_MANAGER";
  const isAnalyst = user.role === "ANALYST";

  if (isInvestor && portfolio.userId !== user.id) {
    return null;
  }

  if (isPortfolioManager || isAnalyst) {
    return portfolio;
  }

  // Default to returning the portfolio if the user is the owner
  if (portfolio.userId === user.id) {
    return portfolio;
  }

  return null;
}

export async function getPortfolios(searchParams: {
  investor?: string;
  sortBy?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const { user } = session;
  const { investor, sortBy } = searchParams;

  const where: any = {};

  if (user.role === Role.INVESTOR) {
    where.userId = user.id;
  } else if (investor) {
    where.userId = investor;
  }

  const orderBy: any = {};
  if (sortBy === "name") {
    orderBy.name = "asc";
  } else if (sortBy === "date") {
    orderBy.updatedAt = "desc";
  }

  return prisma.portfolio.findMany({
    where,
    orderBy,
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
}

export async function getPortfoliosWithRelations(searchParams: {
  investor?: string;
  sortBy?: string;
}) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return [];
  }

  const { investor, sortBy } = searchParams;

  const where: Prisma.PortfolioWhereInput = {};

  if (user.role === "INVESTOR") {
    where.userId = user.id;
  } else if (investor) {
    where.user = {
      name: {
        contains: investor,
        mode: "insensitive",
      },
    };
  }

  const orderBy: Prisma.PortfolioOrderByWithRelationInput = {};

  if (sortBy === "name") {
    orderBy.name = "asc";
  } else if (sortBy === "createdAt") {
    orderBy.createdAt = "desc";
  }

  const portfolios = await prisma.portfolio.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy,
  });

  return portfolios;
}

export async function addStockToPortfolio(
  portfolioId: string,
  assetId: string
) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return { error: "Unauthorized" };
  }

  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: { allocations: true },
  });

  if (!portfolio || portfolio.userId !== user.id) {
    return { error: "Portfolio not found or not authorized" };
  }

  const isStockAlreadyInPortfolio = portfolio.allocations.some(
    (alloc) => alloc.assetId === assetId
  );

  if (isStockAlreadyInPortfolio) {
    return { error: "Stock is already in the portfolio" };
  }

  const newAllocation = { portfolioId, assetId, weight: 0 };

  const updatedAllocations = [...portfolio.allocations, newAllocation];
  const newWeight = 1 / updatedAllocations.length;

  await prisma.$transaction(async (tx) => {
    await tx.portfolioAllocation.create({
      data: newAllocation,
    });

    await Promise.all(
      updatedAllocations.map((alloc) =>
        tx.portfolioAllocation.updateMany({
          where: { portfolioId, assetId: alloc.assetId },
          data: { weight: newWeight },
        })
      )
    );
  });

  revalidatePath(`/dashboard/portfolios/${portfolioId}`);

  return { success: true };
}

export async function updatePortfolioAllocations(
  portfolioId: string,
  allocations: { assetId: string; weight: number }[]
) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return { error: "Unauthorized" };
  }

  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
  });

  if (!portfolio || portfolio.userId !== user.id) {
    return { error: "Portfolio not found or not authorized" };
  }

  try {
    const validatedAllocations = updatePortfolioAllocationsSchema.parse(allocations);

    await prisma.$transaction(async (tx) => {
      await Promise.all(
        validatedAllocations.map((alloc) =>
          tx.portfolioAllocation.updateMany({
            where: { portfolioId, assetId: alloc.assetId },
            data: { weight: alloc.weight },
          })
        )
      );
    });

    revalidatePath(`/dashboard/portfolios/${portfolioId}`);

    return { success: true };
  } catch (error) {
    return { error: formatError(error) };
  }
}

/**
 * Deletes a portfolio by its ID.
 * @param id - The ID of the portfolio to delete.
 * @returns An object indicating success or failure.
 */
export async function deletePortfolio(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
    });

    if (!portfolio) {
      return { error: "Portfolio not found" };
    }

    // Only the owner or an admin can delete the portfolio
    if (
      portfolio.userId !== session.user.id &&
      session.user.role !== Role.ADMIN
    ) {
      return { error: "Forbidden" };
    }

    await prisma.portfolio.delete({
      where: { id },
    });

    revalidatePath("/dashboard/portfolios");

    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}