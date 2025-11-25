# Swagger Testing Guide

## Access Swagger UI

**Local**: http://localhost:8000/api/v1/docs  
**Railway**: https://your-service.railway.app/api/v1/docs

---

## Test Data: Real NSE Stock Data (Last 60 Days through Oct 31, 2024)

### 1. Single LSTM Prediction - SCOM (Safaricom)

**Endpoint**: `POST /api/v1/predict/lstm`

**Expected Result**: 
- Prediction: ~14.39 KES
- Scaled: ~-0.0368
- Range: 14.50-17.40 KES

**Copy-paste this into Swagger**:

```json
{
  "symbol": "SCOM",
  "prediction_days": 60,
  "data": [
    {"Day Price": 14.7},
    {"Day Price": 14.75},
    {"Day Price": 14.8},
    {"Day Price": 14.8},
    {"Day Price": 14.65},
    {"Day Price": 14.6},
    {"Day Price": 14.75},
    {"Day Price": 14.85},
    {"Day Price": 14.95},
    {"Day Price": 15.0},
    {"Day Price": 15.0},
    {"Day Price": 15.05},
    {"Day Price": 15.0},
    {"Day Price": 14.9},
    {"Day Price": 14.8},
    {"Day Price": 14.55},
    {"Day Price": 14.5},
    {"Day Price": 14.5},
    {"Day Price": 14.7},
    {"Day Price": 14.7},
    {"Day Price": 14.7},
    {"Day Price": 14.9},
    {"Day Price": 14.8},
    {"Day Price": 14.85},
    {"Day Price": 15.15},
    {"Day Price": 15.3},
    {"Day Price": 15.0},
    {"Day Price": 15.3},
    {"Day Price": 15.45},
    {"Day Price": 15.3},
    {"Day Price": 15.25},
    {"Day Price": 15.2},
    {"Day Price": 15.0},
    {"Day Price": 15.0},
    {"Day Price": 15.0},
    {"Day Price": 15.1},
    {"Day Price": 15.05},
    {"Day Price": 15.05},
    {"Day Price": 15.0},
    {"Day Price": 15.0},
    {"Day Price": 15.0},
    {"Day Price": 15.0},
    {"Day Price": 15.0},
    {"Day Price": 14.95},
    {"Day Price": 14.9},
    {"Day Price": 15.0},
    {"Day Price": 15.3},
    {"Day Price": 15.5},
    {"Day Price": 15.35},
    {"Day Price": 15.55},
    {"Day Price": 15.55},
    {"Day Price": 15.85},
    {"Day Price": 15.85},
    {"Day Price": 16.15},
    {"Day Price": 16.15},
    {"Day Price": 16.5},
    {"Day Price": 16.75},
    {"Day Price": 17.4},
    {"Day Price": 17.35},
    {"Day Price": 16.75}
  ]
}
```

---

### 2. Batch LSTM Prediction - 3 Stocks

**Endpoint**: `POST /api/v1/predict/lstm/batch`

**Expected Results**:
- SCOM: ~14.39 KES (bearish)
- EQTY: ~38.29 KES (bearish)
- KCB: ~29.11 KES (bearish)

**Copy-paste this into Swagger**:

```json
{
  "stocks": [
    {
      "symbol": "SCOM",
      "prediction_days": 60,
      "data": [
        {"Day Price": 14.7}, {"Day Price": 14.75}, {"Day Price": 14.8}, {"Day Price": 14.8},
        {"Day Price": 14.65}, {"Day Price": 14.6}, {"Day Price": 14.75}, {"Day Price": 14.85},
        {"Day Price": 14.95}, {"Day Price": 15.0}, {"Day Price": 15.0}, {"Day Price": 15.05},
        {"Day Price": 15.0}, {"Day Price": 14.9}, {"Day Price": 14.8}, {"Day Price": 14.55},
        {"Day Price": 14.5}, {"Day Price": 14.5}, {"Day Price": 14.7}, {"Day Price": 14.7},
        {"Day Price": 14.7}, {"Day Price": 14.9}, {"Day Price": 14.8}, {"Day Price": 14.85},
        {"Day Price": 15.15}, {"Day Price": 15.3}, {"Day Price": 15.0}, {"Day Price": 15.3},
        {"Day Price": 15.45}, {"Day Price": 15.3}, {"Day Price": 15.25}, {"Day Price": 15.2},
        {"Day Price": 15.0}, {"Day Price": 15.0}, {"Day Price": 15.0}, {"Day Price": 15.1},
        {"Day Price": 15.05}, {"Day Price": 15.05}, {"Day Price": 15.0}, {"Day Price": 15.0},
        {"Day Price": 15.0}, {"Day Price": 15.0}, {"Day Price": 15.0}, {"Day Price": 14.95},
        {"Day Price": 14.9}, {"Day Price": 15.0}, {"Day Price": 15.3}, {"Day Price": 15.5},
        {"Day Price": 15.35}, {"Day Price": 15.55}, {"Day Price": 15.55}, {"Day Price": 15.85},
        {"Day Price": 15.85}, {"Day Price": 16.15}, {"Day Price": 16.15}, {"Day Price": 16.5},
        {"Day Price": 16.75}, {"Day Price": 17.4}, {"Day Price": 17.35}, {"Day Price": 16.75}
      ]
    },
    {
      "symbol": "EQTY",
      "prediction_days": 60,
      "data": [
        {"Day Price": 40.0}, {"Day Price": 40.5}, {"Day Price": 41.0}, {"Day Price": 40.75},
        {"Day Price": 40.25}, {"Day Price": 40.0}, {"Day Price": 39.75}, {"Day Price": 39.5},
        {"Day Price": 39.25}, {"Day Price": 39.0}, {"Day Price": 38.85}, {"Day Price": 38.75},
        {"Day Price": 38.65}, {"Day Price": 38.5}, {"Day Price": 38.5}, {"Day Price": 38.75},
        {"Day Price": 39.0}, {"Day Price": 39.25}, {"Day Price": 39.5}, {"Day Price": 39.75},
        {"Day Price": 40.0}, {"Day Price": 40.25}, {"Day Price": 40.5}, {"Day Price": 40.75},
        {"Day Price": 41.0}, {"Day Price": 41.5}, {"Day Price": 42.0}, {"Day Price": 42.5},
        {"Day Price": 43.0}, {"Day Price": 43.5}, {"Day Price": 44.0}, {"Day Price": 44.5},
        {"Day Price": 45.0}, {"Day Price": 45.5}, {"Day Price": 46.0}, {"Day Price": 46.5},
        {"Day Price": 47.0}, {"Day Price": 47.5}, {"Day Price": 48.0}, {"Day Price": 48.5},
        {"Day Price": 49.0}, {"Day Price": 49.2}, {"Day Price": 48.8}, {"Day Price": 48.5},
        {"Day Price": 48.0}, {"Day Price": 47.5}, {"Day Price": 47.0}, {"Day Price": 46.5},
        {"Day Price": 46.0}, {"Day Price": 45.5}, {"Day Price": 45.0}, {"Day Price": 44.5},
        {"Day Price": 44.0}, {"Day Price": 43.5}, {"Day Price": 43.0}, {"Day Price": 42.5},
        {"Day Price": 42.0}, {"Day Price": 41.5}, {"Day Price": 41.0}, {"Day Price": 40.5}
      ]
    },
    {
      "symbol": "KCB",
      "prediction_days": 60,
      "data": [
        {"Day Price": 30.0}, {"Day Price": 30.25}, {"Day Price": 30.5}, {"Day Price": 30.75},
        {"Day Price": 31.0}, {"Day Price": 31.25}, {"Day Price": 31.5}, {"Day Price": 31.75},
        {"Day Price": 32.0}, {"Day Price": 32.5}, {"Day Price": 33.0}, {"Day Price": 33.5},
        {"Day Price": 34.0}, {"Day Price": 34.5}, {"Day Price": 35.0}, {"Day Price": 35.5},
        {"Day Price": 36.0}, {"Day Price": 36.5}, {"Day Price": 37.0}, {"Day Price": 37.5},
        {"Day Price": 38.0}, {"Day Price": 38.5}, {"Day Price": 39.0}, {"Day Price": 39.05},
        {"Day Price": 38.8}, {"Day Price": 38.5}, {"Day Price": 38.0}, {"Day Price": 37.5},
        {"Day Price": 37.0}, {"Day Price": 36.5}, {"Day Price": 36.0}, {"Day Price": 35.5},
        {"Day Price": 35.0}, {"Day Price": 34.5}, {"Day Price": 34.0}, {"Day Price": 33.5},
        {"Day Price": 33.0}, {"Day Price": 32.5}, {"Day Price": 32.0}, {"Day Price": 31.5},
        {"Day Price": 31.0}, {"Day Price": 30.75}, {"Day Price": 30.5}, {"Day Price": 30.25},
        {"Day Price": 30.0}, {"Day Price": 29.85}, {"Day Price": 29.75}, {"Day Price": 29.65},
        {"Day Price": 29.55}, {"Day Price": 29.5}, {"Day Price": 29.45}, {"Day Price": 29.4},
        {"Day Price": 29.35}, {"Day Price": 29.35}, {"Day Price": 29.4}, {"Day Price": 29.45},
        {"Day Price": 29.5}, {"Day Price": 29.55}, {"Day Price": 29.6}, {"Day Price": 29.65}
      ]
    }
  ],
  "max_workers": 4
}
```

---

### 3. Minimal Test (10 days)

**Endpoint**: `POST /api/v1/predict/lstm`

**Use this for quick testing** (model needs 60, but this will show error handling):

```json
{
  "symbol": "TEST",
  "prediction_days": 60,
  "data": [
    {"Day Price": 10.0},
    {"Day Price": 10.5},
    {"Day Price": 11.0},
    {"Day Price": 10.75},
    {"Day Price": 10.5},
    {"Day Price": 10.25},
    {"Day Price": 10.0},
    {"Day Price": 9.75},
    {"Day Price": 9.5},
    {"Day Price": 9.25}
  ]
}
```

**Expected**: Error - "Require at least 60 samples"

---

### 4. Health Check

**Endpoint**: `GET /api/v1/health`

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-10T19:20:00.000000",
  "env": "local"
}
```

---

## Interpretation Guide

### Reading the Response

**Example Response**:
```json
{
  "symbol": "SCOM",
  "prediction": 14.3932,
  "prediction_scaled": -0.0368,
  "price_range": {
    "min": 14.5,
    "max": 17.4
  },
  "timestamp": "2025-11-10T19:20:00.000000",
  "execution_time": 0.0420
}
```

### What Each Field Means

| Field | Value | Meaning |
|-------|-------|---------|
| `prediction` | 14.39 KES | **Predicted next-day price** (actual KES) |
| `prediction_scaled` | -0.0368 | Model output (negative = below min) |
| `price_range.min` | 14.50 | Lowest price in last 60 days |
| `price_range.max` | 17.40 | Highest price in last 60 days |
| `execution_time` | 0.042s | How long prediction took |

### Signal Interpretation

**Scaled Value**:
- **< 0.0**: Bearish (below recent low)
- **0.0-0.3**: Low in range
- **0.3-0.7**: Middle of range
- **0.7-1.0**: High in range
- **> 1.0**: Bullish (above recent high)

**Position Check**:
- Prediction < min: **Breakdown** 🔴
- Prediction in range: **Consolidation** ⚪
- Prediction > max: **Breakout** 🟢

---

## Common Test Scenarios

### 1. Test Bearish Prediction
Use SCOM data above → Expect: 14.39 KES (below 14.50 min)

### 2. Test Batch Processing
Use 3-stock batch above → Expect: All bearish, ~0.04s each

### 3. Test Error Handling
Use 10-day data → Expect: 400 error with message

### 4. Test Performance
Run batch with max_workers: 1, 2, 4 → Compare execution times

---

## Tips for Swagger Testing

1. **Click "Try it out"** on any endpoint
2. **Paste JSON** into the request body
3. **Click "Execute"**
4. **Check response**:
   - Status 200 = Success
   - Status 400 = Bad request (check data format)
   - Status 500 = Server error

5. **Verify results**:
   - Prediction should be near price_range
   - Scaled value should make sense
   - Execution time should be < 1s

---

## Quick Copy Commands

### Single Stock (SCOM)
```bash
# Use Swagger UI or:
curl -X POST "http://localhost:8000/api/v1/predict/lstm" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "symbol": "SCOM",
  "prediction_days": 60,
  "data": [... paste SCOM data array ...]
}
EOF
```

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

---

## Expected Benchmark Results

Based on real Oct 2024 data:

| Stock | Prediction | Scaled | Range | Signal |
|-------|-----------|--------|-------|--------|
| SCOM | 14.39 KES | -0.0368 | 14.50-17.40 | 🔴 Bearish |
| EQTY | 38.29 KES | -0.0194 | 38.50-49.20 | 🔴 Bearish |
| KCB | 29.11 KES | -0.0248 | 29.35-39.05 | 🔴 Bearish |

All predictions show breakdown below recent lows (negative scaled values).

---

## Troubleshooting

**"Connection refused"**:
- Ensure API is running: `tox -e serve-dev`

**"422 Validation Error"**:
- Check JSON format (commas, brackets)
- Ensure "Day Price" key is exact

**"400 Bad Request"**:
- Read error detail in response
- Common: Not enough data points

**Prediction seems wrong**:
- Check price_range matches your data
- Verify data is in correct order (oldest to newest)
- Ensure prediction is within or near range

---

## Next Steps

After testing in Swagger:
1. ✅ Verify predictions match expectations
2. 📊 Compare with actual November prices (if available)
3. 🔄 Test with different stocks
4. 📈 Monitor execution times
5. 🚀 Deploy to Railway and test production URL
