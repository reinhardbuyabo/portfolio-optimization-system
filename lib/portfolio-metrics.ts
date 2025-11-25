import { prisma } from "@/db/prisma";

const RISK_FREE_RATE = 0.05; // 5% default risk-free rate

/**
 * Get the latest close price for an asset from MarketData
 */
export async function getLatestClosePrice(assetId: string): Promise<number | null> {
  const latestData = await prisma.marketData.findFirst({
    where: { assetId },
    orderBy: { date: "desc" },
    select: { close: true },
  });

  return latestData?.close ?? null;
}

/**
 * Get the latest close price for an asset by ticker
 */
export async function getLatestClosePriceByTicker(ticker: string): Promise<number | null> {
  const asset = await prisma.asset.findUnique({
    where: { ticker },
    select: { id: true },
  });

  if (!asset) {
    return null;
  }

  return getLatestClosePrice(asset.id);
}

/**
 * Calculate expected return from historical data
 * Uses the average daily return over the last 30 days
 */
export async function calculateExpectedReturn(assetId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const marketData = await prisma.marketData.findMany({
    where: {
      assetId,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: "asc" },
    select: { close: true, date: true },
  });

  if (marketData.length < 2) {
    return 0; // Not enough data
  }

  // Calculate daily returns
  const returns: number[] = [];
  for (let i = 1; i < marketData.length; i++) {
    const prevClose = marketData[i - 1].close;
    const currentClose = marketData[i].close;
    if (prevClose > 0) {
      returns.push((currentClose - prevClose) / prevClose);
    }
  }

  if (returns.length === 0) {
    return 0;
  }

  // Annualize the average daily return (assuming 252 trading days)
  const avgDailyReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  return avgDailyReturn * 252;
}

/**
 * Calculate volatility from historical data
 * Uses standard deviation of daily returns over the last 30 days
 */
export async function calculateVolatility(assetId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const marketData = await prisma.marketData.findMany({
    where: {
      assetId,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: "asc" },
    select: { close: true },
  });

  if (marketData.length < 2) {
    return 0; // Not enough data
  }

  // Calculate daily returns
  const returns: number[] = [];
  for (let i = 1; i < marketData.length; i++) {
    const prevClose = marketData[i - 1].close;
    const currentClose = marketData[i].close;
    if (prevClose > 0) {
      returns.push((currentClose - prevClose) / prevClose);
    }
  }

  if (returns.length === 0) {
    return 0;
  }

  // Calculate standard deviation
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Annualize (assuming 252 trading days)
  return stdDev * Math.sqrt(252);
}

/**
 * Calculate Sharpe ratio
 */
export function calculateSharpeRatio(expectedReturn: number, volatility: number, riskFreeRate: number = RISK_FREE_RATE): number {
  if (volatility === 0) {
    return 0;
  }
  return (expectedReturn - riskFreeRate) / volatility;
}

/**
 * Normalize weights so they sum to 1.0
 */
export function normalizeWeights(weights: { ticker: string; weight: number }[]): { ticker: string; weight: number }[] {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  
  if (totalWeight === 0) {
    // If all weights are 0, distribute equally
    const equalWeight = 1 / weights.length;
    return weights.map(w => ({ ...w, weight: equalWeight }));
  }

  // Normalize to sum to 1.0
  return weights.map(w => ({
    ...w,
    weight: w.weight / totalWeight,
  }));
}

/**
 * Compute portfolio metrics from allocations
 */
export interface PortfolioMetrics {
  value: number;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  holdingsCount: number;
}

export async function computePortfolioMetrics(
  allocations: Array<{ assetId: string; weight: number }>
): Promise<PortfolioMetrics> {
  if (allocations.length === 0) {
    return {
      value: 0,
      expectedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      holdingsCount: 0,
    };
  }

  // Get asset data and prices
  const assetData = await Promise.all(
    allocations.map(async (alloc) => {
      const asset = await prisma.asset.findUnique({
        where: { id: alloc.assetId },
        select: { id: true, ticker: true },
      });

      if (!asset) {
        return null;
      }

      const [price, expectedReturn, volatility] = await Promise.all([
        getLatestClosePrice(asset.id),
        calculateExpectedReturn(asset.id),
        calculateVolatility(asset.id),
      ]);

      return {
        assetId: asset.id,
        weight: alloc.weight,
        price: price ?? 0,
        expectedReturn,
        volatility,
      };
    })
  );

  const validAssets = assetData.filter((a): a is NonNullable<typeof a> => a !== null && a.price > 0);

  if (validAssets.length === 0) {
    return {
      value: 0,
      expectedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      holdingsCount: 0,
    };
  }

  // Calculate portfolio value (assuming base value of 100,000 KES for now)
  // In a real system, this would be based on actual investment amount
  const BASE_VALUE = 100000;
  const portfolioValue = BASE_VALUE;

  // Calculate weighted expected return
  const weightedReturn = validAssets.reduce(
    (sum, asset) => sum + asset.weight * asset.expectedReturn,
    0
  );

  // Calculate portfolio volatility (simplified - assumes correlation of 0.5)
  // For a more accurate calculation, we'd need a covariance matrix
  const weightedVariance = validAssets.reduce((sum, asset) => {
    return sum + Math.pow(asset.weight * asset.volatility, 2);
  }, 0);

  // Add covariance terms (simplified with average correlation of 0.5)
  let covarianceSum = 0;
  for (let i = 0; i < validAssets.length; i++) {
    for (let j = i + 1; j < validAssets.length; j++) {
      const correlation = 0.5; // Simplified assumption
      covarianceSum +=
        2 *
        validAssets[i].weight *
        validAssets[j].weight *
        validAssets[i].volatility *
        validAssets[j].volatility *
        correlation;
    }
  }

  const portfolioVolatility = Math.sqrt(weightedVariance + covarianceSum);

  // Calculate Sharpe ratio
  const sharpeRatio = calculateSharpeRatio(weightedReturn, portfolioVolatility);

  return {
    value: portfolioValue,
    expectedReturn: weightedReturn,
    volatility: portfolioVolatility,
    sharpeRatio,
    holdingsCount: validAssets.length,
  };
}

