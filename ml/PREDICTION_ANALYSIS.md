# Stock-Specific Model Prediction Analysis

## Date: November 18, 2024

## Summary

We've successfully created prediction scripts for 17 stock-specific LSTM models. Analysis of the predictions reveals some areas for improvement.

## Available Models

17 stock-specific models trained:
- **SCOM, EQTY, KCB, BAMB, EABL** (Core stocks)
- **COOP, ABSA, SCBK, NCBA, NBK, DTK** (Banking sector)
- **KPLC, TOTL, KEGN** (Utilities & Manufacturing)
- **BRIT, CIC** (Insurance)
- **SCOM_recent** (Alternative SCOM model)

## Prediction Scripts Created

### 1. `predict_stock_specific.py`
Main prediction script with features:
- **Single stock prediction**: `python predict_stock_specific.py SCOM`
- **Multiple stocks**: `python predict_stock_specific.py SCOM EQTY KCB`
- **All models**: `python predict_stock_specific.py --all`
- **List models**: `python predict_stock_specific.py --list`
- **Save results**: `python predict_stock_specific.py --all --save`

### 2. `run_stock_predictions.sh`
Bash wrapper for easy execution

### 3. `analyze_predictions.py`
Comprehensive analysis tool for prediction quality

## Current Prediction Results

| Stock | Last Price | Predicted | Change | Change % | Status |
|-------|-----------|-----------|--------|----------|--------|
| SCOM  | 16.75     | 20.02     | +3.27  | +19.5%   | ⚠️ Above range |
| EQTY  | 47.30     | 38.42     | -8.88  | -18.8%   | ⚠️ Below range |
| KCB   | 38.50     | 44.22     | +5.72  | +14.9%   | ⚠️ Above range |
| BAMB  | 65.75     | 194.44    | +128.69| +195.7%  | 🔴 EXTREME |
| EABL  | 183.00    | 256.19    | +73.19 | +40.0%   | ⚠️ Above range |

## Key Findings

### 1. Prediction Quality Issues
- ✅ **5/5** predictions completed successfully
- ⚠️ **5/5** predictions outside 60-day historical range
- 🔴 **1/5** predictions show extreme changes (>50%)
- 🔴 **BAMB** shows +195.7% change - likely overfitting or scaling issue

### 2. Model Metadata Gaps
- ❌ No MAE/MAPE metrics recorded during training
- ❌ No validation loss tracking
- ❌ No early stopping implemented
- ✅ All models trained for 50 epochs
- ✅ Models and scalers saved correctly

### 3. Potential Issues

#### BAMB Model (Critical)
- Predicting 194 KES vs current 65.75 KES (+195%)
- 60-day range: 55-69 KES
- Prediction is 2.8x the historical maximum
- **Likely cause**: Scaler fitted on wrong data or data leakage

#### Other Models (Warning)
- All predictions outside recent price ranges
- Suggests models may be overfitting to training data
- Lack of regularization (dropout, L2)

## Recommendations for Model Refinement

### Priority 1: Fix Scaling Issues 🔴

```python
# Current issue: Scalers may have data leakage
# Fix: Ensure scaler fitted ONLY on training data

# Correct approach:
train_data, test_data = split_data(df, test_size=0.2)
scaler = MinMaxScaler()
scaler.fit(train_data[['Day Price']])  # Only training data!

# Save scaler for later use
joblib.dump(scaler, f'{stock_code}_scaler.joblib')
```

### Priority 2: Add Metrics Tracking 🟡

```python
# Add custom callback to track metrics
class MetricsCallback(keras.callbacks.Callback):
    def on_epoch_end(self, epoch, logs=None):
        # Calculate MAE, MAPE on validation set
        val_pred = self.model.predict(val_X)
        mae = mean_absolute_error(val_y, val_pred)
        mape = mean_absolute_percentage_error(val_y, val_pred)
        logs['val_mae'] = mae
        logs['val_mape'] = mape
```

### Priority 3: Add Regularization 🟡

```python
# Improved model architecture
model = Sequential([
    LSTM(50, return_sequences=True, input_shape=(sequence_length, 1)),
    Dropout(0.2),  # Add dropout
    LSTM(50, return_sequences=False, kernel_regularizer=l2(0.01)),  # L2 reg
    Dropout(0.2),
    Dense(25, kernel_regularizer=l2(0.01)),
    Dropout(0.1),
    Dense(1)
])
```

### Priority 4: Implement Early Stopping 🟢

```python
# Add early stopping
early_stop = EarlyStopping(
    monitor='val_loss',
    patience=15,
    restore_best_weights=True,
    verbose=1
)

history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=100,
    batch_size=32,
    callbacks=[early_stop, metrics_callback]
)
```

### Priority 5: Walk-Forward Validation 🟢

```python
# Test model on November 2024 data
def validate_on_november_data(model, scaler, stock_code):
    nov_data = load_november_data(stock_code)
    # Compare predictions vs actuals
    # Calculate MAE, MAPE, Sharpe ratio
```

## Recommended Action Plan

### Immediate (This Week)
1. ✅ **Created prediction scripts** - DONE
2. 🔧 **Investigate BAMB model** - Check scaler data_min_/data_max_
3. 🔧 **Add metrics tracking** to training script
4. 🔧 **Retrain BAMB** with proper scaling

### Short Term (Next Week)
1. 📊 **Add early stopping** to all models
2. 📊 **Add dropout & regularization**
3. 📊 **Retrain all 17 models** with improvements
4. 📊 **Validate on November data** (if available)

### Medium Term (2-4 Weeks)
1. 🚀 **Feature engineering**: Add RSI, MACD, moving averages
2. 🚀 **Ensemble methods**: Average multiple models
3. 🚀 **Hyperparameter tuning**: GridSearch for best parameters
4. 🚀 **Deploy to API**: Integrate with existing endpoints

## Quick Start Guide

### List Available Models
```bash
cd ml
python3 scripts/predict_stock_specific.py --list
```

### Predict Single Stock
```bash
python3 scripts/predict_stock_specific.py SCOM
```

### Predict Multiple Stocks
```bash
python3 scripts/predict_stock_specific.py SCOM EQTY KCB BAMB EABL
```

### Predict All Stocks and Save
```bash
python3 scripts/predict_stock_specific.py --all --save
```

### Analyze Prediction Quality
```bash
python3 scripts/analyze_predictions.py
```

## Files Created

1. `ml/scripts/predict_stock_specific.py` - Main prediction script (381 lines)
2. `ml/scripts/run_stock_predictions.sh` - Bash wrapper
3. `ml/scripts/analyze_predictions.py` - Analysis tool (305 lines)
4. `ml/PREDICTION_ANALYSIS.md` - This document

## Next Steps

See recommendations above. Priority is:
1. Fix BAMB scaling issue
2. Add metrics tracking to training
3. Retrain with regularization
4. Validate on out-of-sample data

---

**Analysis Date**: November 18, 2024  
**Models Analyzed**: 17 stock-specific LSTM models  
**Prediction Success Rate**: 100% (execution)  
**Prediction Quality**: Needs improvement (scaling & overfitting issues)
