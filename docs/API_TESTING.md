# LSTM API Testing Scripts

This directory contains scripts to test the LSTM prediction API endpoint.

## Prerequisites

- `jq` command-line JSON processor (for formatted output)
- `curl` for making HTTP requests
- ML service running (FastAPI backend)
- Next.js app running (frontend/API gateway)

Install jq if needed:
```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq
```

## Scripts

### 1. `test-single-prediction.sh` - Simple Single Request

Tests a single prediction request with a specific horizon.

**Usage:**
```bash
# Test with default settings (1-day prediction)
./test-single-prediction.sh

# Test with custom horizon (e.g., 7 days)
HORIZON=7 ./test-single-prediction.sh

# Test with custom URL
BASE_URL=http://localhost:3000 HORIZON=30 ./test-single-prediction.sh
```

**Modify the script:**
Edit the `HORIZON` variable at the top of the file to test different timeframes:
- `HORIZON=1` - 1 day (1D)
- `HORIZON=3` - 3 days (3D)
- `HORIZON=7` - 1 week (1W)
- `HORIZON=30` - 1 month (1M)
- `HORIZON=90` - 3 months (3M)
- `HORIZON=180` - 6 months (6M)
- `HORIZON=365` - 1 year (1Y)

### 2. `test-lstm-api.sh` - Comprehensive Multi-Horizon Test

Tests multiple prediction horizons automatically and displays results for comparison.

**Usage:**
```bash
# Run all tests
./test-lstm-api.sh

# With custom URL
BASE_URL=http://localhost:3000 ./test-lstm-api.sh
```

## Expected Response Format

The API should return JSON with the following structure:

```json
{
  "symbol": "SCOM",
  "prediction": 16.75,
  "prediction_scaled": 0.8234,
  "price_range": {
    "min": 14.40,
    "max": 16.90
  },
  "horizon": 1,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "execution_time": 0.045
}
```

### Key Fields to Verify

1. **`horizon`**: Should match the requested horizon (1, 3, 7, 30, etc.)
   - This is the critical field that was missing before the fix
   - Indicates how many days ahead the prediction is for

2. **`prediction`**: The predicted price in KES
   - Should be different for different horizons
   - Compare with current price (16.50 KES in test data)

3. **`symbol`**: Should match the requested stock symbol (SCOM)

4. **`execution_time`**: Time taken for prediction in seconds

## Test Data

The scripts use real historical SCOM (Safaricom Plc) closing prices from NSE 2024:
- 60 days of historical data
- Latest price: **16.50 KES**
- Price range: 14.40 - 16.90 KES

## Troubleshooting

### ML Service Not Running
```bash
cd ml
python -m uvicorn api.main:app --reload --port 8000
```

### Next.js App Not Running
```bash
npm run dev
```

### Port Conflicts
If using different ports, set the `BASE_URL`:
```bash
BASE_URL=http://localhost:4000 ./test-single-prediction.sh
```

### jq Not Installed
The scripts will work without `jq`, but the output won't be formatted. Install it for better readability.

## Example Output

```
Testing LSTM Prediction API
============================
URL: http://localhost:3000/api/ml/lstm/predict
Symbol: SCOM
Horizon: 1 days

{
  "symbol": "SCOM",
  "prediction": 16.52,
  "prediction_scaled": 0.8245,
  "price_range": {
    "min": 14.40,
    "max": 16.90
  },
  "horizon": 1,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "execution_time": 0.042
}

Current Price (last in data): 16.50 KES
Check that the response includes:
  - 'horizon': 1
  - 'prediction': 16.52 (predicted price in KES)
  - 'execution_time': 0.042 (time in seconds)
```

## Using with Postman

If you prefer Postman, use these settings:

**Request:**
- Method: `POST`
- URL: `http://localhost:3000/api/ml/lstm/predict`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "symbol": "SCOM",
  "horizon": 1,
  "data": [
    {"Day Price": 14.50},
    {"Day Price": 14.65},
    {"Day Price": 14.75},
    {"Day Price": 14.70},
    {"Day Price": 14.55},
    {"Day Price": 14.55},
    {"Day Price": 14.60},
    {"Day Price": 14.70},
    {"Day Price": 14.85},
    {"Day Price": 14.95},
    {"Day Price": 14.90},
    {"Day Price": 15.00},
    {"Day Price": 15.00},
    {"Day Price": 14.80},
    {"Day Price": 14.50},
    {"Day Price": 14.40},
    {"Day Price": 14.40},
    {"Day Price": 14.40},
    {"Day Price": 14.50},
    {"Day Price": 14.50},
    {"Day Price": 14.50},
    {"Day Price": 14.75},
    {"Day Price": 14.70},
    {"Day Price": 14.70},
    {"Day Price": 14.90},
    {"Day Price": 15.20},
    {"Day Price": 14.90},
    {"Day Price": 15.00},
    {"Day Price": 15.05},
    {"Day Price": 15.20},
    {"Day Price": 15.10},
    {"Day Price": 15.10},
    {"Day Price": 14.90},
    {"Day Price": 14.95},
    {"Day Price": 14.95},
    {"Day Price": 14.95},
    {"Day Price": 15.00},
    {"Day Price": 14.95},
    {"Day Price": 14.95},
    {"Day Price": 14.95},
    {"Day Price": 14.90},
    {"Day Price": 14.95},
    {"Day Price": 14.95},
    {"Day Price": 14.90},
    {"Day Price": 14.85},
    {"Day Price": 14.90},
    {"Day Price": 15.00},
    {"Day Price": 15.20},
    {"Day Price": 15.20},
    {"Day Price": 15.40},
    {"Day Price": 15.40},
    {"Day Price": 15.50},
    {"Day Price": 15.60},
    {"Day Price": 15.90},
    {"Day Price": 15.60},
    {"Day Price": 16.10},
    {"Day Price": 16.50},
    {"Day Price": 16.90},
    {"Day Price": 16.85},
    {"Day Price": 16.50}
  ]
}
```

## Direct Python ML Service Testing

You can also test the Python ML service directly (bypassing Next.js):

```bash
curl -X POST "http://localhost:8000/api/v1/predict/lstm" \
  -H "Content-Type: application/json" \
  -d '{
  "symbol": "SCOM",
  "prediction_days": 1,
  "data": [
    {"Day Price": 14.50},
    {"Day Price": 14.65},
    ...
    {"Day Price": 16.50}
  ]
}' | jq '.'
```

Note: When testing the Python service directly, use `prediction_days` instead of `horizon`.

## Comparing Before and After the Fix

### Before Fix ❌
- Response did NOT include `horizon` field
- Frontend couldn't determine prediction timeframe
- Chart always interpolated over 30 days
- Confusing predictions for 1D, 3D, 7D horizons

### After Fix ✅
- Response includes `horizon` field matching request
- Frontend knows exact prediction timeframe
- Chart interpolates over correct number of days
- Clear, accurate predictions for all horizons
