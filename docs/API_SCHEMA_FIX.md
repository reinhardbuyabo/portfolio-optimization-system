# API Schema Mismatch Fix

## Problem

The UI was getting **422 Unprocessable Content** errors when trying to make predictions through the ML API.

```
2025-11-11 00:31:14.498 | INFO | ml.api.main:dispatch:22 - POST /api/v1/predict/lstm completed in 0.0026s status=422
```

## Root Cause

**TypeScript types didn't match the actual Python API schemas:**

### LSTM API Mismatch

**Python API Expected:**
```python
class LSTMPredictionRequest(BaseModel):
    symbol: str
    data: List[Dict[str, Any]]  # [{'Day Price': 10.5}, {'Day Price': 10.8}, ...]
    prediction_days: int = 60
```

**TypeScript Was Sending:**
```typescript
{
  symbol: "SCOM",
  historical_prices: [10.5, 10.8, ...]  // Wrong field name and format!
}
```

### GARCH API Mismatch

**Python API Expected:**
```python
class GARCHVolatilityRequest(BaseModel):
    symbol: str
    log_returns: List[float]
    train_frac: float = 0.8
```

**TypeScript Was Sending:**
```typescript
{
  symbol: "SCOM",
  returns: [0.001, -0.002, ...]  // Wrong field name!
}
```

## Solution

### 1. Updated TypeScript Types (`types/ml-api.ts`)

**Before:**
```typescript
export interface LSTMPredictionRequest {
  symbol: string;
  historical_prices: number[];  // Wrong!
}

export interface GARCHVolatilityRequest {
  symbol: string;
  returns: number[];  // Wrong!
}
```

**After:**
```typescript
export interface LSTMPredictionRequest {
  symbol: string;
  data: Array<{ 'Day Price': number }>;  // Correct format
  prediction_days?: number;
}

export interface GARCHVolatilityRequest {
  symbol: string;
  log_returns: number[];  // Correct field name
  train_frac?: number;
}

export interface GARCHVolatilityResponse {
  symbol: string;
  forecasted_variance: number;
  realized_variance?: number;
  volatility_annualized: number;  // Calculated on frontend
  execution_time: number;
}
```

### 2. Updated ML Client (`lib/api/ml-client.ts`)

**Key Changes:**

#### LSTM Request Formatting
```typescript
// Convert prices array to API format
const formattedData = prices.map(price => ({ 'Day Price': price }));

this.predictLSTM({ 
  symbol, 
  data: formattedData,
  prediction_days: 60
})
```

#### GARCH Request + Response
```typescript
this.predictGARCH({ 
  symbol, 
  log_returns: returns,  // Correct field name
  train_frac: 0.8
})

// Calculate annualized volatility from daily variance
const volatility_annualized = Math.sqrt(garchData.forecasted_variance * 252);
results.garch = {
  ...garchData,
  volatility_annualized,
};
```

## Combined Fixes Summary

Today we fixed **two major issues**:

### Issue #1: Data Source Discrepancy
- **Problem**: UI reading only 2024 CSV, test script reading 2013-2024
- **Impact**: 16% prediction difference (16.75 vs 14.39 KES)
- **Fix**: Updated `ml-data-helper.ts` to load all historical CSV files
- **File**: `/lib/api/ml-data-helper.ts`

### Issue #2: API Schema Mismatch
- **Problem**: TypeScript types didn't match Python API schemas
- **Impact**: 422 errors, predictions failing in UI
- **Fix**: Corrected TypeScript types and request formatting
- **Files**: 
  - `/types/ml-api.ts`
  - `/lib/api/ml-client.ts`

## Testing

### Before Fixes:
```
❌ Test Script: 14.39 KES
❌ UI: 16.75 KES (using wrong data)
❌ UI API Call: 422 Unprocessable Content
```

### After Fixes:
```
✅ Test Script: 14.39 KES
✅ UI: 14.39 KES (using all historical data)
✅ UI API Call: 200 OK
✅ Predictions display correctly with confidence intervals
```

## Verification Steps

1. **Test LSTM Prediction:**
   ```bash
   cd ml
   python3 scripts/test_predictions.py single SCOM
   ```

2. **Test in UI:**
   - Navigate to Stock Analysis page
   - Select SCOM
   - Click "Run LSTM"
   - Verify prediction matches test script

3. **Test GARCH Prediction:**
   ```bash
   cd ml
   python3 scripts/test_garch_predictions.py single SCOM
   ```

4. **Check Browser Console:**
   - Should see no 422 errors
   - API calls should return 200 OK
   - Predictions should display with confidence intervals

## API Request Examples

### Correct LSTM Request:
```json
{
  "symbol": "SCOM",
  "data": [
    {"Day Price": 16.50},
    {"Day Price": 16.75},
    {"Day Price": 16.80},
    ...
  ],
  "prediction_days": 60
}
```

### Correct GARCH Request:
```json
{
  "symbol": "SCOM",
  "log_returns": [0.0015, -0.0023, 0.0018, ...],
  "train_frac": 0.8
}
```

## Files Modified

1. ✅ `/lib/api/ml-data-helper.ts` - Load all CSV files (2013-2024)
2. ✅ `/types/ml-api.ts` - Fix TypeScript interfaces
3. ✅ `/lib/api/ml-client.ts` - Format requests correctly
4. ✅ `/app/new/(newui)/stock-analysis/page.tsx` - Display predicted price with confidence intervals

## Impact

- ✅ **Accuracy**: Predictions now based on 11+ years of data
- ✅ **Consistency**: UI matches test scripts exactly
- ✅ **Reliability**: API calls succeed (200 OK)
- ✅ **User Experience**: Predicted prices display prominently with confidence intervals

## Date

November 10, 2025


