/**
 * Portfolio metrics calculation based on ML predictions
 */

export interface StockPrediction {
  symbol: string;
  currentPrice: number;
  lstm: {
    prediction: number;
    horizon: number;
  } | null;
  garch: {
    volatility_annualized: number;
  } | null;
  expectedReturn: number;
}

export interface PortfolioMetrics {
  meanReturn: number;
  meanVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
}

const RISK_FREE_RATE = 0.05; // 5% annual risk-free rate

/**
 * Calculate mean expected return across all stocks in portfolio
 */
export function calculateMeanReturn(predictions: StockPrediction[]): number {
  if (predictions.length === 0) return 0;
  
  const totalReturn = predictions.reduce((sum, pred) => {
    return sum + (pred.expectedReturn || 0);
  }, 0);
  
  return totalReturn / predictions.length;
}

/**
 * Calculate mean volatility across all stocks in portfolio
 */
export function calculateMeanVolatility(predictions: StockPrediction[]): number {
  if (predictions.length === 0) return 0;
  
  const totalVolatility = predictions.reduce((sum, pred) => {
    return sum + (pred.garch?.volatility_annualized || 0);
  }, 0);
  
  return totalVolatility / predictions.length;
}

/**
 * Calculate Sharpe Ratio
 * Sharpe Ratio = (Return - Risk Free Rate) / Volatility
 */
export function calculateSharpeRatio(meanReturn: number, meanVolatility: number): number {
  if (meanVolatility === 0) return 0;
  return (meanReturn - RISK_FREE_RATE) / meanVolatility;
}

/**
 * Calculate Sortino Ratio (uses downside deviation instead of total volatility)
 * For simplicity, we'll use a factor of the mean volatility
 */
export function calculateSortinoRatio(meanReturn: number, meanVolatility: number): number {
  if (meanVolatility === 0) return 0;
  // Downside deviation is typically lower than total volatility
  // Using 0.7 as approximation factor
  const downsideDeviation = meanVolatility * 0.7;
  return (meanReturn - RISK_FREE_RATE) / downsideDeviation;
}

/**
 * Calculate Maximum Drawdown
 * Simplified calculation based on expected returns
 */
export function calculateMaxDrawdown(predictions: StockPrediction[]): number {
  if (predictions.length === 0) return 0;
  
  // Find the maximum negative return
  const maxNegativeReturn = Math.min(
    ...predictions.map(p => p.expectedReturn || 0),
    0
  );
  
  return Math.abs(maxNegativeReturn);
}

/**
 * Calculate all portfolio metrics from predictions
 */
export function calculatePortfolioMetrics(predictions: StockPrediction[]): PortfolioMetrics {
  const meanReturn = calculateMeanReturn(predictions);
  const meanVolatility = calculateMeanVolatility(predictions);
  
  return {
    meanReturn,
    meanVolatility,
    sharpeRatio: calculateSharpeRatio(meanReturn, meanVolatility),
    sortinoRatio: calculateSortinoRatio(meanReturn, meanVolatility),
    maxDrawdown: calculateMaxDrawdown(predictions),
  };
}

/**
 * Optimize portfolio weights using Efficient Frontier (simplified)
 * This maximizes Sharpe Ratio
 */
export interface OptimizedWeight {
  symbol: string;
  weight: number;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

export function optimizePortfolioWeights(
  predictions: StockPrediction[]
): OptimizedWeight[] {
  if (predictions.length === 0) return [];
  
  // Calculate Sharpe ratio for each stock
  const stocksWithSharpe = predictions.map(pred => {
    const volatility = pred.garch?.volatility_annualized || 0.1;
    const sharpeRatio = volatility > 0 
      ? (pred.expectedReturn - RISK_FREE_RATE) / volatility 
      : 0;
    
    return {
      symbol: pred.symbol,
      expectedReturn: pred.expectedReturn,
      volatility,
      sharpeRatio,
    };
  });
  
  // Check if all expected returns are negative or all Sharpe ratios are negative
  const allNegativeReturns = stocksWithSharpe.every(s => s.expectedReturn < RISK_FREE_RATE);
  const allNegativeSharpe = stocksWithSharpe.every(s => s.sharpeRatio < 0);
  
  if (allNegativeReturns || allNegativeSharpe) {
    // If all returns are negative, minimize risk by allocating to lowest volatility stocks
    stocksWithSharpe.sort((a, b) => a.volatility - b.volatility); // Sort by volatility ascending
    
    // Use exponential weighting favoring lower volatility
    const totalWeight = stocksWithSharpe.reduce((sum, _, index) => {
      return sum + Math.exp(-index * 0.8); // Exponential decay
    }, 0);
    
    return stocksWithSharpe.map((stock, index) => ({
      symbol: stock.symbol,
      weight: Math.exp(-index * 0.8) / totalWeight,
      expectedReturn: stock.expectedReturn,
      volatility: stock.volatility,
      sharpeRatio: stock.sharpeRatio,
    }));
  }
  
  // Filter out stocks with negative Sharpe ratios for optimization
  const positiveStocks = stocksWithSharpe.filter(s => s.sharpeRatio > 0);
  
  if (positiveStocks.length === 0) {
    // No positive Sharpe stocks, fall back to equal weights
    const equalWeight = 1 / stocksWithSharpe.length;
    return stocksWithSharpe.map(stock => ({
      symbol: stock.symbol,
      weight: equalWeight,
      expectedReturn: stock.expectedReturn,
      volatility: stock.volatility,
      sharpeRatio: stock.sharpeRatio,
    }));
  }
  
  // Sort by Sharpe ratio (descending)
  positiveStocks.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
  
  // Allocate more weight to higher Sharpe ratios using quadratic weighting
  // Weight proportional to Sharpe^2 (more aggressive concentration)
  const sharpeSquaredSum = positiveStocks.reduce((sum, s) => {
    return sum + Math.max(0, s.sharpeRatio) ** 2;
  }, 0);
  
  const optimized = positiveStocks.map(stock => ({
    symbol: stock.symbol,
    weight: sharpeSquaredSum > 0 ? (Math.max(0, stock.sharpeRatio) ** 2) / sharpeSquaredSum : 1 / positiveStocks.length,
    expectedReturn: stock.expectedReturn,
    volatility: stock.volatility,
    sharpeRatio: stock.sharpeRatio,
  }));
  
  // Add zero-weight entries for negative Sharpe stocks
  const negativeStocks = stocksWithSharpe.filter(s => s.sharpeRatio <= 0);
  negativeStocks.forEach(stock => {
    optimized.push({
      symbol: stock.symbol,
      weight: 0,
      expectedReturn: stock.expectedReturn,
      volatility: stock.volatility,
      sharpeRatio: stock.sharpeRatio,
    });
  });
  
  return optimized;
}

/**
 * Generate efficient frontier data points for visualization
 */
export interface EfficientFrontierPoint {
  return: number;
  volatility: number;
  sharpeRatio: number;
}

export function generateEfficientFrontier(
  predictions: StockPrediction[],
  numPoints: number = 50
): EfficientFrontierPoint[] {
  const points: EfficientFrontierPoint[] = [];
  
  // Generate points by varying risk levels
  const minVol = Math.min(...predictions.map(p => p.garch?.volatility_annualized || 0.1));
  const maxVol = Math.max(...predictions.map(p => p.garch?.volatility_annualized || 0.5));
  
  for (let i = 0; i < numPoints; i++) {
    const targetVol = minVol + (maxVol - minVol) * (i / (numPoints - 1));
    
    // Find optimal return for this volatility level
    // Simplified: linear interpolation based on volatility
    const avgReturn = calculateMeanReturn(predictions);
    const avgVol = calculateMeanVolatility(predictions);
    
    const estimatedReturn = avgReturn * (targetVol / avgVol);
    const sharpeRatio = targetVol > 0 ? (estimatedReturn - RISK_FREE_RATE) / targetVol : 0;
    
    points.push({
      return: estimatedReturn,
      volatility: targetVol,
      sharpeRatio,
    });
  }
  
  return points;
}
