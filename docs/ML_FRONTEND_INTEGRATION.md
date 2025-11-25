# ML Frontend Integration Guide

This guide documents the complete integration of the ML API (LSTM price predictions and GARCH volatility forecasting) with the Next.js frontend.

## Overview

The integration enables users to:
1. Select stocks from the Market Overview page
2. Run ML predictions (LSTM + GARCH) on selected stocks
3. View prediction results in an interactive dialog
4. Persist predictions to database for reporting
5. View historical predictions on dedicated reports page

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                         │
│                                                              │
│  ┌──────────────────┐        ┌─────────────────────┐       │
│  │ Market Overview  │───────▶│  ML Prediction UI   │       │
│  │  Page (React)    │        │  (Dialog + Results) │       │
│  └──────────────────┘        └─────────────────────┘       │
│           │                            │                     │
│           ▼                            ▼                     │
│  ┌──────────────────────────────────────────────────┐      │
│  │         Next.js API Routes (/api/ml/*)           │      │
│  │  • /prepare-data  - Fetch historical CSV data    │      │
│  │  • /predict       - Run ML predictions + persist │      │
│  │  • /predict/history - Query prediction history   │      │
│  └──────────────────────────────────────────────────┘      │
│           │                            │                     │
└───────────┼────────────────────────────┼─────────────────────┘
            │                            │
            ▼                            ▼
   ┌─────────────────┐         ┌─────────────────┐
   │   ML API        │         │   PostgreSQL    │
   │  (FastAPI)      │         │   Database      │
   │  localhost:8000 │         │  (Prisma ORM)   │
   └─────────────────┘         └─────────────────┘
```

## Components Created

### 1. Database Schema (`prisma/schema.prisma`)

**Models:**
- `LSTMPrediction` - Stores LSTM price predictions
  - symbol, prediction, predictionScaled, priceRange, executionTime, inputDataPoints
- `GARCHVolatility` - Stores GARCH volatility forecasts
  - symbol, forecastedVariance, volatilityAnnualized, executionTime, inputDataPoints
- `PredictionBatch` - Tracks batch prediction runs
  - symbols, totalCount, successCount, failureCount, totalTime

**Migration Required:**
```bash
npx prisma migrate dev --name add_ml_predictions
npx prisma generate
```

### 2. TypeScript Types (`types/ml-api.ts`)

Complete type definitions for:
- LSTM request/response types
- GARCH request/response types
- Batch prediction types
- Combined prediction types
- Database persistence types

### 3. ML API Client Library (`lib/api/ml-client.ts`)

**Class: `MLClient`**
- `checkHealth()` - Check ML API status
- `predictLSTM(request)` - Single LSTM prediction
- `predictLSTMBatch(request)` - Batch LSTM predictions
- `predictGARCH(request)` - Single GARCH forecast
- `predictGARCHBatch(request)` - Batch GARCH forecasts
- `predictCombined(symbol, prices, returns)` - Combined LSTM + GARCH

**Configuration:**
- Base URL: `process.env.NEXT_PUBLIC_ML_API_URL` (default: `http://localhost:8000`)
- Error handling with custom `MLAPIError` class

### 4. Data Helper (`lib/api/ml-data-helper.ts`)

Server-side utilities for preparing historical data:
- `getHistoricalPrices(symbol, days)` - Extract prices from CSV
- `calculateLogReturns(prices)` - Compute log returns
- `prepareMLData(symbol, options)` - Prepare data for single stock
- `prepareBatchMLData(symbols)` - Prepare data for multiple stocks

**Data Source:** `ml/datasets/NSE_data_all_stocks_2024_jan_to_oct.csv`

### 5. API Routes

#### `/api/ml/prepare-data` (POST)
Prepares historical data from CSV for ML predictions.

**Request:**
```json
{
  "symbols": ["SCOM", "EQTY", "KCB"]
}
```

**Response:**
```json
{
  "symbols": ["SCOM", "EQTY", "KCB"],
  "historical_data": {
    "SCOM": {
      "prices": [14.5, 14.6, ...],  // Last 60 days
      "returns": [0.0067, -0.0034, ...] // Log returns
    }
  },
  "errors": {}
}
```

#### `/api/ml/predict` (POST)
Runs ML predictions and persists results to database.

**Request:**
```json
{
  "symbols": ["SCOM", "EQTY"],
  "historical_data": {
    "SCOM": {
      "prices": [...],
      "returns": [...]
    }
  }
}
```

**Response:**
```json
{
  "predictions": [
    {
      "symbol": "SCOM",
      "lstm": {
        "prediction": 14.39,
        "prediction_scaled": -0.0368,
        "price_range": { "min": 14.50, "max": 17.40 },
        "execution_time": 0.123
      },
      "garch": {
        "forecasted_variance": 0.00047389,
        "volatility_annualized": 0.3456,
        "execution_time": 0.456
      }
    }
  ],
  "summary": {
    "total": 2,
    "lstm_successful": 2,
    "garch_successful": 2,
    "total_time": 1.234
  },
  "batch_id": "uuid"
}
```

#### `/api/ml/predict/history` (GET)
Query historical predictions from database.

**Query Parameters:**
- `symbol` (optional) - Filter by stock symbol
- `limit` (optional) - Number of results (default: 20)

**Response:**
```json
{
  "lstm_predictions": [...],
  "garch_forecasts": [...]
}
```

### 6. React Components

#### `components/shared/prediction-display.tsx`
Displays combined LSTM + GARCH prediction results with:
- Price prediction with trend indicator
- Expected price change percentage
- Price range context
- Volatility forecast with risk level
- Execution time metrics
- Interpretation summary

#### `components/shared/market-quotes-table.tsx` (Enhanced)
Market quotes table with ML prediction capabilities:
- **Checkbox column** - Multi-select stocks
- **Action bar** - Shows selection count and "Run ML Predictions" button
- **Batch processing** - Runs predictions on all selected stocks in parallel
- **Results dialog** - Displays predictions in grid layout
- **Error handling** - Shows user-friendly error messages

**Features:**
- Select all / deselect all functionality
- Visual feedback for selected rows (blue highlight)
- Loading state with spinner
- Responsive grid layout for results

### 7. Pages

#### `/app/(root)/market-overview/page.tsx` (Existing)
Already displays market data from CSV. Now includes enhanced MarketQuotesTable component with ML prediction functionality.

#### `/app/(root)/predictions/page.tsx` (New)
Historical predictions report page with:
- **Search** - Filter by stock symbol
- **Tabs** - Toggle between LSTM predictions and GARCH forecasts
- **Card grid** - Visual display of historical predictions
- **Summary stats** - Total predictions, forecasts, unique stocks
- **Date formatting** - Human-readable timestamps

## Setup Instructions

### 1. Environment Variables

Create/update `.env.local`:
```env
# ML API Configuration
NEXT_PUBLIC_ML_API_URL=http://localhost:8000

# Database (existing)
DATABASE_URL=postgresql://user:password@localhost:5432/portfolio_db
```

### 2. Database Migration

Run Prisma migration to create ML prediction tables:
```bash
npx prisma migrate dev --name add_ml_predictions
npx prisma generate
```

### 3. Start ML API

Ensure the ML API is running:
```bash
cd ml
tox -e serve
# Or for development:
# tox -e serve-dev
```

ML API should be accessible at `http://localhost:8000/api/v1/docs`

### 4. Install Dependencies

All required dependencies should already be installed. If needed:
```bash
npm install
```

### 5. Start Next.js Application

```bash
npm run dev
```

Application should be accessible at `http://localhost:3000`

## Usage Guide

### Running Predictions from Market Overview

1. Navigate to `/market-overview`
2. Scroll to the "Market Quotes" table
3. Select stocks using checkboxes (or select all)
4. Click "Run ML Predictions" button
5. Wait for processing (loading indicator shown)
6. View results in dialog with:
   - Price predictions (LSTM)
   - Volatility forecasts (GARCH)
   - Risk levels and interpretations

### Viewing Historical Predictions

1. Navigate to `/predictions`
2. Use search bar to filter by symbol (optional)
3. Toggle between "LSTM Predictions" and "GARCH Volatility" tabs
4. View cards showing historical prediction details
5. See summary statistics at the bottom

## Data Flow

### Prediction Workflow

1. **User Selection**
   - User selects stocks in market-quotes-table
   - Frontend validates selection (at least 1 stock)

2. **Data Preparation**
   - Frontend calls `/api/ml/prepare-data`
   - Server reads CSV file
   - Extracts last 60 days for LSTM
   - Calculates log returns for GARCH
   - Returns prepared data

3. **ML Prediction**
   - Frontend calls `/api/ml/predict`
   - Server calls ML API (FastAPI) via mlClient
   - Runs LSTM and GARCH in parallel for each stock
   - All stocks processed in parallel

4. **Persistence**
   - Server stores predictions in PostgreSQL
   - Creates records in `LSTMPrediction` table
   - Creates records in `GARCHVolatility` table
   - Creates batch record in `PredictionBatch` table

5. **Display**
   - Frontend receives prediction results
   - Shows results in dialog using PredictionDisplay component
   - User can view detailed metrics and interpretations

## API Error Handling

All API routes implement comprehensive error handling:

### Client-Side Errors (4xx)
- **400 Bad Request** - Invalid request parameters
- **404 Not Found** - Insufficient historical data

### Server-Side Errors (5xx)
- **500 Internal Server Error** - ML API connection issues, database errors

### Error Display
- Errors shown in red banner above table
- Specific error messages from ML API passed through
- Database errors logged server-side, generic message shown to user

## Performance Considerations

### Batch Processing
- All stocks processed in parallel (Promise.allSettled)
- No sequential bottlenecks
- Independent failures don't block other predictions

### Data Loading
- CSV parsing done server-side (Node.js filesystem)
- Historical data cached per request
- Minimal data transfer (only required date range)

### Database Operations
- Predictions persisted asynchronously
- Database failures don't affect prediction results
- Indexed by symbol and predictionDate for fast queries

## Testing

### Manual Testing Steps

1. **Health Check**
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

2. **Single Stock Prediction**
   - Select 1 stock in market-overview
   - Run prediction
   - Verify results displayed correctly

3. **Batch Prediction**
   - Select 5-10 stocks
   - Run prediction
   - Verify all results displayed
   - Check database for persisted records

4. **Prediction History**
   - Navigate to `/predictions`
   - Verify historical records displayed
   - Test search functionality
   - Toggle between tabs

5. **Error Scenarios**
   - Stop ML API → expect connection error
   - Select stock with < 60 days data → expect data error
   - Stop database → predictions work, persistence fails gracefully

## Troubleshooting

### ML API Connection Failed
**Error:** `Failed to connect to ML API: ...`

**Solutions:**
- Verify ML API is running: `curl http://localhost:8000/api/v1/health`
- Check `NEXT_PUBLIC_ML_API_URL` environment variable
- Ensure no firewall blocking port 8000

### Insufficient Data
**Error:** `Insufficient data for SYMBOL: need at least 60 days...`

**Solutions:**
- Verify CSV file exists: `ml/datasets/NSE_data_all_stocks_2024_jan_to_oct.csv`
- Check stock symbol exists in CSV
- Ensure stock has >= 60 days of data

### Database Connection Issues
**Error:** `Failed to persist prediction...`

**Solutions:**
- Verify PostgreSQL is running
- Run migrations: `npx prisma migrate dev`
- Check `DATABASE_URL` in `.env`

### Missing UI Components
**Error:** Module not found errors

**Solutions:**
- Install dependencies: `npm install`
- Verify shadcn/ui components installed:
  - Button, Dialog, Checkbox, Card, Tabs, Input
- Generate Prisma client: `npx prisma generate`

## Production Deployment

### Environment Configuration

**Production ML API URL:**
```env
NEXT_PUBLIC_ML_API_URL=https://your-ml-api.railway.app
```

**Database:**
- Use production PostgreSQL instance
- Run migrations in production environment

**Security:**
- Enable CORS on ML API for production domain
- Use environment-specific API keys (if implemented)
- Enable HTTPS for all API communication

## Future Enhancements

### Potential Improvements

1. **Real-time Updates**
   - WebSocket connection to ML API
   - Live prediction status updates
   - Progressive result streaming

2. **Advanced Filtering**
   - Date range picker for historical predictions
   - Filter by risk level (High/Moderate/Low)
   - Export predictions to CSV/Excel

3. **Visualization**
   - Price prediction charts
   - Volatility trend graphs
   - Comparison with actual prices (when available)

4. **Batch Management**
   - View batch execution history
   - Retry failed predictions
   - Schedule recurring predictions

5. **User Preferences**
   - Save favorite stock selections
   - Custom prediction parameters (LSTM days, GARCH days)
   - Email notifications for predictions

## Support

For issues or questions:
1. Check ML API logs: `ml/logs/`
2. Check Next.js console for frontend errors
3. Review database logs for persistence issues
4. Consult ML API documentation: `ml/SWAGGER_TEST_DATA.md`

## Related Documentation

- [ML API Documentation](ml/API_UPDATE_GUIDE.md)
- [LSTM/GARCH Testing Guide](ml/scripts/TESTING_GUIDE.md)
- [Scaling Fix Explanation](ml/SCALING_FIX.md)
- [Swagger Test Data](ml/SWAGGER_TEST_DATA.md)
