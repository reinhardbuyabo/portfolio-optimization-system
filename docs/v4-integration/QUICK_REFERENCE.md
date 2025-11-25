# V4 Model Integration - Quick Reference

**Version:** v4_log_hybrid | **Date:** 2024-11-18 | **Status:** ✅ Ready

---

## 🚀 Quick Start

```bash
# 1. Start ML Service
cd ml && tox -e serve-dev

# 2. Start Next.js
npm run dev

# 3. Test Integration
./test-v4-integration.sh
```

---

## 📊 Available Models

- **Stock-Specific (5):** SCOM, EQTY, KCB, BAMB, EABL (MAPE: 2-9%)
- **General Model (50+):** All other NSE stocks (MAPE: ~4.5%)

---

## 🔌 API Endpoints

### Health Check
```typescript
GET /api/ml/v4/health
// Returns: { status, total_coverage, specific_models, ... }
```

### Available Models
```typescript
GET /api/ml/v4/models
// Returns: { available_stocks: string[], cache_stats, ... }
```

### Single Prediction
```typescript
POST /api/ml/v4/predict
Body: { symbol, horizon: '1d'|'5d'|'10d'|'30d', recent_prices: number[] }
// Returns: { prediction, mape, model_version, cached, ... }
```

### Batch Prediction
```typescript
POST /api/ml/v4/predict/batch
Body: { symbols: string[], horizon, recent_prices: number[] }
// Returns: { predictions: [], summary: { total, successful, ... } }
```

---

## 💻 Code Examples

### Health Check
```typescript
const res = await fetch('/api/ml/v4/health');
const { status, total_coverage } = await res.json();
```

### Get Models
```typescript
const res = await fetch('/api/ml/v4/models');
const { available_stocks } = await res.json();
```

### Predict
```typescript
const res = await fetch('/api/ml/v4/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbol: 'SCOM',
    horizon: '10d',
    recent_prices: [...60 prices...]
  })
});
const { prediction, mape } = await res.json();
```

### Batch Predict
```typescript
const res = await fetch('/api/ml/v4/predict/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: ['SCOM', 'EQTY', 'KCB'],
    horizon: '10d',
    recent_prices: [...60 prices...]
  })
});
const { predictions } = await res.json();
```

---

## 🎯 Using ML Client

```typescript
import { mlClient } from '@/lib/api/ml-client';

// Health
const health = await mlClient.checkHealthV4();

// Models
const models = await mlClient.getAvailableModelsV4();

// Single
const pred = await mlClient.predictStockV4({
  symbol: 'SCOM',
  horizon: '10d',
  recent_prices: [...]
});

// Batch
const batch = await mlClient.predictBatchV4({
  symbols: ['SCOM', 'EQTY'],
  horizon: '10d',
  recent_prices: [...]
});
```

---

## 🎨 React Component

```typescript
'use client';
import { useState } from 'react';

export function StockPredictor({ symbol, prices }) {
  const [pred, setPred] = useState(null);
  
  const predict = async () => {
    const res = await fetch('/api/ml/v4/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol,
        horizon: '10d',
        recent_prices: prices
      })
    });
    setPred(await res.json());
  };
  
  return (
    <div>
      <button onClick={predict}>Predict</button>
      {pred && <div>{pred.prediction} KES</div>}
    </div>
  );
}
```

---

## ⚡ Performance

- Cached: <30ms
- Uncached Specific: <150ms
- Uncached General: <130ms
- Batch (5 stocks): <500ms

---

## 🐛 Troubleshooting

### ML Service Down
```bash
curl http://localhost:8000/api/v4/health
# If fails: cd ml && tox -e serve-dev
```

### No Models
```bash
curl http://localhost:8000/api/v4/models/available
# Check trained_models directories exist
```

### TypeScript Errors
```bash
npm run build
# Check types/ml-api.ts for type definitions
```

---

## 📚 Documentation

- **Full Guide:** `INTEGRATION_GUIDE.md`
- **Summary:** `SUMMARY.md`
- **API Docs:** http://localhost:8000/api/v4/docs

---

## ✅ Checklist

- [ ] ML service running (`tox -e serve-dev`)
- [ ] Next.js running (`npm run dev`)
- [ ] Health check passes
- [ ] Models available (55+ stocks)
- [ ] Test predictions working
- [ ] Components integrated
- [ ] Error handling added
- [ ] Loading states implemented

---

## 🔑 Key Files

```
types/ml-api.ts              ← Type definitions
lib/api/ml-client.ts         ← API client
app/api/ml/v4/health/        ← Health endpoint
app/api/ml/v4/models/        ← Models endpoint
app/api/ml/v4/predict/       ← Prediction endpoint
app/api/ml/v4/predict/batch/ ← Batch endpoint
```

---

## 💡 Tips

1. **Use batch for multiple stocks** - Much faster than individual calls
2. **Check cache hit rate** - High rate = good performance
3. **Monitor MAPE** - Lower is better (specific < 10%, general ~4.5%)
4. **Handle errors gracefully** - Network issues, model not found, etc.
5. **Use TypeScript** - Full type safety with autocomplete

---

**Ready to integrate!** 🎉

See `INTEGRATION_GUIDE.md` for detailed examples.
