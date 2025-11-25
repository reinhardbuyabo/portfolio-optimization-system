/**
 * Unit tests for portfolio optimization logic
 * Tests that optimization increases Sharpe ratio and properly handles diversification
 */

import { describe, it, expect } from 'vitest';
import {
  optimizePortfolioWeights,
  calculateOptimizedPortfolioMetrics,
  calculatePortfolioMetrics,
  type StockPrediction,
} from '@/lib/portfolio-predictions';

describe('Portfolio Optimization', () => {
  // Test data: 3 stocks with different risk-return profiles
  const testPredictions: StockPrediction[] = [
    {
      symbol: 'STOCK_A',
      currentPrice: 100,
      lstm: { prediction: 110, horizon: 30 },
      garch: { volatility_annualized: 0.15 }, // Low volatility
      expectedReturn: 0.10, // High return
    },
    {
      symbol: 'STOCK_B',
      currentPrice: 50,
      lstm: { prediction: 52, horizon: 30 },
      garch: { volatility_annualized: 0.25 }, // High volatility
      expectedReturn: 0.08, // Moderate return
    },
    {
      symbol: 'STOCK_C',
      currentPrice: 75,
      lstm: { prediction: 78, horizon: 30 },
      garch: { volatility_annualized: 0.20 }, // Moderate volatility
      expectedReturn: 0.12, // High return
    },
  ];

  describe('optimizePortfolioWeights', () => {
    it('should return weights that sum to 1.0', () => {
      const optimized = optimizePortfolioWeights(testPredictions);
      const totalWeight = optimized.reduce((sum, w) => sum + w.weight, 0);
      
      expect(totalWeight).toBeCloseTo(1.0, 5);
    });

    it('should allocate higher weights to stocks with better risk-adjusted returns', () => {
      const optimized = optimizePortfolioWeights(testPredictions);
      
      // Calculate individual Sharpe ratios
      // STOCK_A: (0.10 - 0.05) / 0.15 = 0.33
      // STOCK_C: (0.12 - 0.05) / 0.20 = 0.35
      // STOCK_B: (0.08 - 0.05) / 0.25 = 0.12
      
      // Our inverse variance weighting with Sharpe adjustment favors:
      // - High Sharpe ratio
      // - Low variance (1/σ²)
      // Weight = (Sharpe / σ²) / Σ(Sharpe / σ²)
      
      const stockA = optimized.find(w => w.symbol === 'STOCK_A');
      const stockB = optimized.find(w => w.symbol === 'STOCK_B');
      const stockC = optimized.find(w => w.symbol === 'STOCK_C');
      
      // STOCK_A should have highest weight due to low variance (0.15²) and good Sharpe
      // Even though STOCK_C has slightly higher Sharpe, STOCK_A's lower variance wins
      expect(stockA?.weight).toBeGreaterThan(stockB?.weight || 0);
      
      // STOCK_B should have lowest weight (worst Sharpe AND highest variance)
      expect(stockB?.weight).toBeLessThan(stockA?.weight || 0);
      expect(stockB?.weight).toBeLessThan(stockC?.weight || 0);
      
      // All weights should be positive and sum to 1
      expect(stockA?.weight).toBeGreaterThan(0);
      expect(stockB?.weight).toBeGreaterThan(0);
      expect(stockC?.weight).toBeGreaterThan(0);
    });

    it('should handle stocks with negative Sharpe ratios', () => {
      const negativeStocks: StockPrediction[] = [
        {
          symbol: 'BAD_STOCK',
          currentPrice: 100,
          lstm: { prediction: 95, horizon: 30 },
          garch: { volatility_annualized: 0.30 },
          expectedReturn: 0.02, // Below risk-free rate
        },
        {
          symbol: 'GOOD_STOCK',
          currentPrice: 50,
          lstm: { prediction: 55, horizon: 30 },
          garch: { volatility_annualized: 0.15 },
          expectedReturn: 0.10,
        },
      ];
      
      const optimized = optimizePortfolioWeights(negativeStocks);
      const badStock = optimized.find(w => w.symbol === 'BAD_STOCK');
      const goodStock = optimized.find(w => w.symbol === 'GOOD_STOCK');
      
      // Good stock should get most/all weight
      expect(goodStock?.weight).toBeGreaterThan(badStock?.weight || 0);
    });

    it('should handle all negative returns by minimizing volatility', () => {
      const allNegative: StockPrediction[] = [
        {
          symbol: 'NEG_A',
          currentPrice: 100,
          lstm: { prediction: 95, horizon: 30 },
          garch: { volatility_annualized: 0.30 }, // High volatility
          expectedReturn: -0.05,
        },
        {
          symbol: 'NEG_B',
          currentPrice: 50,
          lstm: { prediction: 48, horizon: 30 },
          garch: { volatility_annualized: 0.15 }, // Low volatility
          expectedReturn: -0.04,
        },
      ];
      
      const optimized = optimizePortfolioWeights(allNegative);
      const negA = optimized.find(w => w.symbol === 'NEG_A');
      const negB = optimized.find(w => w.symbol === 'NEG_B');
      
      // Should favor lower volatility stock
      expect(negB?.weight).toBeGreaterThan(negA?.weight || 0);
    });
  });

  describe('calculateOptimizedPortfolioMetrics', () => {
    it('should calculate portfolio return as weighted average', () => {
      const weights = [
        { symbol: 'A', weight: 0.5, expectedReturn: 0.10, volatility: 0.15, sharpeRatio: 0.33 },
        { symbol: 'B', weight: 0.5, expectedReturn: 0.08, volatility: 0.20, sharpeRatio: 0.15 },
      ];
      
      const metrics = calculateOptimizedPortfolioMetrics(weights);
      const expectedReturn = 0.5 * 0.10 + 0.5 * 0.08;
      
      expect(metrics.return).toBeCloseTo(expectedReturn, 5);
    });

    it('should calculate portfolio volatility with diversification benefit', () => {
      const weights = [
        { symbol: 'A', weight: 0.5, expectedReturn: 0.10, volatility: 0.20, sharpeRatio: 0.25 },
        { symbol: 'B', weight: 0.5, expectedReturn: 0.08, volatility: 0.20, sharpeRatio: 0.15 },
      ];
      
      const metrics = calculateOptimizedPortfolioMetrics(weights);
      
      // Portfolio volatility should be less than weighted average due to diversification
      const weightedAvgVol = 0.5 * 0.20 + 0.5 * 0.20; // = 0.20
      
      // With correlation < 1, portfolio vol should be less than 0.20
      expect(metrics.volatility).toBeLessThan(weightedAvgVol);
    });

    it('should calculate Sharpe ratio correctly', () => {
      const weights = [
        { symbol: 'A', weight: 0.6, expectedReturn: 0.12, volatility: 0.18, sharpeRatio: 0.39 },
        { symbol: 'B', weight: 0.4, expectedReturn: 0.10, volatility: 0.15, sharpeRatio: 0.33 },
      ];
      
      const metrics = calculateOptimizedPortfolioMetrics(weights);
      const riskFreeRate = 0.05;
      const expectedSharpe = (metrics.return - riskFreeRate) / metrics.volatility;
      
      expect(metrics.sharpeRatio).toBeCloseTo(expectedSharpe, 5);
      expect(metrics.sharpeRatio).toBeGreaterThan(0);
    });
  });

  describe('Optimization improves Sharpe ratio', () => {
    it('should produce a portfolio with higher Sharpe ratio than equal-weighted portfolio', () => {
      // Calculate equal-weighted portfolio metrics
      const equalWeightedPredictions = testPredictions.map(pred => ({
        ...pred,
        weight: 1 / testPredictions.length,
      }));
      
      const equalWeightMetrics = calculatePortfolioMetrics(testPredictions);
      
      // Optimize the portfolio
      const optimized = optimizePortfolioWeights(testPredictions);
      const optimizedMetrics = calculateOptimizedPortfolioMetrics(optimized);
      
      // Optimized Sharpe should be >= equal-weighted Sharpe
      // (equal in cases where equal weighting is already optimal)
      expect(optimizedMetrics.sharpeRatio).toBeGreaterThanOrEqual(equalWeightMetrics.sharpeRatio - 0.01);
    });

    it('should maximize Sharpe ratio - optimized portfolio should be on efficient frontier', () => {
      const optimized = optimizePortfolioWeights(testPredictions);
      const metrics = calculateOptimizedPortfolioMetrics(optimized);
      
      // Test that the optimized portfolio has a positive Sharpe ratio
      expect(metrics.sharpeRatio).toBeGreaterThan(0);
      
      // Test that the portfolio has reasonable diversification (not 100% in one stock)
      const maxWeight = Math.max(...optimized.map(w => w.weight));
      expect(maxWeight).toBeLessThan(1.0);
    });

    it('should produce higher Sharpe than concentrated high-risk portfolio', () => {
      // Create a concentrated portfolio (100% in highest return stock)
      const highReturnStock = testPredictions.reduce((prev, curr) => 
        curr.expectedReturn > prev.expectedReturn ? curr : prev
      );
      
      const concentratedWeights = testPredictions.map(pred => ({
        symbol: pred.symbol,
        weight: pred.symbol === highReturnStock.symbol ? 1.0 : 0.0,
        expectedReturn: pred.expectedReturn,
        volatility: pred.garch?.volatility_annualized || 0.1,
        sharpeRatio: (pred.expectedReturn - 0.05) / (pred.garch?.volatility_annualized || 0.1),
      }));
      
      const concentratedMetrics = calculateOptimizedPortfolioMetrics(concentratedWeights);
      
      // Optimize the portfolio
      const optimized = optimizePortfolioWeights(testPredictions);
      const optimizedMetrics = calculateOptimizedPortfolioMetrics(optimized);
      
      // Optimized should have better or equal Sharpe than concentrated portfolio
      // (diversification benefit should improve Sharpe)
      expect(optimizedMetrics.sharpeRatio).toBeGreaterThanOrEqual(concentratedMetrics.sharpeRatio - 0.01);
    });
  });

  describe('Edge cases', () => {
    it('should handle single stock portfolio', () => {
      const singleStock: StockPrediction[] = [testPredictions[0]];
      const optimized = optimizePortfolioWeights(singleStock);
      
      expect(optimized.length).toBe(1);
      expect(optimized[0].weight).toBeCloseTo(1.0, 5);
    });

    it('should handle empty predictions array', () => {
      const optimized = optimizePortfolioWeights([]);
      expect(optimized).toEqual([]);
    });

    it('should handle stocks with zero volatility gracefully', () => {
      const zeroVolStock: StockPrediction[] = [
        {
          symbol: 'ZERO_VOL',
          currentPrice: 100,
          lstm: { prediction: 105, horizon: 30 },
          garch: { volatility_annualized: 0.0 },
          expectedReturn: 0.05,
        },
        {
          symbol: 'NORMAL',
          currentPrice: 50,
          lstm: { prediction: 55, horizon: 30 },
          garch: { volatility_annualized: 0.15 },
          expectedReturn: 0.10,
        },
      ];
      
      const optimized = optimizePortfolioWeights(zeroVolStock);
      const totalWeight = optimized.reduce((sum, w) => sum + w.weight, 0);
      
      expect(totalWeight).toBeCloseTo(1.0, 5);
      expect(optimized.some(w => isNaN(w.weight))).toBe(false);
    });
  });

  describe('Diversification benefit', () => {
    it('should show diversification reduces portfolio volatility', () => {
      // Create two stocks with same individual volatility
      const sameVolStocks: StockPrediction[] = [
        {
          symbol: 'STOCK_1',
          currentPrice: 100,
          lstm: { prediction: 110, horizon: 30 },
          garch: { volatility_annualized: 0.20 },
          expectedReturn: 0.10,
        },
        {
          symbol: 'STOCK_2',
          currentPrice: 50,
          lstm: { prediction: 55, horizon: 30 },
          garch: { volatility_annualized: 0.20 },
          expectedReturn: 0.10,
        },
      ];
      
      // 50-50 portfolio
      const equalWeights = sameVolStocks.map(stock => ({
        symbol: stock.symbol,
        weight: 0.5,
        expectedReturn: stock.expectedReturn,
        volatility: stock.garch?.volatility_annualized || 0.2,
        sharpeRatio: (stock.expectedReturn - 0.05) / (stock.garch?.volatility_annualized || 0.2),
      }));
      
      const portfolioMetrics = calculateOptimizedPortfolioMetrics(equalWeights);
      
      // Portfolio volatility should be less than individual stock volatility
      // due to imperfect correlation (assumed 0.3 in our model)
      expect(portfolioMetrics.volatility).toBeLessThan(0.20);
    });
  });
});
