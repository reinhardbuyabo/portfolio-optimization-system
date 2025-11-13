import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function GET() {
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

  const response = assets.map((asset) => ({
    id: asset.id,
    ticker: asset.ticker,
    name: asset.name,
    sector: asset.sector,
    currentPrice: asset.data?.[0]?.close ?? null,
  }));

  return NextResponse.json(response);
}
