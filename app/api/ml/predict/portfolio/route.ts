import { NextRequest, NextResponse } from 'next/server';
import { prepareBatchMLData } from '@/lib/api/ml-data-helper';
import { MLClient } from '@/lib/api/ml-client';
import {
  CombinedPrediction,
} from '@/types/ml-api';
import {
  predictionsToPortfolioStocks,
  calculatePortfolioMetrics,
  findOptimalPortfolio,
  generateEfficientFrontier,
} from '@/lib/portfolio-optimizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mlClient = new MLClient();

/**
 * POST /api/ml/predict/portfolio
 * 
 * Request body:
 * {
 *   portfolioId: string;
 *   holdings: Array<{
 *     symbol: string;
 *     weight: number;
 *     currentPrice: number;
 *   }>;
 * }
 * 
 * Response:
 * {
 *   portfolioId: string;
 *   predictions: CombinedPrediction[];
 *   optimization: {
 *     currentMetrics: { expectedReturn, volatility, sharpeRatio };
 *     optimalWeights: { [symbol]: weight };
 *     optimalMetrics: { expectedReturn, volatility, sharpeRatio };
 *     efficientFrontier: Array<{ volatility, return, sharpeRatio }>;
 *   };
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { portfolioId, holdings } = body;

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json(
        { error: 'Holdings array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Extract symbols from holdings
    const symbols = holdings.map(h => h.symbol);

    // Step 1: Prepare historical data
    const preparedData = prepareBatchMLData(symbols);

    if (preparedData.symbols.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid historical data available for portfolio stocks',
          errors: preparedData.errors,
        },
        { status: 404 }
      );
    }

    // Step 2: Run ML predictions
    const predictions: CombinedPrediction[] = [];
    const results = await Promise.allSettled(
      preparedData.symbols.map(async (symbol) => {
        const data = preparedData.historical_data[symbol];
        
        if (!data || !data.prices || !data.returns) {
          throw new Error(`Missing historical data for ${symbol}`);
        }

        return mlClient.predictCombined(symbol, data.prices, data.returns);
      })
    );

    // Process results
    for (let i = 0; i < results.length; i++) {
      const symbol = preparedData.symbols[i];
      const result = results[i];

      if (result.status === 'fulfilled') {
        const { lstm, garch, errors } = result.value;
        predictions.push({
          symbol,
          lstm,
          garch,
          errors,
        });
      } else {
        predictions.push({
          symbol,
          lstm: null,
          garch: null,
          errors: {
            lstm: result.reason?.message || 'Prediction failed',
            garch: result.reason?.message || 'Prediction failed',
          },
        });
      }
    }

    // Step 3: Build current prices map
    const currentPrices: { [symbol: string]: number } = {};
    holdings.forEach(h => {
      currentPrices[h.symbol] = h.currentPrice;
    });

    // Step 4: Convert predictions to portfolio stocks format
    const stocks = predictionsToPortfolioStocks(predictions, currentPrices);

    if (stocks.length === 0) {
      return NextResponse.json(
        { error: 'No valid predictions available for optimization' },
        { status: 400 }
      );
    }

    // Step 5: Calculate current portfolio metrics
    const currentWeights = holdings.map(h => h.weight);
    
    // Match weights to stocks that have predictions
    const alignedWeights: number[] = [];
    for (const stock of stocks) {
      const holding = holdings.find(h => h.symbol === stock.symbol);
      alignedWeights.push(holding?.weight || 0);
    }
    
    // Normalize weights to sum to 1
    const weightSum = alignedWeights.reduce((sum, w) => sum + w, 0);
    const normalizedCurrentWeights = weightSum > 0 
      ? alignedWeights.map(w => w / weightSum)
      : alignedWeights;

    const currentMetrics = calculatePortfolioMetrics(stocks, normalizedCurrentWeights);

    // Step 6: Find optimal portfolio
    const optimal = findOptimalPortfolio(stocks);

    // Step 7: Generate efficient frontier
    const efficientFrontier = generateEfficientFrontier(stocks, 50);

    // Build response
    const response = {
      portfolioId,
      predictions,
      optimization: {
        currentMetrics: {
          expectedReturn: currentMetrics.expectedReturn,
          volatility: currentMetrics.volatility,
          sharpeRatio: currentMetrics.sharpeRatio,
        },
        optimalWeights: optimal.weights,
        optimalMetrics: {
          expectedReturn: optimal.expectedReturn,
          volatility: optimal.volatility,
          sharpeRatio: optimal.sharpeRatio,
        },
        efficientFrontier: efficientFrontier.map(p => ({
          volatility: p.volatility,
          return: p.return,
          sharpeRatio: p.sharpeRatio,
        })),
      },
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Portfolio prediction error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}




