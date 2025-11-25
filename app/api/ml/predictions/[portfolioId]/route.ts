import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ml/predictions/[portfolioId]
 * 
 * Fetch latest ML predictions for a portfolio's stocks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { portfolioId: string } }
) {
  try {
    const { portfolioId } = params;

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }

    // Get portfolio with allocations
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        allocations: {
          include: {
            asset: {
              include: {
                data: {
                  orderBy: { date: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    // Get symbols from portfolio allocations
    const symbols = portfolio.allocations.map(a => a.asset.ticker);

    if (symbols.length === 0) {
      return NextResponse.json({
        portfolioId,
        predictions: [],
      });
    }

    // Fetch latest predictions for each symbol
    const predictions = await Promise.all(
      symbols.map(async (symbol) => {
        // Get latest LSTM prediction
        const lstmPrediction = await prisma.lSTMPrediction.findFirst({
          where: { symbol },
          orderBy: { predictionDate: 'desc' },
        });

        // Get latest GARCH volatility
        const garchVolatility = await prisma.gARCHVolatility.findFirst({
          where: { symbol },
          orderBy: { predictionDate: 'desc' },
        });

        // Get current price from allocation
        const allocation = portfolio.allocations.find(a => a.asset.ticker === symbol);
        const currentPrice = allocation?.asset.data[0]?.close || 0;

        if (!lstmPrediction || !garchVolatility) {
          return null;
        }

        // Calculate expected return
        const expectedReturn = currentPrice > 0
          ? (lstmPrediction.prediction - currentPrice) / currentPrice
          : 0;

        return {
          symbol,
          currentPrice,
          lstm: {
            prediction: lstmPrediction.prediction,
            horizon: 1, // 1 day ahead
            predictionDate: lstmPrediction.predictionDate,
          },
          garch: {
            volatility_annualized: garchVolatility.volatilityAnnualized,
            forecasted_variance: garchVolatility.forecastedVariance,
            predictionDate: garchVolatility.predictionDate,
          },
          expectedReturn,
        };
      })
    );

    // Filter out null values (stocks without predictions)
    const validPredictions = predictions.filter(p => p !== null);

    return NextResponse.json({
      portfolioId,
      predictions: validPredictions,
      count: validPredictions.length,
      total: symbols.length,
    });

  } catch (error: any) {
    console.error('Fetch predictions error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
