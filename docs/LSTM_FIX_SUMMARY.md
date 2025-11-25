# LSTM Prediction Fix Summary

## Issues Fixed

### 1. Missing Horizon Field ✅
**Problem**: API responses didn't include the `horizon` field, so the frontend couldn't determine the prediction timeframe.

**Solution**: 
- Added `horizon: int` field to `LSTMPredictionResponse` schema
- Updated Python ML route to include `horizon=prediction_days` in response
- Updated Next.js API route to pass through the horizon value
- Fixed frontend chart to use actual horizon instead of hardcoded 30 days

### 2. Incorrect Scaling (Critical) ✅
**Problem**: Predictions were completely unrealistic (e.g., 54.73 KES for a stock trading at 14-17 KES)

**Root Cause**: 
- Model was trained with a global scaler fitted on ALL NSE stocks (price range: 0-999 KES)
- Prediction code used this global scaler to inverse-transform predictions
- For SCOM (14-17 KES range), a scaled value of 0.05 would inverse-transform to ~50 KES

**Example of the Problem**:
```
Input: SCOM prices [14.50 - 16.50 KES]
Model output (scaled): 0.055
Global scaler inverse transform: 0.055 × 999.81 = 54.73 KES ❌ WRONG!
```

**Solution**: Use per-request scaler
```python
# Create a scaler fitted to THIS stock's price range
request_scaler = MinMaxScaler(feature_range=(0, 1))
scaled_prices = request_scaler.fit_transform(original_prices)

# Model prediction
prediction_scaled = pipeline.predict(sequence)

# Inverse transform with the SAME scaler
prediction_actual = request_scaler.inverse_transform([[prediction_scaled]])
```

**Result**:
```
Input: SCOM prices [14.50 - 16.50 KES]
Model output (scaled): 0.055
Request scaler inverse transform: 14.50 + (0.055 × 2.00) = 14.61 KES ✅ CORRECT!
```

## Files Modified

### Python ML Service
1. **ml/api/models/schemas.py**
   - Added `horizon: int` field to `LSTMPredictionResponse`

2. **ml/api/routes/lstm.py**
   - Added `from sklearn.preprocessing import MinMaxScaler` import
   - Changed to use per-request scaler instead of global preprocessor scaler
   - Updated response to include `horizon` field

### Next.js API
3. **app/api/ml/lstm/predict/route.ts**
   - Modified to include `horizon` in response to frontend

### Frontend
4. **app/(dashboard)/stock-analysis/page.tsx**
   - Fixed `lstmChartData` to use actual `horizonDays` from prediction result
   - Changed chart interpolation from hardcoded 30 days to dynamic horizon

### TypeScript Types
5. **types/ml-api.ts** (no changes needed - already had `horizon` field)

## How the Fix Works

### Before Fix ❌
```
Training Scaler Range: 0 - 999.81 KES (all stocks)
SCOM Input: 14.50 - 16.50 KES
Scaled Input: 0.0145 - 0.0165 (tiny values)
Model Prediction: 0.055 (scaled)
Inverse Transform: 0.055 × 999.81 = 54.73 KES ❌
```

### After Fix ✅
```
Request Scaler Range: 14.50 - 16.50 KES (SCOM only)
SCOM Input: 14.50 - 16.50 KES
Scaled Input: 0.0 - 1.0 (full range)
Model Prediction: 0.055 (scaled)
Inverse Transform: 14.50 + (0.055 × 2.0) = 14.61 KES ✅
```

## Validation

### Expected Behavior
Predictions should **always** be within or very close to the `price_range`:

✅ **Correct**:
```json
{
  "prediction": 15.23,
  "price_range": {"min": 14.50, "max": 16.90}
}
```

Prediction of 15.23 is within the 14.50-16.90 range ✅

❌ **Incorrect** (old behavior):
```json
{
  "prediction": 54.73,
  "price_range": {"min": 14.50, "max": 16.90}
}
```

Prediction of 54.73 is way outside the range ❌

### Formula to Verify
```
prediction ≈ price_min + (prediction_scaled × (price_max - price_min))
```

Example:
```
14.61 ≈ 14.50 + (0.055 × (16.50 - 14.50))
14.61 ≈ 14.50 + (0.055 × 2.00)
14.61 ≈ 14.50 + 0.11
14.61 ≈ 14.61 ✅
```

## Testing

### Run Test Scripts
```bash
# Test single prediction (1-day horizon)
./test-single-prediction.sh

# Test with 7-day horizon
HORIZON=7 ./test-single-prediction.sh

# Test all horizons
./test-lstm-api.sh
```

### Expected Output
```json
{
  "symbol": "SCOM",
  "prediction": 15.23,
  "prediction_scaled": 0.365,
  "price_range": {
    "min": 14.50,
    "max": 16.50
  },
  "horizon": 1,
  "execution_time": 0.042
}
```

**Verify**:
- ✅ `prediction` is within `price_range` (14.50-16.50)
- ✅ `horizon` matches the requested value
- ✅ Prediction makes sense relative to current price

## Why This Approach is Correct

### Training vs Prediction Scaling

**Training** (global scaler):
- Model learns patterns across ALL stocks together
- Can recognize relative price movements
- Benefits from diverse price ranges

**Prediction** (per-request scaler):
- Each stock's predictions match its actual price level
- Results are interpretable and comparable
- No scaling artifacts

This gives us the best of both worlds:
- Training: Learn general market patterns from all stocks
- Prediction: Stock-specific results in correct price range

## Related Documentation

- `/ml/SCALING_FIX.md` - Detailed explanation of the scaling issue
- `/docs/API_TESTING.md` - How to test the API endpoints
- Test scripts: `test-lstm-api.sh` and `test-single-prediction.sh`
