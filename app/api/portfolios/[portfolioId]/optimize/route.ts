import { auth } from "@/auth";
import { getPortfolioById } from "@/lib/actions/portfolios.actions";
import { NextRequest, NextResponse } from "next/server";
import * as tf from "@tensorflow/tfjs-node";
import path from "path";

async function loadModel() {
  const modelPath = `file://${path.join(
    process.cwd(),
    "ml/tfjs_model/model.json"
  )}`;
  const model = await tf.loadLayersModel(modelPath);
  return model;
}

async function getMarketData(horizon: string) {
  const response = await fetch(
    `http://localhost:3000/api/market-data?horizon=${horizon}`
  );
  const data = await response.json();
  return data;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { portfolioId: string } }
) {
  const session = await auth();
  if (session?.user.role !== "PORTFOLIO_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const portfolio = await getPortfolioById(params.portfolioId);
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const marketData = await getMarketData("1Y");

  // const model = await loadModel();

  // TODO: Get historical data for the assets in the portfolio

  // TODO: Use the model to predict returns and volatility

  // TODO: Perform the optimization

  // Mock optimization results
  const optimizationResults = {
    current: {
      sharpeRatio: 0.8,
      expectedReturn: 0.15,
      volatility: 0.18,
      allocations: portfolio.assets.map((a) => ({
        ticker: a.asset.ticker,
        weight: 1 / portfolio.assets.length,
        assetId: a.asset.id,
      })),
    },
    optimized: {
      sharpeRatio: 1.2,
      expectedReturn: 0.22,
      volatility: 0.18,
      allocations: portfolio.assets.map((a) => ({
        ticker: a.asset.ticker,
        weight: 1 / portfolio.assets.length, // Replace with actual optimized weights
        assetId: a.asset.id,
      })),
    },
  };

  return NextResponse.json(optimizationResults);
}