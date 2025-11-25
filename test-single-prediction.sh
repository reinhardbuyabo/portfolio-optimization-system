#!/bin/bash

# Simple single LSTM prediction request
# Modify the HORIZON and BASE_URL variables as needed

BASE_URL="${BASE_URL:-http://localhost:3000}"
SYMBOL="SCOM"
HORIZON=1  # Change this to test different horizons: 1, 3, 7, 30, 90, 180, 365

echo "Testing LSTM Prediction API"
echo "============================"
echo "URL: ${BASE_URL}/api/ml/lstm/predict"
echo "Symbol: ${SYMBOL}"
echo "Horizon: ${HORIZON} days"
echo ""

curl -X POST "${BASE_URL}/api/ml/lstm/predict" \
  -H "Content-Type: application/json" \
  -d '{
  "symbol": "SCOM",
  "horizon": '"$HORIZON"',
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
}' | jq '.'

echo ""
echo ""
echo "Current Price (last in data): 16.50 KES"
echo "Check that the response includes:"
echo "  - 'horizon': ${HORIZON}"
echo "  - 'prediction': <predicted price in KES>"
echo "  - 'execution_time': <time in seconds>"
