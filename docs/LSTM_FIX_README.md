# LSTM Model Fix - Quick Start Guide

## Problem Summary

Your LSTM model has been producing mostly negative price predictions due to:
1. **Scaling mismatch**: Model trained on all stocks (price range 0-999 KES) but predicts on individual stocks (e.g., 14-17 KES)
2. **No validation**: Missing walk-forward validation for time series
3. **No financial metrics**: Can't assess if predictions are economically useful

## What Was Fixed

### 1. Stock-Specific Models (`ml/train_pipeline_improved.py`)
- Train separate model per stock with stock-specific scaling
- Eliminates scaling mismatch
- Prevents negative predictions

### 2. Walk-Forward Validation (`ml/processing/walk_forward.py`)
- Proper time-series cross-validation
- Never uses future data to predict past
- Realistic performance estimates

### 3. Financial Metrics
- **Sharpe Ratio**: Risk-adjusted returns (>1.0 is good)
- **Win Rate**: % of profitable predictions (>50% needed)
- **Directional Accuracy**: % correct direction (>55% useful)
- **Max Drawdown**: Largest decline (monitor risk)

### 4. Improved API (`ml/api/routes/lstm_improved.py`)
- Auto-loads stock-specific models
- Falls back to general model with stock-specific scaling
- Prevents negative predictions
- Returns prediction change and %

## How to Fix Your Model

### Step 1: Run Diagnostics (See Current Issues)
```bash
cd /Users/reinhard/portfolio-optimization-system
python3 ml/scripts/diagnose_lstm.py
```

**Output shows**:
- Negative predictions: 2.63% (4,761 out of 181,342)
- Scaling mismatch example:
  - SCOM actual range: 14.40-16.90 KES
  - Training scaler prediction: 60.20 KES ❌ (WRONG!)
  - Stock-specific prediction: 14.31 KES ✓ (correct)

### Step 2: Train Improved Models
```bash
cd /Users/reinhard/portfolio-optimization-system/ml
python3 train_pipeline_improved.py
```

**This will**:
- Train models for top 10 stocks (by data availability)
- Use stock-specific scaling for each
- Run walk-forward validation
- Report financial metrics
- Save to `trained_models/stock_specific/`

**Expected runtime**: 10-30 minutes depending on data size

**Expected output**:
```
SCOM:
  Training R²: 0.85 ✓
  Training MAE: 0.45 KES ✓
  Negative predictions: 0.00% ✓
  Walk-forward R²: 0.72 ± 0.08 ✓
  Sharpe ratio: 1.23 ✓ (>1.0 is good!)
  Win rate: 57.50% ✓ (>50% needed)
```

### Step 3: Update Your API

Add to `ml/api/main.py`:
```python
from api.routes import lstm_improved

# Register improved routes
app.include_router(
    lstm_improved.router,
    prefix="/predict",
    tags=["predictions"]
)
```

### Step 4: Test Predictions
```bash
curl -X POST "http://localhost:3000/api/ml/lstm/improved" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "SCOM",
    "prediction_days": 60,
    "data": [
      {"Day Price": 14.50},
      {"Day Price": 14.65},
      ... (60 data points)
    ]
  }'
```

**Response**:
```json
{
  "symbol": "SCOM",
  "prediction": 16.85,
  "current_price": 16.50,
  "predicted_change": 0.35,
  "predicted_change_pct": 2.12,
  "model_type": "stock_specific",
  "horizon": 60,
  "execution_time": 0.045
}
```

## Understanding the Metrics

### Regression Metrics
- **R²**: 0-1, how much variance explained (>0.5 is decent, >0.7 is good)
- **MAE**: Average error in KES (lower is better)
- **RMSE**: Root mean squared error (penalizes large errors)

### Financial Metrics
- **Sharpe Ratio**: Risk-adjusted returns
  - < 0: Losing money
  - 0-1: Marginal
  - 1-2: Good ✓
  - > 2: Excellent ✓✓
  
- **Win Rate**: % profitable predictions
  - < 50%: Random or worse
  - 50-55%: Marginal
  - 55-60%: Good ✓
  - > 60%: Excellent ✓✓

- **Directional Accuracy**: % correct direction
  - 50%: Random (coin flip)
  - 55-60%: Useful ✓
  - > 60%: Strong ✓✓

## Files Created

```
ml/
├── LSTM_IMPROVEMENTS.md              # Detailed technical docs
├── train_pipeline_improved.py        # New training pipeline
├── processing/
│   └── walk_forward.py              # Walk-forward validation
├── api/routes/
│   └── lstm_improved.py             # Improved prediction API
├── scripts/
│   └── diagnose_lstm.py             # Diagnostic tool
└── trained_models/
    └── stock_specific/              # Stock-specific models
        ├── {STOCK}_model.h5
        ├── {STOCK}_scaler.joblib
        └── {STOCK}_metadata.json

test-lstm-improvements.sh             # Quick validation script
```

## Quick Validation

Run this to check current status:
```bash
./test-lstm-improvements.sh
```

## Key Concepts

### Why Stock-Specific?

**Without stock-specific scaling**:
```
Training data: 181,402 rows, all stocks, price range 0.17-999.81 KES
Scaler learns: min=0, max=999.81
SCOM price 15.00 → scaled to 0.015
Model predicts: 0.06
Inverse: 0.06 × 999.81 = 59.99 KES ❌ (4x too high!)
```

**With stock-specific scaling**:
```
SCOM data only: price range 14.40-16.90 KES
Scaler learns: min=14.40, max=16.90
SCOM price 15.00 → scaled to 0.24
Model predicts: 0.28
Inverse: 0.28 × (16.90-14.40) + 14.40 = 15.10 KES ✓
```

### Why Walk-Forward?

Traditional CV can use 2024 data to predict 2023 (future→past) ❌

Walk-forward always trains on past, tests on future:
```
2020 -------- 2021 -------- 2022 -------- 2023 -------- 2024
[Train------>][Test]
      [Train-------->][Test]
            [Train---------->][Test]
```

### Financial Usefulness

A model can have good R² but be unprofitable!

Example:
- R² = 0.80 (good statistical fit)
- But directional accuracy = 45% (wrong direction 55% of time)
- Result: Loses money in trading ❌

Need both:
- Good statistical metrics (R², MAE)
- Good financial metrics (Sharpe, win rate)

## Troubleshooting

### "No module named 'processing'"
```bash
cd /Users/reinhard/portfolio-optimization-system/ml
export PYTHONPATH=$PYTHONPATH:$(pwd)
python3 train_pipeline_improved.py
```

### "Insufficient data for stock X"
Normal - model skips stocks with < 500 samples

### "Model training very slow"
Reduce epochs in `ml/config/core.py`:
```python
EPOCHS: int = 10  # or lower for testing
```

### "Want to train specific stocks"
Edit `train_pipeline_improved.py`, line ~100:
```python
# Change this line:
top_stocks = stock_counts[stock_counts >= 500].head(10).index.tolist()

# To specific stocks:
top_stocks = ['SCOM', 'EQTY', 'KCB']  # your stocks
```

## What's Next?

1. ✅ **Run diagnostics** to see current issues
2. ✅ **Train improved models** (10-30 min)
3. ✅ **Validate metrics** - check Sharpe ratio and win rate
4. ✅ **Update API** to use improved endpoints
5. ✅ **Monitor performance** over time

## Questions?

See detailed docs: `ml/LSTM_IMPROVEMENTS.md`

Key sections:
- Problem Diagnosis
- Solutions Implemented  
- Understanding the Metrics
- Training the Improved Model

---

**TL;DR**: Run `python3 ml/train_pipeline_improved.py` to fix negative predictions and get financially useful models.
