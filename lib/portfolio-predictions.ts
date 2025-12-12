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

/**
 * Calculate portfolio volatility with diversification effect
 * Uses simplified correlation assumption since we don't have actual correlation matrix
 */
function calculatePortfolioVolatility(
  weights: number[],
  volatilities: number[],
  avgCorrelation: number = 0.3 // Assume moderate positive correlation between stocks
): number {
  if (weights.length !== volatilities.length) return 0;
  
  let portfolioVariance = 0;
  
  // Variance formula: σ²_p = Σ Σ w_i w_j σ_i σ_j ρ_ij
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      const correlation = i === j ? 1.0 : avgCorrelation;
      portfolioVariance += weights[i] * weights[j] * volatilities[i] * volatilities[j] * correlation;
    }
  }
  
  return Math.sqrt(portfolioVariance);
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
  
  // Check if all expected returns are negative
  const allNegativeReturns = stocksWithSharpe.every(s => s.expectedReturn < 0);
  
  if (allNegativeReturns) {
    // If all returns are negative, minimize risk by allocating to lowest volatility stocks
    stocksWithSharpe.sort((a, b) => a.volatility - b.volatility);
    
    // Use exponential weighting favoring lower volatility
    const totalWeight = stocksWithSharpe.reduce((sum, _, index) => {
      return sum + Math.exp(-index * 0.8);
    }, 0);
    
    return stocksWithSharpe.map((stock, index) => ({
      symbol: stock.symbol,
      weight: Math.exp(-index * 0.8) / totalWeight,
      expectedReturn: stock.expectedReturn,
      volatility: stock.volatility,
      sharpeRatio: stock.sharpeRatio,
    }));
  }
  
  // Use a simplified mean-variance optimization approach
  // We'll search for the portfolio that maximizes Sharpe ratio
  
  // Start with multiple candidate portfolios and pick the best one
  const candidates: OptimizedWeight[][] = [];
  
  // Candidate 1: Equal weights
  const equalWeight = 1 / stocksWithSharpe.length;
  candidates.push(stocksWithSharpe.map(stock => ({
    symbol: stock.symbol,
    weight: equalWeight,
    expectedReturn: stock.expectedReturn,
    volatility: stock.volatility,
    sharpeRatio: stock.sharpeRatio,
  })));
  
  // Candidate 2: Weight by expected return (for positive returns only)
  const positiveReturnStocks = stocksWithSharpe.filter(s => s.expectedReturn > 0);
  if (positiveReturnStocks.length > 0) {
    const totalReturn = positiveReturnStocks.reduce((sum, s) => sum + s.expectedReturn, 0);
    const returnWeights = stocksWithSharpe.map(stock => {
      if (stock.expectedReturn <= 0) return 0;
      return stock.expectedReturn / totalReturn;
    });
    candidates.push(stocksWithSharpe.map((stock, i) => ({
      symbol: stock.symbol,
      weight: returnWeights[i],
      expectedReturn: stock.expectedReturn,
      volatility: stock.volatility,
      sharpeRatio: stock.sharpeRatio,
    })));
  }
  
  // Candidate 3: Inverse volatility weighting (minimum variance)
  const inverseVols = stocksWithSharpe.map(s => 1 / Math.max(s.volatility, 0.01));
  const totalInverseVol = inverseVols.reduce((sum, iv) => sum + iv, 0);
  candidates.push(stocksWithSharpe.map((stock, i) => ({
    symbol: stock.symbol,
    weight: inverseVols[i] / totalInverseVol,
    expectedReturn: stock.expectedReturn,
    volatility: stock.volatility,
    sharpeRatio: stock.sharpeRatio,
  })));
  
  // Candidate 4: Sharpe-weighted (only positive Sharpe stocks)
  const positiveSharpeStocks = stocksWithSharpe.filter(s => s.sharpeRatio > 0);
  if (positiveSharpeStocks.length > 0) {
    const totalSharpe = positiveSharpeStocks.reduce((sum, s) => sum + s.sharpeRatio, 0);
    const sharpeWeights = stocksWithSharpe.map(stock => {
      if (stock.sharpeRatio <= 0) return 0;
      return stock.sharpeRatio / totalSharpe;
    });
    candidates.push(stocksWithSharpe.map((stock, i) => ({
      symbol: stock.symbol,
      weight: sharpeWeights[i],
      expectedReturn: stock.expectedReturn,
      volatility: stock.volatility,
      sharpeRatio: stock.sharpeRatio,
    })));
  }
  
  // Candidate 5: Maximum diversification with positive returns
  // Allocate more to high-return, low-vol stocks
  if (positiveReturnStocks.length > 0) {
    const returnVolRatios = stocksWithSharpe.map(s => 
      s.expectedReturn > 0 ? s.expectedReturn / Math.max(s.volatility, 0.01) : 0
    );
    const totalRatio = returnVolRatios.reduce((sum, r) => sum + r, 0);
    if (totalRatio > 0) {
      candidates.push(stocksWithSharpe.map((stock, i) => ({
        symbol: stock.symbol,
        weight: returnVolRatios[i] / totalRatio,
        expectedReturn: stock.expectedReturn,
        volatility: stock.volatility,
        sharpeRatio: stock.sharpeRatio,
      })));
    }
  }
  
  // Evaluate each candidate and pick the one with highest portfolio Sharpe ratio
  let bestPortfolio = candidates[0];
  let bestSharpe = calculateOptimizedPortfolioMetrics(candidates[0]).sharpeRatio;
  
  for (let i = 1; i < candidates.length; i++) {
    const metrics = calculateOptimizedPortfolioMetrics(candidates[i]);
    if (metrics.sharpeRatio > bestSharpe) {
      bestSharpe = metrics.sharpeRatio;
      bestPortfolio = candidates[i];
    }
  }
  
  return bestPortfolio;
}

/**
 * Calculate optimized portfolio metrics with proper diversification
 */
export function calculateOptimizedPortfolioMetrics(
  optimizedWeights: OptimizedWeight[]
): { return: number; volatility: number; sharpeRatio: number } {
  const weights = optimizedWeights.map(w => w.weight);
  const returns = optimizedWeights.map(w => w.expectedReturn);
  const volatilities = optimizedWeights.map(w => w.volatility);
  
  // Portfolio return is weighted average
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0);
  
  // Portfolio volatility considers diversification
  const portfolioVolatility = calculatePortfolioVolatility(weights, volatilities);
  
  // Sharpe ratio
  const sharpeRatio = portfolioVolatility > 0 
    ? (portfolioReturn - RISK_FREE_RATE) / portfolioVolatility 
    : 0;
  
  return {
    return: portfolioReturn,
    volatility: portfolioVolatility,
    sharpeRatio,
  };
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
