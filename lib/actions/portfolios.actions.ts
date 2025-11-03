"use server";

import { z } from "zod";
import { createPortfolioSchema, updatePortfolioAllocationsSchema } from "@/lib/validators";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { formatError } from "../utils";
import { Prisma } from "@prisma/client";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export type PortfolioFormState = {
  message: string;
  success: boolean; // Add success flag
  fields?: Record<string, string>;
  issues?: string[];
};

export async function createPortfolio(
  state: PortfolioFormState,
  data: FormData,
): Promise<PortfolioFormState> {
  try {
    const formData = Object.fromEntries(data);
    const parsed = createPortfolioSchema.parse({
      ...formData,
      targetReturn: Number(formData.targetReturn),
    });

    const session = await auth();

    if (!session?.user) {
      return {
        message: "Unauthorized: You must be logged in to create a portfolio.",
        success: false,
      };
    }

    const { id: userId, role } = session.user;

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return {
        message: "User not found. Please log in again.",
        success: false,
      };
    }

    if (role !== "INVESTOR" && role !== "PORTFOLIO_MANAGER") {
      return {
        message: "Forbidden: You do not have permission to create a portfolio.",
        success: false,
      };
    }

    const { name, riskTolerance, targetReturn } = parsed;

    const existingPortfolio = await prisma.portfolio.findFirst({
      where: {
        userId,
        name,
      },
    });

    if (existingPortfolio) {
      return {
        message: "A portfolio with this name already exists.",
        success: false,
      };
    }

    await prisma.portfolio.create({
      data: {
        userId,
        name,
        riskTolerance,
        targetReturn,
      },
    });

    revalidatePath("/dashboard/portfolios");

    return {
      message: "Portfolio created successfully.",
      success: true,
    };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        message: "A portfolio with this name already exists.",
        success: false,
      };
    }

    console.log(error);
    return {
      message: formatError(error),
      success: false,
    };
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
    orderBy,
  });

  return portfolios;
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
