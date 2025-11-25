"use server";

import { prisma } from "@/db/prisma";
import { convertToPlainObject } from "@/lib/utils";

export async function getAssets() {
  const assets = await prisma.asset.findMany({
    include: {
      data: true, // MarketData
      allocs: true, // PortfolioAllocation
    },
  });
  return convertToPlainObject(assets);
}

export async function getAssetByTicker(ticker: string) {
  const asset = await prisma.asset.findUnique({
    where: { ticker },
    include: {
      data: true,
      allocs: true,
    },
  });
  return convertToPlainObject(asset);
}

