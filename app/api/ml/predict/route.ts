import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { MLClient, MLAPIError } from '@/lib/api/ml-client';
import {
  CombinedBatchPredictionRequest,
  CombinedBatchPredictionResponse,
  CombinedPrediction,
} from '@/types/ml-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize ML client
const mlClient = new MLClient();

/**
 * POST /api/ml/predict
 * 
 * Request body:
 * {
 *   symbols: string[];
 *   historical_data: {
 *     [symbol: string]: {
 *       prices: number[];
 *       returns: number[];
 *     }
 *   }
 * }
 * 
 * Response:
 * {
 *   predictions: CombinedPrediction[];
 *   summary: { ... };
 *   batch_id: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: CombinedBatchPredictionRequest = await request.json();
    const { symbols, historical_data } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: symbols array is required' },
        { status: 400 }
      );
    }

    if (!historical_data || typeof historical_data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request: historical_data object is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const predictions: CombinedPrediction[] = [];
    let lstmSuccessCount = 0;
    let lstmFailCount = 0;
    let garchSuccessCount = 0;
    let garchFailCount = 0;

    // Process all symbols in parallel
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const data = historical_data[symbol];
        
        if (!data || !data.prices || !data.returns) {
          throw new Error(`Missing historical data for ${symbol}`);
        }

        return mlClient.predictCombined(symbol, data.prices, data.returns);
      })
    );

    // Process results and persist to database
    for (let i = 0; i < results.length; i++) {
      const symbol = symbols[i];
      const result = results[i];

      if (result.status === 'fulfilled') {
        const { lstm, garch, errors } = result.value;
        
        predictions.push({
          symbol,
          lstm,
          garch,
          errors,
        });

        // Track success/failure counts
        if (lstm) lstmSuccessCount++;
        else lstmFailCount++;
        
        if (garch) garchSuccessCount++;
        else garchFailCount++;

        // Persist LSTM prediction to database
        if (lstm) {
          try {
            await prisma.lSTMPrediction.create({
              data: {
                symbol,
                prediction: lstm.prediction,
                predictionScaled: lstm.prediction_scaled,
                priceRangeMin: lstm.price_range.min,
                priceRangeMax: lstm.price_range.max,
                executionTime: lstm.execution_time,
                inputDataPoints: historical_data[symbol].prices.length,
              },
            });
          } catch (dbError) {
            console.error(`Failed to persist LSTM prediction for ${symbol}:`, dbError);
          }
        }

        // Persist GARCH forecast to database
        if (garch) {
          try {
            await prisma.gARCHVolatility.create({
              data: {
                symbol,
                forecastedVariance: garch.forecasted_variance,
                volatilityAnnualized: garch.volatility_annualized,
                executionTime: garch.execution_time,
                inputDataPoints: historical_data[symbol].returns.length,
              },
            });
          } catch (dbError) {
            console.error(`Failed to persist GARCH forecast for ${symbol}:`, dbError);
          }
        }
      } else {
        // Entire prediction failed
        predictions.push({
          symbol,
          lstm: null,
          garch: null,
          errors: {
            lstm: result.reason?.message || 'Prediction failed',
            garch: result.reason?.message || 'Prediction failed',
          },
        });
        lstmFailCount++;
        garchFailCount++;
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;

    // Create batch record
    let batchId: string | null = null;
    try {
      const batch = await prisma.predictionBatch.create({
        data: {
          symbols,
          totalCount: symbols.length,
          successCount: Math.min(lstmSuccessCount, garchSuccessCount),
          failureCount: Math.max(lstmFailCount, garchFailCount),
          totalTime,
        },
      });
      batchId = batch.id;
    } catch (dbError) {
      console.error('Failed to create batch record:', dbError);
    }

    const response: CombinedBatchPredictionResponse & { batch_id?: string } = {
      predictions,
      summary: {
        total: symbols.length,
        lstm_successful: lstmSuccessCount,
        lstm_failed: lstmFailCount,
        garch_successful: garchSuccessCount,
        garch_failed: garchFailCount,
        total_time: totalTime,
      },
      batch_id: batchId || undefined,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('ML Prediction API Error:', error);
    
    if (error instanceof MLAPIError) {
      return NextResponse.json(
        { error: error.message, statusCode: error.statusCode },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ml/predict/history?symbol=SCOM&limit=10
 * 
 * Query parameters:
 * - symbol: string (optional) - Filter by stock symbol
 * - limit: number (optional) - Limit number of results (default: 20)
 * 
 * Response:
 * {
 *   lstm_predictions: [...];
 *   garch_forecasts: [...];
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    const whereClause = symbol ? { symbol } : {};

    const [lstmPredictions, garchForecasts] = await Promise.all([
      prisma.lSTMPrediction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.gARCHVolatility.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    return NextResponse.json({
      lstm_predictions: lstmPredictions,
      garch_forecasts: garchForecasts,
    });

  } catch (error) {
    console.error('Failed to fetch prediction history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prediction history' },
      { status: 500 }
    );
  }
}
