import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPortfolioById } from "@/lib/actions/portfolios.actions";
import path from "path";

// NOTE: This endpoint is DEPRECATED. Use /api/ml/predict/portfolio instead.
// TensorFlow.js is not installed and ML predictions are handled by the Python ML API.

let model: any | null = null;

async function loadModel() {
  // TensorFlow import disabled - use Python ML API instead
  throw new Error("This endpoint is deprecated. Use /api/ml/predict/portfolio instead.");
  
  // if (model) {
  //   return model;
  // }
  // const tf = await import("@tensorflow/tfjs-node");
  // const modelPath = `file://${path.join(
  //   process.cwd(),
  //   "ml/trained_models/0.0.1.h5"
  // )}`;
  // console.log("Loading optimization model from:", modelPath);
  // model = await tf.loadLayersModel(modelPath);
  // console.log("Optimization model loaded.");
  // return model;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { portfolioId: string } }
) {
  const session = await auth();
  if (session?.user.role !== "PORTFOLIO_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { portfolio_id, assets, prices, weights } = await req.json();

  if (
    !portfolio_id ||
    !assets ||
    !Array.isArray(assets) ||
    !prices ||
    !Array.isArray(prices) ||
    !weights ||
    !Array.isArray(weights)
  ) {
    return NextResponse.json(
      { error: "Invalid input: portfolio_id, assets, prices, and weights are required." },
      { status: 400 }
    );
  }

  const loadedModel = await loadModel();

  // Placeholder for actual model inference and optimization logic
  // In a real scenario, you would use the loadedModel to predict future returns/volatility
  // and then apply an optimization algorithm (e.g., Markowitz, Black-Litterman) to find optimal weights.

  // For demonstration, we'll simulate optimized weights and metrics.
  const optimized_weights: { [key: string]: number } = {};
  let totalOptimizedWeight = 0;

  // Simple simulation: slightly adjust current weights
  assets.forEach((asset, index) => {
    const currentWeight = weights[index];
    // Simulate a small random adjustment
    const adjustment = (Math.random() - 0.5) * 0.1; // -0.05 to +0.05
    let newWeight = Math.max(0, currentWeight + adjustment);
    optimized_weights[asset] = newWeight;
    totalOptimizedWeight += newWeight;
  });

  // Normalize optimized weights to sum to 1
  assets.forEach((asset) => {
    optimized_weights[asset] /= totalOptimizedWeight;
  });

  // Simulate performance metrics
  const expected_return = 0.078 + (Math.random() - 0.5) * 0.02; // Around 7.8%
  const volatility = 0.032 + (Math.random() - 0.5) * 0.01; // Around 3.2%
  const sharpe_ratio = expected_return / volatility; // Simplified

  return NextResponse.json({
    portfolio_id,
    optimized_weights,
    expected_return,
    volatility,
    sharpe_ratio,
  });
}