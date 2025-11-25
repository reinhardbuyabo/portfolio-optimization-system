# LSTM Model Fix - Quick Reference

## Current Problem
- Model predicts **negative prices** and performs worse than random
- **Walk-forward validation on 2024 SCOM data shows**:
  - R² = -70.10 (worse than baseline)
  - Sharpe = -4.05 (losing money)
  - Win Rate = 34% (more losses than wins)

## Root Cause
Training on mixed stocks (0.17-999 KES) but predicting on single stock (13-19 KES)

## Solution
Train separate model per stock with stock-specific scaling

---

## Quick Commands

### See the Problem
```bash
cd /Users/reinhard/portfolio-optimization-system
python3 ml/scripts/diagnose_lstm.py
python3 ml/scripts/test_walk_forward_2024.py
```

### Check Data Quality  
```bash
python3 ml/scripts/analyze_training_data.py
# Output: ml/trained_models/analysis/training_recommendations.json
```

### Train Improved Model
```bash
cd ml
python3 train_pipeline_improved.py
```

### Test Improved Model
```bash
python3 scripts/test_walk_forward_2024.py  # Should show positive Sharpe, >50% win rate
```

---

## Documentation

| File | What It Contains |
|------|-----------------|
| `LSTM_RETRAINING_SUMMARY.md` | **START HERE** - Executive summary |
| `ml/RETRAINING_PLAN.md` | Complete 5-week implementation plan |
| `ml/LSTM_IMPROVEMENTS.md` | Technical deep dive on issues & solutions |
| `ml/WALK_FORWARD_RESULTS_2024.md` | Detailed validation results |
| `LSTM_FIX_README.md` | User-friendly quick start |

---

## What Success Looks Like

| Metric | Now ❌ | Target ✓ |
|--------|-------|----------|
| R² | -70.10 | >0.50 |
| Sharpe Ratio | -4.05 | >1.00 |
| Win Rate | 34% | >50% |
| MAPE | 16% | <5% |

---

## Timeline
- **Week 1**: Data prep ✓ DONE
- **Week 2**: Architecture & training infrastructure
- **Week 3**: Train & validate models
- **Week 4**: Test & select best models
- **Week 5**: Deploy to production

---

## Key Files Created

**Code**:
- `ml/processing/walk_forward.py` - Walk-forward validation
- `ml/train_pipeline_improved.py` - Stock-specific training
- `ml/api/routes/lstm_improved.py` - Improved API
- `ml/scripts/diagnose_lstm.py` - Diagnostics
- `ml/scripts/test_walk_forward_2024.py` - 2024 validation
- `ml/scripts/analyze_training_data.py` - Data quality

**Analysis**:
- `ml/trained_models/analysis/stock_statistics.csv` - Per-stock stats
- `ml/trained_models/analysis/training_recommendations.json` - Training targets

---

## Next Step
**Start training stock-specific model:**
```bash
cd /Users/reinhard/portfolio-optimization-system/ml
python3 train_pipeline_improved.py
```

Expected runtime: 10-30 min for 10 stocks
