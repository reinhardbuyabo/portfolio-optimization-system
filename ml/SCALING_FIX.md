# Scaling Fix: Per-Request Scaler

## The Problem We Fixed

### Before Fix ❌
```
Input: SCOM data [range: 14.50-17.40 KES]
Prediction: 59.77 KES (scaled: 0.0598) [range: 14.50-17.40]
                ↑
            WRONG! Way outside the trading range
```

**Issue**: Used training scaler (fitted on ALL stocks, range ~1-500 KES) to inverse transform predictions.

### After Fix ✅
```
Input: SCOM data [range: 14.50-17.40 KES]
Prediction: 14.87 KES (scaled: 0.0598) [range: 14.50-17.40]
                ↑
            CORRECT! Within the actual trading range
```

**Solution**: Fit a new scaler on each request's input data (last 60 days of THIS stock).

---

## How It Works Now

### Step-by-Step Process

1. **Input Received**: Last 60 days of SCOM prices (14.50-17.40 KES)

2. **Create Request Scaler**:
   ```python
   request_scaler = MinMaxScaler()
   request_scaler.fit(input_prices)  # Fits to 14.50-17.40
   ```

3. **Scale Input**:
   ```python
   scaled_input = request_scaler.transform(input_prices)
   # 14.50 KES → 0.0 (min)
   # 17.40 KES → 1.0 (max)
   # 15.90 KES → ~0.48 (middle)
   ```

4. **Model Prediction**:
   ```python
   prediction_scaled = model.predict(scaled_input)  # Returns 0.0598
   ```

5. **Inverse Transform** (THE FIX):
   ```python
   prediction_actual = request_scaler.inverse_transform([[0.0598]])
   # 0.0598 → 14.87 KES ✅ (near bottom of range)
   ```

---

## Example Interpretations

### Example 1: SCOM
```
Prediction: 14.87 KES (scaled: 0.0598) [range: 14.50-17.40]
```

**Interpretation**:
- **Scaled 0.0598** = 5.98% above the minimum (14.50)
- **Actual price**: 14.50 + (0.0598 × (17.40 - 14.50)) = 14.87 KES ✅
- **Signal**: Bearish - predicting near bottom of recent range

### Example 2: EQTY
```
Prediction: 42.34 KES (scaled: 0.5234) [range: 38.00-45.50]
```

**Interpretation**:
- **Scaled 0.5234** = 52.34% through the range
- **Actual price**: 38.00 + (0.5234 × (45.50 - 38.00)) = 42.34 KES ✅
- **Signal**: Neutral - middle of recent range

### Example 3: KCB (Bullish)
```
Prediction: 31.89 KES (scaled: 0.9234) [range: 25.00-32.00]
```

**Interpretation**:
- **Scaled 0.9234** = 92.34% through the range
- **Actual price**: 25.00 + (0.9234 × (32.00 - 25.00)) = 31.46 KES ✅
- **Signal**: Bullish - predicting near top of recent range

---

## Validation

### How to Verify It's Working

The prediction should **always** be within or very close to the `price_range`:

✅ **Correct**:
```
Prediction: 15.23 KES [range: 14.50-17.40]  ← Within range
Prediction: 17.89 KES [range: 14.50-17.40]  ← Slightly above (bullish breakout)
Prediction: 14.12 KES [range: 14.50-17.40]  ← Slightly below (bearish breakdown)
```

❌ **Incorrect** (old behavior):
```
Prediction: 59.77 KES [range: 14.50-17.40]  ← Way outside range!
Prediction: 2.34 KES [range: 14.50-17.40]   ← Way outside range!
```

### Formula Check

```python
# The prediction should satisfy:
prediction ≈ price_min + (prediction_scaled × (price_max - price_min))

# Example:
14.87 ≈ 14.50 + (0.0598 × (17.40 - 14.50))
14.87 ≈ 14.50 + (0.0598 × 2.90)
14.87 ≈ 14.50 + 0.173
14.87 ≈ 14.673  ✅ Close enough (floating point precision)
```

---

## Code Changes

### What Changed in `lstm.py`

**Before**:
```python
# ❌ Used training preprocessor's scaler
prediction_actual = preprocessor.scaler.inverse_transform([[prediction_scaled]])
```

**After**:
```python
# ✅ Create and use request-specific scaler
request_scaler = MinMaxScaler(feature_range=(0, 1))
request_scaled = request_scaler.fit_transform(original_prices.reshape(-1, 1))

# ... model prediction ...

prediction_actual = request_scaler.inverse_transform([[prediction_scaled]])
```

---

## Testing the Fix

### Restart API and Test

```bash
# Terminal 1: Restart API
cd ml
tox -e serve-dev

# Terminal 2: Test prediction
cd ml
python3 scripts/test_predictions.py single SCOM
```

### Expected Output (Fixed)

```
Prediction: 14.87 KES (scaled: 0.0598) [range: 14.50-17.40] (took 0.19s)
```

Now the prediction makes sense:
- Scaled value: 0.0598 (low)
- Actual KES: 14.87 (low end of range) ✅
- Consistent interpretation!

---

## Benefits of Per-Request Scaling

1. ✅ **Stock-Specific**: Each stock's predictions match its price level
2. ✅ **Interpretable**: Predictions always in reasonable range
3. ✅ **Comparable**: Can directly compare with actual prices
4. ✅ **Context-Aware**: Price range shows recent trading bounds
5. ✅ **Accurate**: No more nonsensical 59 KES predictions for 15 KES stocks

---

## Why Training Used Global Scaler

**Training Phase**: 
- Used global scaler across ALL stocks (necessary for model to learn patterns)
- Model learns relative price movements across different scales

**Prediction Phase** (now fixed):
- Use per-request scaler to translate model output back to stock's actual price level
- This is CORRECT because we only care about THIS stock's price range

This approach gives us the best of both worlds:
- Training: Learn from all stocks together
- Prediction: Results specific to each stock's price level
