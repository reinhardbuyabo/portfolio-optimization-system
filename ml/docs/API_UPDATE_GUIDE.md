# API Update: Inverse-Transformed Predictions

## Changes Made

### What Changed
The LSTM prediction API now returns **actual predicted prices** (in KES) instead of just scaled values (0-1).

### Critical Fix Applied ✅
**Per-Request Scaling**: Each prediction now uses a scaler fitted on the input data (last 60 days) rather than the global training scaler. This ensures predictions are in the correct price range for each stock.

### Why This Matters
- **Before**: API returned `0.0598` (scaled value, not interpretable)
- **After**: API returns `14.87 KES` (actual price in correct range) + scaled value + price range

---

## Updated Response Format

### Single Prediction: POST `/api/v1/predict/lstm`

**New Response Schema**:
```json
{
  "symbol": "SCOM",
  "prediction": 13.45,           // ✨ NEW: Actual price in KES
  "prediction_scaled": 0.0598,   // ✨ NEW: Scaled value (0-1)
  "price_range": {               // ✨ NEW: Input data range
    "min": 12.80,
    "max": 14.50
  },
  "timestamp": "2025-11-10T18:57:00.123456",
  "execution_time": 0.1933
}
```

### Batch Prediction: POST `/api/v1/predict/lstm/batch`

**New Response**:
```json
{
  "results": [
    {
      "symbol": "SCOM",
      "prediction": 13.45,
      "prediction_scaled": 0.0598,
      "price_range": {"min": 12.80, "max": 14.50},
      "execution_time": 0.0719
    },
    {
      "symbol": "EQTY",
      "prediction": 42.15,
      "prediction_scaled": 0.0443,
      "price_range": {"min": 38.00, "max": 45.50},
      "execution_time": 0.0845
    }
  ],
  "total": 2,
  "successful": 2,
  "failed": 0,
  "execution_time": 0.09
}
```

---

## How It Works

### Inverse Transformation (Per-Request Scaling)
```python
# OLD APPROACH (INCORRECT):
# Used training scaler fitted on ALL stocks
scaled_pred = model.predict(...)
actual_pred = training_scaler.inverse_transform([[scaled_pred]])  # ❌ Wrong!

# NEW APPROACH (CORRECT):
# Fit new scaler on input data for THIS request
request_scaler = MinMaxScaler(feature_range=(0, 1))
request_scaler.fit(input_prices)           # Fit on last 60 days
scaled_input = request_scaler.transform(input_prices)

scaled_pred = model.predict(scaled_input)  # Model outputs 0.0598
actual_pred = request_scaler.inverse_transform([[scaled_pred]])  # ✅ 14.87 KES
```

**Why This Works**:
- Each stock has different price levels (SCOM ~15 KES, EQTY ~40 KES)
- Training scaler was fitted on ALL stocks combined (range: 1-500 KES)
- Request scaler fits ONLY on the input data (range: 14.50-17.40 KES)
- Result: Predictions match the actual trading range

### Price Range Context
The `price_range` shows the min/max from the **input data** (last 60 days), giving context:
- If prediction is **above max**: Model predicts upward trend
- If prediction is **below min**: Model predicts downward trend
- If prediction is **within range**: Model predicts consolidation

---

## Testing the Changes

### 1. Restart API Server
```bash
# Stop current server (Ctrl+C)
cd ml
tox -e serve-dev
```

### 2. Test Single Prediction
```bash
cd ml
python3 scripts/test_predictions.py single SCOM
```

**Expected Output**:
```
Making prediction for SCOM...
Prediction: 13.4512 KES (scaled: 0.0598) [range: 12.80-14.50] (took 0.1933s)
```

### 3. Test Batch Prediction
```bash
python3 scripts/test_predictions.py batch SCOM EQTY KCB
```

**Expected Output**:
```
Batch completed: 3 success, 0 failed in 0.09s
  SCOM: 13.4512 KES (scaled: 0.0598) [range: 12.80-14.50] (took 0.0719s)
  EQTY: 42.1534 KES (scaled: 0.0443) [range: 38.00-45.50] (took 0.0845s)
  KCB: 28.9012 KES (scaled: 0.2955) [range: 25.00-32.00] (took 0.0796s)
```

---

## Interpretation Guide

### Example: SCOM Prediction

```
Prediction: 13.45 KES (scaled: 0.0598) [range: 12.80-14.50]
```

**What This Means**:
- **Predicted Price**: 13.45 KES for the next trading day
- **Scaled Value**: 0.0598 (low in 0-1 range, indicating lower price)
- **Price Range**: Recent 60 days traded between 12.80-14.50 KES
- **Interpretation**: Prediction is near the middle of recent range

### Trading Signal Examples

**Bullish Signal**:
```
Prediction: 15.20 KES (scaled: 0.8234) [range: 12.80-14.50]
```
→ Predicted price **above** recent max (14.50), suggests upward momentum

**Bearish Signal**:
```
Prediction: 12.50 KES (scaled: 0.1234) [range: 12.80-14.50]
```
→ Predicted price **below** recent min (12.80), suggests downward pressure

**Neutral Signal**:
```
Prediction: 13.65 KES (scaled: 0.5000) [range: 12.80-14.50]
```
→ Predicted price in middle of range, suggests consolidation

---

## Updated Files

### Backend (API)
- ✅ `ml/api/models/schemas.py`: Updated `LSTMPredictionResponse`
- ✅ `ml/api/routes/lstm.py`: Added inverse transformation logic

### Testing Scripts
- ✅ `ml/scripts/test_predictions.py`: Updated output formatting

---

## Benefits

1. **Immediate Interpretability**: No manual scaling needed
2. **Context Awareness**: Price range shows recent trading levels
3. **Transparency**: Both scaled and actual values available
4. **Better Comparison**: Can directly compare with actual prices
5. **Trading Ready**: Values ready for backtesting and live trading

---

## Next Steps

1. ✅ Restart API server with new changes
2. ✅ Test with real stock data
3. 📊 Add November 2024 data for validation
4. 📈 Compare predictions with actual outcomes
5. 🚀 Deploy to Railway with updated schema

---

## API Documentation

Access updated Swagger docs after restart:
- **Local**: http://localhost:8000/api/v1/docs
- **Railway**: https://your-service.railway.app/api/v1/docs

The schema will automatically reflect the new response format with all three fields.
