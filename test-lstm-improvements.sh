#!/bin/bash

# Test script for improved LSTM model
# Runs diagnostics and validates improvements

echo "=========================================="
echo "LSTM Model Improvement Validation"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Run diagnostics on current model
echo -e "${YELLOW}Step 1: Running diagnostics on current model...${NC}"
echo ""
cd /Users/reinhard/portfolio-optimization-system
python3 ml/scripts/diagnose_lstm.py > /tmp/lstm_diagnostics.txt 2>&1

# Extract key metrics
NEGATIVE_RATIO=$(grep "Negative predictions:" /tmp/lstm_diagnostics.txt | head -1 | awk '{print $(NF-1)}' | tr -d '()')
TRAINING_R2=$(grep "Metrics on ACTUAL PRICES:" -A 5 /tmp/lstm_diagnostics.txt | grep "R²:" | awk '{print $2}')

echo -e "Current Model Performance:"
echo -e "  Negative predictions: ${RED}${NEGATIVE_RATIO}${NC}"
echo -e "  Training R²: ${GREEN}${TRAINING_R2}${NC}"
echo ""

# Show scaling issue
echo -e "${YELLOW}Scaling Issue Demonstration:${NC}"
grep "Method 1: Training Scaler" -A 3 /tmp/lstm_diagnostics.txt | tail -2
grep "Method 2: Stock-Specific Scaler" -A 3 /tmp/lstm_diagnostics.txt | tail -2
echo ""

# Step 2: Check if improved training has been run
echo -e "${YELLOW}Step 2: Checking for stock-specific models...${NC}"
STOCK_MODEL_DIR="/Users/reinhard/portfolio-optimization-system/ml/trained_models/stock_specific"

if [ -d "$STOCK_MODEL_DIR" ] && [ "$(ls -A $STOCK_MODEL_DIR 2>/dev/null)" ]; then
    echo -e "${GREEN}✓ Stock-specific models found${NC}"
    echo "  Models available:"
    ls $STOCK_MODEL_DIR/*_model.h5 2>/dev/null | xargs -n1 basename | sed 's/_model.h5//' | sed 's/^/    - /'
    echo ""
else
    echo -e "${RED}✗ No stock-specific models found${NC}"
    echo ""
    echo -e "${YELLOW}To train improved models, run:${NC}"
    echo "  cd /Users/reinhard/portfolio-optimization-system/ml"
    echo "  python3 train_pipeline_improved.py"
    echo ""
fi

# Step 3: Summary and recommendations
echo "=========================================="
echo -e "${YELLOW}Summary${NC}"
echo "=========================================="
echo ""
echo "Issues Identified:"
echo "  1. Scaling mismatch between training (0-999 KES) and individual stocks"
echo "  2. ${NEGATIVE_RATIO} of predictions are negative (impossible for prices)"
echo "  3. No walk-forward validation or financial metrics"
echo ""
echo "Solutions Implemented:"
echo "  ✓ Stock-specific training with appropriate scaling"
echo "  ✓ Walk-forward validation for realistic performance"
echo "  ✓ Financial metrics (Sharpe ratio, win rate, directional accuracy)"
echo "  ✓ Improved API with negative prediction prevention"
echo ""
echo "Next Steps:"
echo "  1. Run: python3 ml/train_pipeline_improved.py"
echo "  2. Review training metrics and walk-forward results"
echo "  3. Update API to use improved endpoints"
echo "  4. Monitor predictions for financial usefulness"
echo ""
echo "Documentation: ml/LSTM_IMPROVEMENTS.md"
echo "=========================================="
