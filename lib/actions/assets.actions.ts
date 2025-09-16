"use server";

import { prisma } from "@/db/prisma";

// Fetch all assets
export async function getAssets(limitData: number = 1) {
  return prisma.asset.findMany({
    include: {
      data: {
        orderBy: { date: "desc" },
        take: limitData, // 1 for latest price, more for mini-charts
      },
    },
  });
}

// Fetch one asset
export async function getAssetByTicker(ticker: string) {
  return prisma.asset.findUnique({
    where: { ticker },
    include: { data: true },
  });
}
