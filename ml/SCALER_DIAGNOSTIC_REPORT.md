# Stock-Specific Model Analysis Summary

**Date**: November 18, 2024  
**Models Analyzed**: 17 stock-specific LSTM models  
**Status**: ⚠️ Critical Issues Identified

---

## Executive Summary

✅ **Successfully created** prediction scripts for all 17 stock-specific models  
🔴 **Critical Issue Found**: Scalers do not match historical data  
⚠️ **All 5/5 test predictions** outside 60-day historical ranges  
🔧 **Action Required**: Retrain models with corrected scaling

---

## Key Findings

### 1. Scaler Mismatch Issue 🔴 CRITICAL

**Problem**: The MinMaxScalers used by the models have ranges that don't match the historical data.

**Example - BAMB Stock**:
- **Scaler Range**: 27.25 - 225.00 KES
- **Actual Historical Range**: 22.50 - 82.00 KES
- **Training Data Range**: 22.50 - 48.95 KES
- **Recent (60d) Range**: 57.25 - 82.00 KES

**Impact**: 
- Model predicts 194.44 KES (vs 65.75 current)
- That's within scaler range but way outside historical reality
- Model is extrapolating based on incorrect scaling

**Example - SCOM Stock**:
- **Scaler Range**: 5.10 - 44.95 KES
- **Actual Historical Range**: 11.65 - 24.50 KES
- Model predicts 20.02 KES (plausible but scaled incorrectly)

### 2. Scaler Diagnostic Results

| Finding | Count | Status |
|---------|-------|--------|
| Total Models | 16* | - |
| Potential Data Leakage | 0 | ✅ Good |
| Correct Scaling | 0 | 🔴 Problem |
| Recent Prices Out of Scaler Range | 4 | ⚠️ Warning |

*Note: SCOM_recent excluded due to missing data*

### 3. Prediction Quality Analysis

All test predictions fell outside their 60-day historical ranges:

| Stock | Prediction | Current | Change % | Status |
|-------|-----------|---------|----------|--------|
| SCOM | 20.02 | 16.75 | +19.5% | Above 60d max (17.40) |
| EQTY | 38.42 | 47.30 | -18.8% | Below 60d min (38.50) |
| KCB | 44.22 | 38.50 | +14.9% | Above 60d max (39.05) |
| BAMB | 194.44 | 65.75 | +195.7% | 🔴 Extreme |
| EABL | 256.19 | 183.00 | +40.0% | Above 60d max (199.75) |

---

## Root Cause Analysis

The scaler ranges suggest they were **NOT** fitted on the actual NSE historical data. Possible causes:

1. **Synthetic Training Data**: Models trained on generated/augmented data
2. **Different Data Source**: Scalers fitted on different dataset
3. **Manual Range Setting**: Scalers initialized with arbitrary ranges
4. **Data Preprocessing Error**: Wrong column or data used for scaler.fit()

**Evidence**:
```
BAMB Scaler: 27.25 - 225.00 KES  (range: 197.75)
BAMB Actual: 22.50 - 82.00 KES   (range: 59.50)

SCOM Scaler: 5.10 - 44.95 KES    (range: 39.85)
SCOM Actual: 11.65 - 24.50 KES   (range: 12.85)
```

The scaler ranges are **2-3x wider** than historical data suggests.

---

## Recommendations

### Immediate Action (Priority 1) 🔴

**Retrain ALL models with proper scaling**

1. **Verify Training Script**
   ```python
   # Check train_pipeline_v2.py or similar
   # Ensure scaler is fitted on training data ONLY
   
   # WRONG:
   scaler.fit(df[['Day Price']])  # Entire dataset
   
   # CORRECT:
   train_data = df.iloc[:train_size]
   scaler.fit(train_data[['Day Price']])
   ```

2. **Add Scaler Validation**
   ```python
   # After fitting scaler
   print(f"Scaler range: {scaler.data_min_[0]:.2f} - {scaler.data_max_[0]:.2f}")
   print(f"Actual range: {train_data['Day Price'].min():.2f} - {train_data['Day Price'].max():.2f}")
   
   # Assert they match
   assert abs(scaler.data_min_[0] - train_data['Day Price'].min()) < 0.01
   assert abs(scaler.data_max_[0] - train_data['Day Price'].max()) < 0.01
   ```

### Short-Term Improvements (Priority 2) 🟡

1. **Add Training Metrics**
   - Track MAE, MAPE during training
   - Save metrics to metadata.json
   - Implement early stopping

2. **Add Regularization**
   - Dropout layers (0.2-0.3)
   - L2 regularization
   - Reduce overfitting

3. **Validation Strategy**
   - Walk-forward validation
   - Test on Nov 2024 data
   - Compare vs baseline (ARIMA)

### Medium-Term Enhancements (Priority 3) 🟢

1. **Feature Engineering**
   - Technical indicators (RSI, MACD)
   - Volume data
   - Rolling statistics

2. **Ensemble Methods**
   - Train multiple models
   - Average predictions
   - Reduce variance

3. **Hyperparameter Tuning**
   - Grid search
   - Optimize LSTM units
   - Sequence length experiments

---

## Scripts Created

### 1. `predict_stock_specific.py` ✅
Main prediction script - **WORKING**

```bash
# List models
python3 ml/scripts/predict_stock_specific.py --list

# Single stock
python3 ml/scripts/predict_stock_specific.py SCOM

# Multiple stocks
python3 ml/scripts/predict_stock_specific.py SCOM EQTY KCB

# All stocks
python3 ml/scripts/predict_stock_specific.py --all

# Save results
python3 ml/scripts/predict_stock_specific.py --all --save
```

### 2. `analyze_predictions.py` ✅
Prediction quality analysis - **WORKING**

```bash
python3 ml/scripts/analyze_predictions.py
```

### 3. `inspect_scalers.py` ✅
Scaler diagnostic tool - **WORKING**

```bash
python3 ml/scripts/inspect_scalers.py
```

### 4. `run_stock_predictions.sh` ✅
Bash wrapper - **READY**

```bash
./ml/scripts/run_stock_predictions.sh --list
```

---

## Next Steps

### Step 1: Investigate Training Process
```bash
# Check which training script was used
cd ml
find . -name "train_*stock*.py" -type f

# Review the training script
# Look for scaler.fit() calls
```

### Step 2: Retrain Models (Template)
```python
# Corrected training approach
def train_stock_model(stock_code):
    # Load data
    df = load_stock_data(stock_code)
    
    # Split FIRST
    train_size = int(len(df) * 0.8)
    train_df = df.iloc[:train_size]
    test_df = df.iloc[train_size:]
    
    # Fit scaler on training data ONLY
    scaler = MinMaxScaler()
    scaler.fit(train_df[['Day Price']])
    
    # Validate scaler
    assert scaler.data_min_[0] == train_df['Day Price'].min()
    assert scaler.data_max_[0] == train_df['Day Price'].max()
    
    # Continue with training...
```

### Step 3: Validate Retraining
```bash
# After retraining, run diagnostics
python3 ml/scripts/inspect_scalers.py

# Should show:
# ✅ Scaler appears to be fitted on training data only
```

### Step 4: Re-run Predictions
```bash
# Test predictions with corrected models
python3 ml/scripts/predict_stock_specific.py --all

# Analyze quality
python3 ml/scripts/analyze_predictions.py
```

---

## Useful Debug Commands

```bash
# Check scaler for specific stock
python3 -c "
import joblib
scaler = joblib.load('ml/trained_models/stock_specific_v2/BAMB_scaler.joblib')
print(f'Min: {scaler.data_min_[0]:.2f}')
print(f'Max: {scaler.data_max_[0]:.2f}')
"

# Check model metadata
cat ml/trained_models/stock_specific_v2/BAMB_metadata.json | python3 -m json.tool

# List all models
ls -lh ml/trained_models/stock_specific_v2/*_best.h5
```

---

## Conclusion

### What Works ✅
- Prediction scripts functional
- All 17 models load successfully
- Analysis tools comprehensive
- Diagnostic tools identify issues

### What Needs Fixing 🔴
- **CRITICAL**: Scaler ranges don't match historical data
- **HIGH**: No validation metrics in metadata
- **MEDIUM**: No regularization in models
- **MEDIUM**: No early stopping implemented

### Impact
- Current predictions **not reliable** due to scaling issues
- Models need to be **retrained** with corrected scaling
- Once fixed, models should perform much better

### Time to Fix
- **Scaler correction**: 30 minutes (code fix)
- **Model retraining**: ~2 hours (all 17 stocks)
- **Validation**: 30 minutes (testing)
- **Total**: ~3 hours to production-ready models

---

**Recommendation**: Do NOT use current predictions for trading. Retrain models with corrected scaling first.

---

## Files Created in This Session

1. ✅ `ml/scripts/predict_stock_specific.py` (381 lines)
2. ✅ `ml/scripts/run_stock_predictions.sh` (32 lines)
3. ✅ `ml/scripts/analyze_predictions.py` (305 lines)
4. ✅ `ml/scripts/inspect_scalers.py` (235 lines)
5. ✅ `ml/PREDICTION_ANALYSIS.md` (documentation)
6. ✅ `ml/SCALER_DIAGNOSTIC_REPORT.md` (this file)

**Total**: 6 new files, ~1000 lines of code
