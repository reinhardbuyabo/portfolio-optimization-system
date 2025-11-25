# Frontend Integration Guide - V4 Models

**Date:** November 18, 2024  
**Status:** ✅ Updated for V4 Log-Transformed Models  
**Model Version:** v4_log_hybrid (Stock-Specific + General)

---

## Overview

The portfolio optimization system now uses **V4 log-transformed LSTM models** with significantly improved accuracy and performance:

### Model Types

1. **Stock-Specific Models (High Accuracy)** 📊
   - Stocks: SCOM, EQTY, KCB, BAMB, EABL
   - MAPE: 2-9% (Very accurate)
   - Sharpe Ratio: 7-13 (Excellent for trading)
   - Use for: Critical trading decisions

2. **General Model (Good Coverage)** 📈
   - Stocks: 50+ other NSE stocks
   - MAPE: ~4.5% (Good accuracy)
   - Use for: Broad market forecasting

### Key Improvements in V4

- ✅ **Log transformation** - Better handling of price movements
- ✅ **Stock-specific scaling** - Each model optimized for its stock
- ✅ **Zero negative predictions** - All predictions are realistic
- ✅ **Hybrid approach** - Automatic fallback to general model
- ✅ **Fast caching** - LRU cache with <30ms response time
- ✅ **Multiple horizons** - 1d, 5d, 10d, 30d predictions

---

## Quick Start

### 1. Environment Variables

Add to your `.env` file:

```bash
# ML Service URL (default: http://localhost:8000)
NEXT_PUBLIC_ML_API_URL=http://localhost:8000
```

### 2. Start ML Service

```bash
# Terminal 1: Start the ML API server
cd ml
tox -e serve-dev

# Should show: "Stock Prediction API v4 (Log - Hybrid)"
# Available at: http://localhost:8000
```

### 3. Test the Integration

```bash
# Terminal 2: Test API is working
curl http://localhost:8000/api/v4/health

# Expected response:
# {
#   "status": "healthy",
#   "total_coverage": 55,
#   "specific_models": 5,
#   "general_model_stocks": 50,
#   ...
# }
```

---

## API Endpoints

### Next.js API Routes (Recommended)

Use these from your frontend components:

#### 1. Health Check

```typescript
// GET /api/ml/v4/health
const response = await fetch('/api/ml/v4/health');
const health = await response.json();

console.log(health.status); // "healthy"
console.log(health.total_coverage); // 55 stocks
```

#### 2. Get Available Models

```typescript
// GET /api/ml/v4/models
const response = await fetch('/api/ml/v4/models');
const { available_stocks, cache_stats } = await response.json();

console.log(available_stocks); // ["SCOM", "EQTY", "KCB", ...]
console.log(cache_stats.specific_models); // 5
```

#### 3. Single Stock Prediction

```typescript
// POST /api/ml/v4/predict
const response = await fetch('/api/ml/v4/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbol: 'SCOM',
    horizon: '10d',
    recent_prices: [...60 recent prices...]
  })
});

const prediction = await response.json();

console.log(prediction.prediction); // 16.24 KES
console.log(prediction.mape); // 8.95%
console.log(prediction.model_version); // "v4_log_stock_specific"
console.log(prediction.cached); // true/false
```

#### 4. Batch Prediction (Multiple Stocks)

```typescript
// POST /api/ml/v4/predict/batch
const response = await fetch('/api/ml/v4/predict/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: ['SCOM', 'EQTY', 'KCB'],
    horizon: '10d',
    recent_prices: [...60 recent prices...]
  })
});

const { predictions, summary, execution_time } = await response.json();

predictions.forEach(p => {
  console.log(`${p.symbol}: ${p.prediction} KES (MAPE: ${p.mape}%)`);
});
console.log(`Total time: ${execution_time}s`);
```

---

## React Component Examples

### Example 1: Stock Prediction Widget

```typescript
// components/StockPredictionWidget.tsx
'use client';

import { useState } from 'react';
import { StockPredictionV4Response } from '@/types/ml-api';

interface StockPredictionWidgetProps {
  symbol: string;
  recentPrices: number[]; // 60 recent prices
}

export function StockPredictionWidget({ 
  symbol, 
  recentPrices 
}: StockPredictionWidgetProps) {
  const [prediction, setPrediction] = useState<StockPredictionV4Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<'1d' | '5d' | '10d' | '30d'>('10d');

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ml/v4/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          horizon,
          recent_prices: recentPrices,
        }),
      });

      if (!response.ok) {
        throw new Error('Prediction failed');
      }

      const data = await response.json();
      setPrediction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-xl font-bold mb-4">{symbol} Price Prediction</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Prediction Horizon
        </label>
        <select
          value={horizon}
          onChange={(e) => setHorizon(e.target.value as any)}
          className="w-full p-2 border rounded"
        >
          <option value="1d">1 Day</option>
          <option value="5d">5 Days</option>
          <option value="10d">10 Days</option>
          <option value="30d">30 Days</option>
        </select>
      </div>

      <button
        onClick={handlePredict}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Predicting...' : 'Get Prediction'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {prediction && (
        <div className="mt-4 space-y-2">
          <div className="text-3xl font-bold text-green-600">
            {prediction.prediction.toFixed(2)} KES
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Model:</span>{' '}
              <span className="font-medium">
                {prediction.model_version.includes('specific') ? '📊 High Accuracy' : '📈 General'}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Accuracy (MAPE):</span>{' '}
              <span className="font-medium">{prediction.mape?.toFixed(2)}%</span>
            </div>
            
            <div>
              <span className="text-gray-600">Horizon:</span>{' '}
              <span className="font-medium">{prediction.horizon}</span>
            </div>
            
            <div>
              <span className="text-gray-600">Response:</span>{' '}
              <span className="font-medium">
                {(prediction.execution_time * 1000).toFixed(0)}ms
                {prediction.cached && ' (cached)'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Example 2: Portfolio Predictions Dashboard

```typescript
// components/PortfolioPredictionsDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { StockPredictionV4Response } from '@/types/ml-api';

export function PortfolioPredictionsDashboard() {
  const [predictions, setPredictions] = useState<StockPredictionV4Response[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableStocks, setAvailableStocks] = useState<string[]>([]);

  // Load available stocks on mount
  useEffect(() => {
    fetch('/api/ml/v4/models')
      .then(res => res.json())
      .then(data => setAvailableStocks(data.available_stocks))
      .catch(console.error);
  }, []);

  const handleBatchPredict = async () => {
    setLoading(true);
    
    try {
      // Get recent prices for all stocks (in real app, fetch from DB)
      const recentPrices = Array(60).fill(20); // Placeholder
      
      const response = await fetch('/api/ml/v4/predict/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: availableStocks.slice(0, 10), // First 10 stocks
          horizon: '10d',
          recent_prices: recentPrices,
        }),
      });

      const { predictions: results } = await response.json();
      setPredictions(results);
    } catch (error) {
      console.error('Batch prediction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Portfolio Predictions</h2>
        <button
          onClick={handleBatchPredict}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? 'Loading...' : 'Get Predictions'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {predictions.map((pred) => (
          <div key={pred.symbol} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold">{pred.symbol}</h3>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {pred.model_version.includes('specific') ? '📊' : '📈'}
              </span>
            </div>
            
            <div className="text-2xl font-bold text-green-600 mb-2">
              {pred.prediction.toFixed(2)} KES
            </div>
            
            <div className="text-sm text-gray-600">
              MAPE: {pred.mape?.toFixed(2)}%
            </div>
            
            <div className="text-xs text-gray-500 mt-2">
              {pred.horizon} • {(pred.execution_time * 1000).toFixed(0)}ms
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Using the ML Client Directly

For more control, you can use the ML client directly:

```typescript
import { mlClient } from '@/lib/api/ml-client';

// Check health
const health = await mlClient.checkHealthV4();
console.log(health.status);

// Get available models
const models = await mlClient.getAvailableModelsV4();
console.log(models.available_stocks);

// Single prediction
const prediction = await mlClient.predictStockV4({
  symbol: 'SCOM',
  horizon: '10d',
  recent_prices: [...],
});

// Batch prediction
const batch = await mlClient.predictBatchV4({
  symbols: ['SCOM', 'EQTY', 'KCB'],
  horizon: '10d',
  recent_prices: [...],
});

// Get model info
const info = await mlClient.getModelInfoV4('SCOM');
console.log(info.test_mape); // Model accuracy

// Get stats
const stats = await mlClient.getStatsV4();
console.log(stats.cache_hit_rate); // Cache performance
```

---

## Error Handling

```typescript
import { MLAPIError } from '@/lib/api/ml-client';

try {
  const prediction = await mlClient.predictStockV4({
    symbol: 'INVALID',
    horizon: '10d',
    recent_prices: [...],
  });
} catch (error) {
  if (error instanceof MLAPIError) {
    if (error.statusCode === 404) {
      console.error('Stock not found or no model available');
    } else if (error.statusCode === 400) {
      console.error('Invalid request parameters');
    } else {
      console.error('Prediction failed:', error.message);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Performance Tips

### 1. Use Batch Predictions
```typescript
// ❌ Slow: Multiple individual requests
for (const symbol of symbols) {
  await predictStockV4({ symbol, ... });
}

// ✅ Fast: Single batch request
await predictBatchV4({ symbols, ... });
```

### 2. Leverage Caching
The V4 API automatically caches models (LRU cache with 20 slots). Frequently accessed stocks will have <30ms response time.

### 3. Monitor Cache Hit Rate
```typescript
const stats = await mlClient.getStatsV4();
console.log(`Cache hit rate: ${stats.cache_hit_rate}%`);
// High hit rate = good performance
```

---

## Model Information

### Stock-Specific Models (5 stocks)
- **SCOM** (Safaricom): MAPE 8.95%, Sharpe 13.27
- **EQTY** (Equity Group): MAPE 4.69%, Sharpe 12.15
- **KCB** (KCB Group): MAPE 4.89%, Sharpe 7.42
- **BAMB** (Bamburi): MAPE 3.45%, Sharpe 8.01
- **EABL** (EABL): MAPE 2.87%, Sharpe 8.02

### General Model (50+ stocks)
- Coverage: All other NSE stocks
- Average MAPE: ~4.5%
- Use for: Broad market coverage

---

## Migration from V1 to V4

### Old V1 API (Legacy)
```typescript
// ❌ Old way
const prediction = await mlClient.predictLSTM({
  symbol: 'SCOM',
  data: prices.map(p => ({ 'Day Price': p })),
  prediction_days: 60,
});
```

### New V4 API (Recommended)
```typescript
// ✅ New way
const prediction = await mlClient.predictStockV4({
  symbol: 'SCOM',
  horizon: '10d',
  recent_prices: prices,
});
```

### Benefits of V4
- Simpler API (no data transformation needed)
- Multiple horizons (1d, 5d, 10d, 30d)
- Better accuracy (log transformations)
- Faster (caching + optimizations)
- Model metadata (MAPE, version, cached status)

---

## Testing

### Manual Testing
```bash
# Test health
curl http://localhost:3000/api/ml/v4/health

# Test available models
curl http://localhost:3000/api/ml/v4/models

# Test prediction
curl -X POST http://localhost:3000/api/ml/v4/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol":"SCOM","horizon":"10d","recent_prices":[...]}'
```

### Integration Tests
```bash
cd ml
python3 test_frontend_integration.py
```

---

## Troubleshooting

### ML Service Not Running
```bash
# Check if ML service is running
curl http://localhost:8000/api/v4/health

# Start ML service
cd ml && tox -e serve-dev
```

### Model Not Found
```bash
# Check available models
curl http://localhost:8000/api/v4/models/available

# Refresh model registry after training new models
curl -X POST http://localhost:8000/api/v4/refresh
```

### Slow Predictions
```bash
# Check cache statistics
curl http://localhost:8000/api/v4/stats

# Clear cache if needed
curl -X POST http://localhost:8000/api/v4/cache/clear
```

---

## Next Steps

1. ✅ Integrate V4 API into your components
2. ✅ Test with real stock data
3. ✅ Monitor cache hit rates
4. 📋 Add error boundaries for API failures
5. 📋 Implement loading states
6. 📋 Add prediction history tracking
7. 📋 Set up monitoring/alerting

---

## Support

- **API Documentation**: http://localhost:8000/api/v4/docs
- **Model Training Guide**: `../../ml/PHASE3_TRAINING_COMPLETE.md`
- **Technical Details**: `../../ml/HYBRID_SYSTEM_COMPLETE.md`
- **Original Integration Guide**: `../../ml/FRONTEND_INTEGRATION_GUIDE.md`

---

**Last Updated:** November 18, 2024  
**Model Version:** v4_log_hybrid  
**Status:** ✅ Production Ready
