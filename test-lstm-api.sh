#!/bin/bash

# LSTM Prediction API Test Script
# This script tests the LSTM prediction endpoint with different horizons
# Run this to verify the API returns the correct horizon in the response

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
SYMBOL="SCOM"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}LSTM Prediction API Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Base URL: ${GREEN}${BASE_URL}${NC}"
echo -e "Symbol: ${GREEN}${SYMBOL}${NC}"
echo ""

# Sample historical data (last 60 days of SCOM prices from NSE 2024)
HISTORICAL_DATA='[
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
]'

# Function to test a specific horizon
test_horizon() {
  local horizon=$1
  local horizon_name=$2
  
  echo -e "${YELLOW}Testing ${horizon_name} (${horizon} days)...${NC}"
  
  # Create request payload
  PAYLOAD=$(jq -n \
    --arg symbol "$SYMBOL" \
    --argjson horizon "$horizon" \
    --argjson data "$HISTORICAL_DATA" \
    '{symbol: $symbol, horizon: $horizon, data: $data}')
  
  # Make the request
  RESPONSE=$(curl -s -X POST \
    "${BASE_URL}/api/ml/lstm/predict" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")
  
  # Check if request was successful
  if echo "$RESPONSE" | jq -e '.prediction' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Success${NC}"
    echo "$RESPONSE" | jq '{
      symbol,
      prediction,
      horizon,
      price_range,
      execution_time
    }'
    echo ""
  else
    echo -e "\033[0;31m✗ Failed${NC}"
    echo "$RESPONSE" | jq '.'
    echo ""
  fi
}

# Test different horizons
echo -e "${BLUE}Testing different prediction horizons:${NC}"
echo ""

test_horizon 1 "1 Day (1D)"
test_horizon 3 "3 Days (3D)"
test_horizon 7 "1 Week (1W)"
test_horizon 30 "1 Month (1M)"
test_horizon 90 "3 Months (3M)"
test_horizon 180 "6 Months (6M)"
test_horizon 365 "1 Year (1Y)"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Test Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Key points to verify:"
echo "1. Each response should include a 'horizon' field matching the request"
echo "2. The 'prediction' field should show the predicted price"
echo "3. Current price (last in historical data): 16.50 KES"
echo "4. Compare predictions across different horizons"
echo ""
