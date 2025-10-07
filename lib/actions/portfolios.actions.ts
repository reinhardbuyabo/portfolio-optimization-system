"use server";

import { prisma } from "@/db/prisma";
import { convertToPlainObject } from "@/lib/utils";

export async function getPortfoliosByUser(userId: string) {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    include: {
      allocations: { include: { asset: true } },
      results: true,
      simulations: true,
    },
  });
  return convertToPlainObject(portfolios);
}

export async function getPortfolioById(id: string) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id },
    include: {
      allocations: { include: { asset: true } },
      results: true,
      simulations: true,
    },
  });
  return convertToPlainObject(portfolio);
}
