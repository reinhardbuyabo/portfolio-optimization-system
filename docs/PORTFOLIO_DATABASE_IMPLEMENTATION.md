# Portfolio Database Implementation

This document describes the full database-backed portfolio creation and holdings management system.

## Overview

The portfolio system has been upgraded from mock data to a fully database-backed implementation with computed metrics, automatic weight normalization, and comprehensive portfolio management.

## Schema Changes

### Portfolio Model
Added computed fields:
- `value` (Float): Total portfolio value in KES
- `expectedReturn` (Float): Weighted expected return
- `sharpeRatio` (Float): Risk-adjusted return metric
- `volatility` (Float): Portfolio volatility
- `holdingsCount` (Int): Number of holdings in the portfolio

### PortfolioAllocation Model
Added computed fields:
- `value` (Float): Market value of the holding
- `expectedReturn` (Float?): Expected return for this holding
- `sharpeRatio` (Float?): Sharpe ratio for this holding

Added cascade deletes for data integrity.

### PortfolioValuation Model (New)
Historical snapshot table for tracking portfolio performance over time:
- `id` (UUID)
- `portfolioId` (UUID)
- `date` (DateTime)
- `totalValue` (Float)
- `totalReturn` (Float)
- `sharpeRatio` (Float)
- `volatility` (Float)

## Migration

A migration file has been created at:
`prisma/migrations/20250101120000_add_portfolio_value_metrics/migration.sql`

**To apply the migration:**
```bash
npx prisma migrate deploy
```

Or if you have an interactive terminal:
```bash
npx prisma migrate dev --name add_portfolio_value_metrics
```

## API Endpoints

### POST /api/portfolios/create
Creates a new portfolio with stocks and computes all metrics.

**Request Body:**
```json
{
  "name": "Growth Portfolio",
  "riskTolerance": "MEDIUM",
  "targetReturn": 0.12,
  "stocks": [
    { "ticker": "SCOM", "weight": 0.4 },
    { "ticker": "EABL", "weight": 0.3 },
    { "ticker": "KCB", "weight": 0.3 }
  ]
}
```

**Features:**
- Automatically normalizes weights to sum to 1.0
- Creates assets if they don't exist
- Computes portfolio metrics (value, expectedReturn, sharpeRatio, volatility)
- Calculates individual holding values

### POST /api/portfolios/[id]/add-stock
Adds a stock to an existing portfolio.

**Request Body:**
```json
{
  "ticker": "SCOM",
  "weight": 0.25  // Optional, will auto-normalize if not provided
}
```

**Features:**
- Automatically rebalances all weights to sum to 1.0
- Recomputes portfolio metrics
- Updates all existing allocations

### GET /api/portfolios/[id]
Returns a single portfolio with all computed metrics and allocations.

**Response includes:**
- Portfolio metadata
- Computed metrics (value, expectedReturn, sharpeRatio, volatility, holdingsCount)
- Allocations with asset details
- Latest market data for each asset

### GET /api/portfolios
Returns all portfolios for the authenticated user with computed metrics.

## Metric Computation

### Portfolio Value
Currently uses a base value of 100,000 KES. In production, this should be based on actual investment amounts.

### Expected Return
Calculated as the weighted average of individual asset expected returns, which are computed from:
- Historical daily returns over the last 30 days
- Annualized (multiplied by 252 trading days)

### Volatility
Calculated as the weighted standard deviation of returns, with simplified correlation assumption (0.5).

### Sharpe Ratio
Formula: `(expectedReturn - riskFreeRate) / volatility`
- Default risk-free rate: 5% (0.05)

## Helper Functions

Located in `lib/portfolio-metrics.ts`:

- `getLatestClosePrice(assetId)`: Gets latest price from MarketData
- `getLatestClosePriceByTicker(ticker)`: Gets latest price by ticker
- `calculateExpectedReturn(assetId)`: Calculates expected return from historical data
- `calculateVolatility(assetId)`: Calculates volatility from historical data
- `calculateSharpeRatio(expectedReturn, volatility, riskFreeRate)`: Calculates Sharpe ratio
- `normalizeWeights(weights)`: Normalizes weights to sum to 1.0
- `computePortfolioMetrics(allocations)`: Computes all portfolio metrics

## Frontend Integration

### Portfolios List Page (`/portfolios`)
- Displays portfolios with computed metrics
- Shows value, expected return, Sharpe ratio, holdings count, and risk tolerance
- Uses `/api/portfolios/create` for portfolio creation
- Automatically refreshes after creation

### Portfolio Details
- Uses `/api/portfolios/[id]` to fetch portfolio data
- Displays all computed metrics
- Shows allocations with asset details

## Testing

To test the implementation:

1. **Apply the migration:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Create a portfolio with stocks:**
   ```bash
   curl -X POST http://localhost:3000/api/portfolios/create \
     -H "Content-Type: application/json" \
     -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN" \
     -d '{
       "name": "Test Portfolio",
       "riskTolerance": "MEDIUM",
       "targetReturn": 0.12,
       "stocks": [
         {"ticker": "SCOM", "weight": 0.4},
         {"ticker": "EABL", "weight": 0.3},
         {"ticker": "KCB", "weight": 0.3}
       ]
     }'
   ```

3. **Add a stock to existing portfolio:**
   ```bash
   curl -X POST http://localhost:3000/api/portfolios/PORTFOLIO_ID/add-stock \
     -H "Content-Type: application/json" \
     -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN" \
     -d '{
       "ticker": "EQTY",
       "weight": 0.2
     }'
   ```

4. **Verify metrics are computed:**
   - Check that `value`, `expectedReturn`, `sharpeRatio`, `volatility`, and `holdingsCount` are populated
   - Verify weights sum to 1.0
   - Check that individual allocation values are calculated

## Future Enhancements

1. **Valuation History**: Implement a cron job to snapshot daily metrics into `PortfolioValuation`
2. **Real Investment Amounts**: Replace base value with actual user investment amounts
3. **Covariance Matrix**: Use actual correlation data instead of simplified 0.5 assumption
4. **ML Integration**: Use LSTM predictions for expected returns instead of historical averages
5. **Performance Tracking**: Track portfolio performance over time with the `PortfolioValuation` table

## Notes

- The system automatically creates assets if they don't exist when adding stocks
- Weights are always normalized to sum to 1.0 (100%)
- Portfolio metrics are recalculated whenever allocations change
- All operations use database transactions for data consistency

