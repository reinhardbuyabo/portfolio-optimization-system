#!/bin/bash
# Stock-Specific Model Prediction Runner
# Quick wrapper script to run predictions on stock-specific models

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ML_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
PREDICT_SCRIPT="$SCRIPT_DIR/predict_stock_specific.py"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Stock-Specific Model Prediction Runner${NC}"
echo "=========================================="
echo ""

# Check if Python script exists
if [ ! -f "$PREDICT_SCRIPT" ]; then
    echo -e "${RED}Error: Prediction script not found at $PREDICT_SCRIPT${NC}"
    exit 1
fi

# Change to ML directory
cd "$ML_DIR"

# Run the Python script with all arguments
python3 "$PREDICT_SCRIPT" "$@"
