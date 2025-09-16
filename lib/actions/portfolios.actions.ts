"use server";

import { prisma } from "@/db/prisma";
import { PortfolioStatus } from "@prisma/client";

// Fetch all portfolios
export async function getPortfolios() {
  return prisma.portfolio.findMany({
    include: {
      user: true,
      allocations: { include: { asset: true } },
      results: true,
    },
  });
}

// Fetch single portfolio
export async function getPortfolioById(id: string) {
  return prisma.portfolio.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          investorProfile: true,
        },
      },
      allocations: {
        include: {
          asset: {
            include: {
              data: {
                orderBy: { date: "desc" },
                take: 1, // only latest price
              },
            },
          },
        },
      },
      results: {
        orderBy: { id: "desc" },
        take: 1, // latest optimization result
      },
      simulations: {
        orderBy: { startDate: "desc" },
        take: 1, // latest simulation
      },
    },
  });
}

// Create portfolio
export async function createPortfolio(userId: string, status: PortfolioStatus = PortfolioStatus.DRAFT) {
  return prisma.portfolio.create({
    data: { userId, status },
  });
}
