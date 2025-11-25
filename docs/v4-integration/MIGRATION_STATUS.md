# V4 API Migration Status

**Date:** November 19, 2024  
**Status:** Partial Migration Complete

---

## ✅ Updated Components

### Stock Analysis Page
**File:** `app/(dashboard)/stock-analysis/page.tsx`

- **Updated:** LSTM predictions now use `/api/ml/v4/predict`
- **Unchanged:** GARCH predictions still use `/api/ml/garch/predict` (V1)
- **Changes:**
  - V4 API with stock-specific and general models
  - Horizon mapping: 1d, 5d, 10d, 30d format
  - Uses `recent_prices` array instead of `data` object

### Batch Run Modal
**File:** `components/figma/BatchRunModal.tsx`

- **Updated:** Batch predictions now use `/api/ml/v4/predict/batch`
- **Changes:**
  - Fetches historical data first
  - Uses V4 request format
  - Transforms V4 response to match expected format
  - Better error handling

---

## 📋 Components Still Using V1 API

These components use the **combined LSTM+GARCH endpoint** (`/api/ml/predict`) which:
- ✅ Still works (backward compatible)
- ✅ Returns both LSTM and GARCH predictions
- ⚠️ Uses old LSTM model (not V4)

### 1. Market Quotes Table
**File:** `components/shared/market-quotes-table.tsx`

**Current Usage:**
- `/api/ml/prepare-data` - Prepares historical data
- `/api/ml/predict` - Combined LSTM+GARCH predictions

**Migration Priority:** Medium
**Reason:** Used in dashboard market quotes

### 2. Stock Table with ML
**File:** `components/figma/StockTableWithML.tsx`

**Current Usage:**
- `/api/ml/prepare-data` - Prepares historical data
- `/api/ml/predict` - Combined LSTM+GARCH predictions

**Migration Priority:** Medium
**Reason:** Used in various tables with ML features

### 3. ML Predictions Page
**File:** `app/(dashboard)/ml-predictions/page.tsx`

**Current Usage:**
- `/api/ml/predict/history` - Fetches historical predictions

**Migration Priority:** Low
**Reason:** History endpoint for viewing past predictions

---

## 🔄 Migration Options

### Option 1: Gradual Migration (Recommended)
**Status:** ✅ In Progress

Keep V1 endpoints functional while migrating key features to V4:

1. ✅ Stock Analysis page → V4 (DONE)
2. ✅ Batch predictions → V4 (DONE)
3. 📋 Market quotes → V4 (TODO)
4. 📋 Stock tables → V4 (TODO)
5. 📋 ML predictions history → Add V4 support (TODO)

**Benefits:**
- No breaking changes
- Can test V4 gradually
- Fallback to V1 if issues arise

### Option 2: Full Migration
**Status:** Not Started

Update all components to use V4 API exclusively:

**Steps:**
1. Update all LSTM calls to V4 API
2. Keep GARCH on V1 (or create V4 GARCH if needed)
3. Update response handling across all components
4. Remove V1 LSTM endpoints

**Benefits:**
- Consistent API usage
- Better performance (V4 caching)
- Higher accuracy (V4 models)

**Risks:**
- More testing required
- Potential breaking changes

### Option 3: Hybrid Approach (Current)
**Status:** ✅ Implemented

Keep both V1 and V4 endpoints available:

- Critical features use V4 (stock analysis, batch)
- Other features use V1 (market quotes, tables)
- Users get best of both worlds

**Benefits:**
- Maximum compatibility
- Gradual adoption
- No forced migration

---

## 📊 API Endpoint Comparison

### LSTM Predictions

| Feature | V1 API | V4 API | Status |
|---------|--------|--------|--------|
| Single Prediction | `/api/ml/lstm/predict` | `/api/ml/v4/predict` | V4 Active |
| Batch Prediction | `/api/ml/batch/predict` | `/api/ml/v4/predict/batch` | V4 Active |
| Model Type | General only | Stock-specific + General | V4 Better |
| Accuracy (MAPE) | ~15-20% | 2-9% (specific), ~4.5% (general) | V4 Better |
| Response Time | ~100-200ms | <30ms (cached) | V4 Faster |
| Horizons | Days (number) | '1d', '5d', '10d', '30d' | V4 Clearer |
| Request Format | `{ data: [{Day Price: x}] }` | `{ recent_prices: [x, y] }` | V4 Simpler |

### Combined LSTM+GARCH

| Feature | V1 API | V4 API | Status |
|---------|--------|--------|--------|
| Combined Endpoint | `/api/ml/predict` | N/A | V1 Only |
| Prepare Data | `/api/ml/prepare-data` | N/A | V1 Only |
| History | `/api/ml/predict/history` | `/api/ml/v4/predict/history` | V1 Only (V4 TODO) |

---

## 🎯 Recommendations

### Immediate Actions
1. ✅ Keep current hybrid approach
2. ✅ Monitor V4 performance in stock analysis
3. ✅ Monitor V4 batch predictions
4. 📋 Consider migrating market quotes to V4
5. 📋 Add V4 prediction history endpoint

### Future Enhancements
1. Create V4 combined endpoint (`/api/ml/v4/predict/combined`)
2. Add V4 data preparation endpoint
3. Migrate all components to V4
4. Deprecate V1 endpoints (with warning period)
5. Remove V1 endpoints after migration complete

### Testing Checklist
- [x] Stock Analysis - LSTM predictions working
- [x] Stock Analysis - GARCH predictions working
- [x] Batch predictions working
- [ ] Market quotes with V4
- [ ] Stock tables with V4
- [ ] Historical predictions with V4

---

## 📝 Migration Guide for Developers

### Converting V1 to V4 (LSTM)

**V1 Request:**
```typescript
const response = await fetch('/api/ml/lstm/predict', {
  method: 'POST',
  body: JSON.stringify({
    symbol: 'SCOM',
    data: historicalData.map(p => ({ 'Day Price': p.price }))
  })
});
```

**V4 Request:**
```typescript
const response = await fetch('/api/ml/v4/predict', {
  method: 'POST',
  body: JSON.stringify({
    symbol: 'SCOM',
    horizon: '10d',
    recent_prices: historicalData.slice(-60).map(p => p.price)
  })
});
```

**V1 Response:**
```json
{
  "symbol": "SCOM",
  "prediction": 16.24,
  "prediction_scaled": 0.42,
  "price_range": { "min": 10, "max": 25 },
  "execution_time": 0.15
}
```

**V4 Response:**
```json
{
  "symbol": "SCOM",
  "prediction": 16.24,
  "horizon": "10d",
  "mape": 8.95,
  "model_version": "v4_log_stock_specific",
  "execution_time": 0.03,
  "cached": true,
  "timestamp": "2024-11-19T08:00:00.000Z"
}
```

---

## 🔗 Related Documentation

- **V4 Integration Guide:** `docs/v4-integration/INTEGRATION_GUIDE.md`
- **V4 Quick Reference:** `docs/v4-integration/QUICK_REFERENCE.md`
- **V4 API Summary:** `docs/v4-integration/SUMMARY.md`
- **Model Training:** `ml/PHASE3_TRAINING_COMPLETE.md`

---

## 📈 Migration Progress

```
Total Components: 5
Migrated to V4:   2 (40%)
Still on V1:      3 (60%)

Critical Features Migrated: ✅ 100%
Non-Critical: 📋 Pending
```

---

**Last Updated:** November 19, 2024  
**Status:** Hybrid approach active, gradual migration in progress
