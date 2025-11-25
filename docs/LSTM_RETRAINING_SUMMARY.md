# Summary: LSTM Model Retraining & Walk-Forward Validation

## Current Status ❌

### Walk-Forward Validation Results (SCOM - 2024 Data)
- **R²**: -70.10 (worse than random baseline)
- **Sharpe Ratio**: -4.05 (negative returns)
- **Win Rate**: 34.21% (more losses than wins)
- **MAE**: 2.48 KES (~16% error)
- **Status**: NOT financially useful

### Key Problems Identified
1. **Scaling Mismatch**: Training scaler (0.17-999.81 KES) vs SCOM prices (13-19 KES)
2. **Systematic Bias**: Predictions 2-3 KES lower than actual prices
3. **No Stock-Specific Learning**: Model can't learn individual stock patterns
4. **Potential Overfitting**: No proper train/val/test splits

---

## Solution: Comprehensive Retraining Plan

### Phase 1: Data Analysis ✓ COMPLETE

**What We Did**: Analyzed all training data for quality
  
**Key Findings**:
- **74 stocks** total in dataset
- **63 stocks** with excellent data quality (Tier 1)
  - >1000 trading days
  - <5% missing data
  - <2% outliers
- **Top liquid stocks**: SCOM, EQTY, KCB, BAMB, EABL, COOP, SCBK, ABSA

**Files Generated**:
- `/ml/trained_models/analysis/stock_statistics.csv` - Detailed per-stock analysis
- `/ml/trained_models/analysis/training_recommendations.json` - Training recommendations

---

## Implementation Plan (5 Weeks)

### Week 1-2: Model Architecture & Infrastructure
**File**: `ml/RETRAINING_PLAN.md` (Complete specification)

**Key Improvements**:
1. **Stock-Specific Scaling**
   ```python
   # OLD: Global scaler (0.17-999.81 KES)
   scaler = MinMaxScaler()
   scaler.fit(all_stock_prices)
   
   # NEW: Per-stock scaler
   scom_scaler = MinMaxScaler()
   scom_scaler.fit(scom_prices_only)  # 13-19 KES
   ```

2. **Enhanced Architecture with Regularization**
   ```python
   # Add L2 regularization, batch normalization, dropout
   LSTM(50, kernel_regularizer=l2(0.01))
   BatchNormalization()
   Dropout(0.3)
   ```

3. **Proper Train/Val/Test Splits**
   ```
   Training:   70% (2013-2020)
   Validation: 15% (2021-2022)
   Test:       15% (2023-2024)
   ```

4. **Early Stopping & Model Checkpointing**
   ```python
   EarlyStopping(monitor='val_loss', patience=10)
   ModelCheckpoint(save_best_only=True)
   ```

### Week 3: Training & Validation
**Target Stocks** (Priority Order):
1. SCOM (Safaricom) - Most liquid
2. EQTY (Equity Group)
3. KCB (KCB Group)
4. BAMB (Bamburi Cement)
5. EABL (EABL)
6. COOP (Co-op Bank)
7. SCBK (Standard Chartered)
8. ABSA (ABSA Bank)
9. SBIC (Stanbic)
10. NCBA (NCBA Group)

**Training Process Per Stock**:
1. Load stock-specific data
2. Fit stock-specific scaler
3. Create train/val split (temporal order)
4. Train with early stopping
5. Validate on hold-out set
6. Run walk-forward validation
7. Calculate financial metrics

### Week 4: Testing & Model Selection
**Evaluation Criteria**:
- R² > 0.5 (explains >50% variance)
- Sharpe Ratio > 1.0 (good risk-adjusted returns)
- Win Rate > 50% (more wins than losses)
- MAPE < 5% (acceptable error)
- No systematic bias (mean residual near 0)

### Week 5: Deployment
- A/B testing (10% → 50% → 100%)
- Production monitoring
- Alert on degraded performance

---

## Files Created

### Documentation
1. `ml/LSTM_IMPROVEMENTS.md` - Technical deep dive
2. `ml/RETRAINING_PLAN.md` - Complete 5-week plan
3. `ml/WALK_FORWARD_RESULTS_2024.md` - Walk-forward validation results
4. `LSTM_FIX_README.md` - Quick start guide

### Code
1. `ml/processing/walk_forward.py` - Walk-forward validation
2. `ml/train_pipeline_improved.py` - Stock-specific training
3. `ml/api/routes/lstm_improved.py` - Improved prediction API
4. `ml/scripts/diagnose_lstm.py` - Diagnostic tool
5. `ml/scripts/test_walk_forward_2024.py` - 2024 data validation
6. `ml/scripts/analyze_training_data.py` - Data quality analysis

### Test Scripts
1. `test-lstm-improvements.sh` - Quick validation
2. Test output logs showing current model failures

---

## Expected Improvements

### Current vs Target Performance

| Metric | Current | Target | Best Case |
|--------|---------|--------|-----------|
| R² | -70.10 | 0.50-0.75 | 0.70-0.85 |
| Sharpe Ratio | -4.05 | 0.8-1.5 | 1.2-2.0 |
| Win Rate | 34.21% | 52-58% | 55-62% |
| MAPE | 15.88% | 4-6% | 3-5% |
| MAE (KES) | 2.48 | 0.4-0.8 | 0.3-0.6 |
| Status | ❌ Not useful | ✓ Useful | ✓✓ Excellent |

---

## Quick Start

### 1. Run Diagnostics (See Current Issues)
```bash
cd /Users/reinhard/portfolio-optimization-system
python3 ml/scripts/diagnose_lstm.py
```

### 2. Validate on 2024 Data
```bash
python3 ml/scripts/test_walk_forward_2024.py
```

### 3. Check Data Quality
```bash
python3 ml/scripts/analyze_training_data.py
# Output: ml/trained_models/analysis/training_recommendations.json
```

### 4. Train Improved Models
```bash
cd ml
python3 train_pipeline_improved.py
```

### 5. Test Improved Model
```bash
# After training stock-specific models
python3 scripts/test_walk_forward_2024.py  # Should show improvement
```

---

## Key Takeaways

### Why Current Model Fails
1. **Scaling**: SCOM prices (13-19 KES) scaled using range (0.17-999.81 KES)
   - Prediction 60 KES when actual is 15 KES (4x error!)
2. **No Stock Learning**: Model sees all stocks together, can't learn SCOM-specific patterns
3. **No Validation**: Trained on all data without proper holdout sets

### Why Stock-Specific Will Work
1. **Proper Scaling**: SCOM scaler uses 13-19 KES range
   - Predictions stay in realistic bounds
2. **Stock Patterns**: Model learns SCOM-specific dynamics
3. **Validation**: Train/val/test splits prevent overfitting
4. **Regularization**: L2, dropout, batch norm prevent memorization

### Financial Usefulness Criteria
A model is useful if:
- ✓ Sharpe Ratio > 1.0 (good risk-adjusted returns)
- ✓ Win Rate > 50% (more profitable trades than losses)
- ✓ Directional Accuracy > 55% (better than random)
- ✓ R² > 0.5 (explains majority of variance)

---

## Next Actions

### Immediate (This Week)
- [x] Run walk-forward validation on 2024 data
- [x] Analyze data quality
- [x] Document issues and solution
- [ ] **START: Train stock-specific model for SCOM**
- [ ] Validate improved model on 2024 data

### Short-term (Week 2-3)
- [ ] Train models for top 10 liquid stocks
- [ ] Hyperparameter tuning
- [ ] Compare original vs improved performance

### Medium-term (Week 4-5)
- [ ] Select best models for production
- [ ] Deploy with A/B testing
- [ ] Set up monitoring dashboards

---

## Resources

- **Data**: `ml/datasets/NSE_data_all_stocks_*.csv`
- **Models**: `ml/trained_models/` (current) and `ml/trained_models/stock_specific/` (new)
- **Analysis**: `ml/trained_models/analysis/`
- **Docs**: `ml/LSTM_IMPROVEMENTS.md`, `ml/RETRAINING_PLAN.md`
- **Code**: `ml/train_pipeline_improved.py`, `ml/processing/walk_forward.py`

---

**Status**: Phase 1 Complete (Data Analysis)  
**Next**: Begin Phase 2 (Model Architecture & Training Infrastructure)  
**Timeline**: 5 weeks to production deployment  
**Priority**: High - Current model not financially useful

**Last Updated**: November 18, 2024
