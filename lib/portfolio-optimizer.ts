import { CombinedPrediction } from '@/types/ml-api';

/**
 * Portfolio Optimization Utilities
 * Uses LSTM predictions for expected returns and GARCH volatility for risk
 */

export interface PortfolioStock {
  symbol: string;
  currentPrice: number;
  prediction?: number;
  volatility?: number;
  weight?: number;
}

export interface OptimizationResult {
  weights: { [symbol: string]: number };
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

export interface EfficientFrontierPoint {
  volatility: number;
  return: number;
  sharpeRatio: number;
  weights?: { [symbol: string]: number };
}

/**
 * Calculate expected return from LSTM prediction
 * @param currentPrice - Current stock price
 * @param predictedPrice - LSTM predicted price
 * @returns Expected return as decimal (e.g., 0.05 for 5%)
 */
export function calculateExpectedReturn(currentPrice: number, predictedPrice: number): number {
  return (predictedPrice - currentPrice) / currentPrice;
}

/**
 * Calculate Sharpe Ratio
 * @param expectedReturn - Portfolio expected return
 * @param volatility - Portfolio volatility (standard deviation)
 * @param riskFreeRate - Risk-free rate (default 0.05 for 5%)
 * @returns Sharpe ratio
 */
export function calculateSharpeRatio(
  expectedReturn: number,
  volatility: number,
  riskFreeRate: number = 0.05
): number {
  if (volatility === 0) return 0;
  return (expectedReturn - riskFreeRate) / volatility;
}

/**
 * Calculate portfolio metrics from weights and stock data
 * @param stocks - Array of stocks with predictions and volatility
 * @param weights - Array of weights (same order as stocks)
 * @returns Portfolio return, volatility, and Sharpe ratio
 */
export function calculatePortfolioMetrics(
  stocks: PortfolioStock[],
  weights: number[],
  riskFreeRate: number = 0.05
): OptimizationResult {
  // Calculate expected returns for each stock
  const returns = stocks.map(stock => 
    stock.prediction && stock.currentPrice
      ? calculateExpectedReturn(stock.currentPrice, stock.prediction)
      : 0
  );

  // Calculate portfolio expected return (weighted average)
  const expectedReturn = returns.reduce((sum, ret, i) => sum + ret * weights[i], 0);

  // Calculate portfolio volatility
  // For simplicity, using average volatility weighted by portfolio weights
  // In real implementation, would use covariance matrix
  const volatilities = stocks.map(stock => stock.volatility || 0);
  const portfolioVariance = weights.reduce((sum, w, i) => {
    return sum + (w * w * volatilities[i] * volatilities[i]);
  }, 0);
  
  // Add correlation factor (simplified - assume avg correlation of 0.3)
  const correlationTerm = weights.reduce((sum, wi, i) => {
    return sum + weights.reduce((innerSum, wj, j) => {
      if (i !== j) {
        return innerSum + wi * wj * volatilities[i] * volatilities[j] * 0.3;
      }
      return innerSum;
    }, 0);
  }, 0);
  
  const portfolioVolatility = Math.sqrt(portfolioVariance + correlationTerm);

  // Calculate Sharpe ratio
  const sharpeRatio = calculateSharpeRatio(expectedReturn, portfolioVolatility, riskFreeRate);

  // Build weights object
  const weightsObj: { [symbol: string]: number } = {};
  stocks.forEach((stock, i) => {
    weightsObj[stock.symbol] = weights[i];
  });

  return {
    weights: weightsObj,
    expectedReturn,
    volatility: portfolioVolatility,
    sharpeRatio,
  };
}

/**
 * Find optimal portfolio using mean-variance optimization
 * Maximizes Sharpe ratio
 * @param stocks - Array of stocks with predictions and volatility
 * @returns Optimal weights and metrics
 */
export function findOptimalPortfolio(
  stocks: PortfolioStock[],
  riskFreeRate: number = 0.05
): OptimizationResult {
  if (stocks.length === 0) {
    return {
      weights: {},
      expectedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
    };
  }

  // Simple optimization: test multiple weight combinations
  // For production, would use proper optimization library (quadratic programming)
  let bestResult: OptimizationResult | null = null;
  let bestSharpe = -Infinity;

  // Generate random portfolios and find best
  const numIterations = 10000;
  for (let iter = 0; iter < numIterations; iter++) {
    // Generate random weights that sum to 1
    const rawWeights = stocks.map(() => Math.random());
    const sum = rawWeights.reduce((a, b) => a + b, 0);
    const weights = rawWeights.map(w => w / sum);

    const result = calculatePortfolioMetrics(stocks, weights, riskFreeRate);

    if (result.sharpeRatio > bestSharpe) {
      bestSharpe = result.sharpeRatio;
      bestResult = result;
    }
  }

  return bestResult || {
    weights: {},
    expectedReturn: 0,
    volatility: 0,
    sharpeRatio: 0,
  };
}

/**
 * Generate efficient frontier
 * @param stocks - Array of stocks with predictions and volatility
 * @param numPoints - Number of points to generate (default 50)
 * @returns Array of efficient frontier points
 */
export function generateEfficientFrontier(
  stocks: PortfolioStock[],
  numPoints: number = 50,
  riskFreeRate: number = 0.05
): EfficientFrontierPoint[] {
  if (stocks.length === 0) return [];

  const points: EfficientFrontierPoint[] = [];
  
  // Generate portfolios along the efficient frontier
  // Use Monte Carlo simulation for simplicity
  const numSimulations = 5000;
  const portfolios: OptimizationResult[] = [];

  for (let i = 0; i < numSimulations; i++) {
    const rawWeights = stocks.map(() => Math.random());
    const sum = rawWeights.reduce((a, b) => a + b, 0);
    const weights = rawWeights.map(w => w / sum);

    const metrics = calculatePortfolioMetrics(stocks, weights, riskFreeRate);
    portfolios.push(metrics);
  }

  // Sort by volatility
  portfolios.sort((a, b) => a.volatility - b.volatility);

  // Select numPoints portfolios that form the upper envelope (efficient frontier)
  const step = Math.floor(portfolios.length / numPoints);
  let maxReturn = -Infinity;

  for (let i = 0; i < portfolios.length; i += step) {
    const portfolio = portfolios[i];
    if (portfolio.expectedReturn > maxReturn) {
      maxReturn = portfolio.expectedReturn;
      points.push({
        volatility: portfolio.volatility,
        return: portfolio.expectedReturn,
        sharpeRatio: portfolio.sharpeRatio,
        weights: portfolio.weights,
      });
    }
  }

  return points;
}

/**
 * Convert ML predictions to portfolio stocks format
 * @param predictions - ML predictions from API
 * @param currentPrices - Current prices for stocks
 * @returns Array of portfolio stocks
 */
export function predictionsToPortfolioStocks(
  predictions: CombinedPrediction[],
  currentPrices: { [symbol: string]: number }
): PortfolioStock[] {
  return predictions
    .filter(p => p.lstm && p.garch) // Only use stocks with both predictions
    .map(p => ({
      symbol: p.symbol,
      currentPrice: currentPrices[p.symbol] || 0,
      prediction: p.lstm?.prediction || 0,
      volatility: p.garch?.volatility_annualized || 0,
    }));
}
