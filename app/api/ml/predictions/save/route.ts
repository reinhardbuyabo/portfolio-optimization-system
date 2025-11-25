import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ml/predictions/save
 * 
 * Save ML predictions (LSTM + GARCH) to database
 * 
 * Request body:
 * {
 *   predictions: Array<{
 *     symbol: string;
 *     currentPrice: number;
 *     lstm: { prediction: number; horizon: number };
 *     garch: { volatility_annualized: number };
 *     expectedReturn: number;
 *     execution_time?: number;
 *   }>;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { predictions } = body;

    if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
      return NextResponse.json(
        { error: 'Predictions array is required' },
        { status: 400 }
      );
    }

    const results = {
      saved: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Save each prediction to database
    for (const pred of predictions) {
      try {
        const { symbol, currentPrice, lstm, garch, expectedReturn, execution_time } = pred;

        if (!symbol || !lstm?.prediction || !garch?.volatility_annualized) {
          results.failed++;
          results.errors.push(`Invalid prediction data for ${symbol || 'unknown'}`);
          continue;
        }

        // Calculate scaled prediction (0-1 range)
        const priceRangeMin = currentPrice * 0.8; // Assume 20% range
        const priceRangeMax = currentPrice * 1.2;
        const predictionScaled = (lstm.prediction - priceRangeMin) / (priceRangeMax - priceRangeMin);

        // Save LSTM prediction
        await prisma.lSTMPrediction.create({
          data: {
            symbol,
            prediction: lstm.prediction,
            predictionScaled,
            priceRangeMin,
            priceRangeMax,
            executionTime: execution_time || 0,
            inputDataPoints: 60, // Default to 60 days
            predictionDate: new Date(),
          },
        });

        // Save GARCH volatility
        await prisma.gARCHVolatility.create({
          data: {
            symbol,
            forecastedVariance: Math.pow(garch.volatility_annualized, 2), // Convert to variance
            volatilityAnnualized: garch.volatility_annualized,
            executionTime: execution_time || 0,
            inputDataPoints: 60,
            predictionDate: new Date(),
          },
        });

        results.saved++;
      } catch (error) {
        console.error(`Error saving prediction for ${pred.symbol}:`, error);
        results.failed++;
        results.errors.push(`Failed to save ${pred.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Create a batch record
    try {
      await prisma.predictionBatch.create({
        data: {
          symbols: predictions.map(p => p.symbol),
          totalCount: predictions.length,
          successCount: results.saved,
          failureCount: results.failed,
          totalTime: predictions.reduce((sum, p) => sum + (p.execution_time || 0), 0),
        },
      });
    } catch (error) {
      console.error('Error saving batch record:', error);
    }

    return NextResponse.json({
      success: true,
      saved: results.saved,
      failed: results.failed,
      errors: results.errors,
    });

  } catch (error: any) {
    console.error('Save predictions error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
