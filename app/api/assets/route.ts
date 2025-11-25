import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function GET(request: NextRequest) {
  const assets = await prisma.asset.findMany({
    include: {
      data: {
        orderBy: { date: "desc" },
        take: 1,
        select: {
          close: true,
        },
      },
    },
  });

  // Fetch current prices from historical API for assets without market data
  const assetsWithPrices = await Promise.all(
    assets.map(async (asset) => {
      let currentPrice = asset.data?.[0]?.close ?? null;
      
      // If no price in DB, try to fetch from historical API
      if (!currentPrice) {
        try {
          const priceResponse = await fetch(
            `${request.nextUrl.origin}/api/stocks/historical?symbol=${asset.ticker}&days=1`,
            { next: { revalidate: 3600 } } // Cache for 1 hour
          );
          
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            currentPrice = priceData.latestPrice || null;
          }
        } catch (error) {
          console.warn(`Could not fetch price for ${asset.ticker}:`, error);
        }
      }
      
      return {
        id: asset.id,
        ticker: asset.ticker,
        name: asset.name,
        sector: asset.sector,
        currentPrice,
      };
    })
  );

  return NextResponse.json(assetsWithPrices);
}
