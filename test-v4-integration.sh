#!/bin/bash

# Test V4 Frontend Integration
# This script verifies that the V4 ML API integration is working correctly

set -e

echo "====================================="
echo "V4 Frontend Integration Test"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ML service is running
echo "1. Checking ML Service..."
if curl -s http://localhost:8000/api/v4/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} ML Service is running"
else
    echo -e "${RED}✗${NC} ML Service is NOT running"
    echo -e "${YELLOW}→${NC} Start it with: cd ml && tox -e serve-dev"
    exit 1
fi

# Test ML service health
echo ""
echo "2. Testing ML Service Health..."
HEALTH=$(curl -s http://localhost:8000/api/v4/health)
STATUS=$(echo $HEALTH | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$STATUS" = "healthy" ]; then
    echo -e "${GREEN}✓${NC} ML Service is healthy"
    COVERAGE=$(echo $HEALTH | grep -o '"total_coverage":[0-9]*' | cut -d':' -f2)
    SPECIFIC=$(echo $HEALTH | grep -o '"specific_models":[0-9]*' | cut -d':' -f2)
    GENERAL=$(echo $HEALTH | grep -o '"general_model_stocks":[0-9]*' | cut -d':' -f2)
    echo "  - Total coverage: $COVERAGE stocks"
    echo "  - Stock-specific models: $SPECIFIC"
    echo "  - General model stocks: $GENERAL"
else
    echo -e "${RED}✗${NC} ML Service is unhealthy"
    exit 1
fi

# Test available models
echo ""
echo "3. Testing Available Models..."
MODELS=$(curl -s http://localhost:8000/api/v4/models/available)
TRAINED=$(echo $MODELS | grep -o '"trained_models":[0-9]*' | cut -d':' -f2)
if [ ! -z "$TRAINED" ] && [ "$TRAINED" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} $TRAINED models available"
else
    echo -e "${RED}✗${NC} No models available"
    exit 1
fi

# Test single prediction
echo ""
echo "4. Testing Single Stock Prediction (SCOM)..."
PREDICTION=$(curl -s -X POST http://localhost:8000/api/v4/predict \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "SCOM",
    "horizon": "10d",
    "recent_prices": [16.5,16.8,16.7,16.9,17.0,17.1,16.9,17.2,17.0,16.8,16.9,17.1,17.3,17.2,17.0,16.8,16.9,17.0,17.2,17.1,16.9,17.0,17.2,17.3,17.1,16.9,17.0,17.2,17.1,16.8,16.9,17.1,17.0,16.8,16.9,17.2,17.3,17.1,16.9,17.0,17.1,17.2,17.0,16.8,16.9,17.1,17.3,17.2,17.0,16.9,17.1,17.2,17.0,16.8,16.9,17.0,17.2,17.1,16.9,16.8]
  }')

PRED_PRICE=$(echo $PREDICTION | grep -o '"prediction":[0-9.]*' | cut -d':' -f2)
MODEL_VERSION=$(echo $PREDICTION | grep -o '"model_version":"[^"]*"' | cut -d'"' -f4)
MAPE=$(echo $PREDICTION | grep -o '"mape":[0-9.]*' | cut -d':' -f2)

if [ ! -z "$PRED_PRICE" ]; then
    echo -e "${GREEN}✓${NC} Prediction successful"
    echo "  - Predicted price: $PRED_PRICE KES"
    echo "  - Model version: $MODEL_VERSION"
    echo "  - MAPE: $MAPE%"
else
    echo -e "${RED}✗${NC} Prediction failed"
    echo "Response: $PREDICTION"
    exit 1
fi

# Test batch prediction
echo ""
echo "5. Testing Batch Prediction..."
BATCH=$(curl -s -X POST http://localhost:8000/api/v4/predict/batch \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["SCOM", "EQTY", "KCB"],
    "horizon": "10d",
    "recent_prices": [17.0,17.1,16.9,17.2,17.0,16.8,16.9,17.1,17.3,17.2,17.0,16.8,16.9,17.0,17.2,17.1,16.9,17.0,17.2,17.3,17.1,16.9,17.0,17.2,17.1,16.8,16.9,17.1,17.0,16.8,16.9,17.2,17.3,17.1,16.9,17.0,17.1,17.2,17.0,16.8,16.9,17.1,17.3,17.2,17.0,16.9,17.1,17.2,17.0,16.8,16.9,17.0,17.2,17.1,16.9,16.8,16.5,16.8,16.7,16.9]
  }')

SUCCESSFUL=$(echo $BATCH | grep -o '"successful":[0-9]*' | cut -d':' -f2)
TOTAL=$(echo $BATCH | grep -o '"total":[0-9]*' | cut -d':' -f2)

if [ "$SUCCESSFUL" = "$TOTAL" ] && [ "$TOTAL" = "3" ]; then
    echo -e "${GREEN}✓${NC} Batch prediction successful ($SUCCESSFUL/$TOTAL)"
else
    echo -e "${RED}✗${NC} Batch prediction partial or failed ($SUCCESSFUL/$TOTAL)"
    exit 1
fi

# Check if Next.js is running
echo ""
echo "6. Checking Next.js Frontend..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Next.js is running"
    
    # Test Next.js API routes
    echo ""
    echo "7. Testing Next.js V4 API Routes..."
    
    # Test health endpoint
    if curl -s http://localhost:3000/api/ml/v4/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} /api/ml/v4/health is accessible"
    else
        echo -e "${YELLOW}!${NC} /api/ml/v4/health endpoint not accessible"
    fi
    
    # Test models endpoint
    if curl -s http://localhost:3000/api/ml/v4/models > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} /api/ml/v4/models is accessible"
    else
        echo -e "${YELLOW}!${NC} /api/ml/v4/models endpoint not accessible"
    fi
else
    echo -e "${YELLOW}!${NC} Next.js is NOT running"
    echo -e "${YELLOW}→${NC} Start it with: npm run dev"
    echo -e "${YELLOW}→${NC} Skipping Next.js API tests"
fi

echo ""
echo "====================================="
echo -e "${GREEN}✓ V4 Integration Test Complete!${NC}"
echo "====================================="
echo ""
echo "Summary:"
echo "  - ML Service (Python): ✓ Running"
echo "  - V4 Models: ✓ Available ($TRAINED models)"
echo "  - Single Predictions: ✓ Working"
echo "  - Batch Predictions: ✓ Working"
echo ""
echo "Next steps:"
echo "  1. Start Next.js: npm run dev"
echo "  2. Open http://localhost:3000"
echo "  3. Use the V4 API in your components"
echo ""
echo "Documentation:"
echo "  - Frontend Guide: docs/V4_FRONTEND_INTEGRATION.md"
echo "  - API Docs: http://localhost:8000/api/v4/docs (when running)"
echo ""
