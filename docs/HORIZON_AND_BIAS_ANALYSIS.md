# Horizon Parameter & Model Bias Analysis

## Question 1: Should We Update the API Endpoint for Horizon?

### Current Implementation

**What `prediction_days` Actually Does:**
```python
# In ml/api/models/schemas.py
class LSTMPredictionRequest(BaseModel):
    symbol: str
    data: List[Dict[str, Any]]
    prediction_days: int = 60  # This is INPUT WINDOW SIZE, not forecast horizon!
```

**Current Model Behavior:**
- LSTM model takes last 60 days → predicts **ONLY next day** (day 61)
- GARCH model: `horizon=1` → predicts **ONLY next period variance**
- Both models are **single-step forecasters**

**Frontend Interpolation:**
```typescript
// We interpolate from current price to predicted price
const interpolatedPrice = currentPrice + (prediction - currentPrice) * progress;
```

This creates a **visual smooth line** but is **not true multi-step forecasting**.

### Recommendation: Two-Phase Approach

#### Phase 1: Current (Pragmatic) ✅ Already Implemented
**Keep frontend interpolation** for now because:
- ✅ Fast to implement (already done)
- ✅ Honest about uncertainty (we show it as a trend line)
- ✅ Good user experience (smooth visualization)
- ✅ No ML model changes required

**Add Clear Disclaimer:**
```typescript
// In UI
"LSTM prediction shows expected price at {horizon}. 
Path shown is interpolated - not daily predictions."
```

#### Phase 2: Enhanced API (Future Enhancement) 🔄

**Add `forecast_horizon` parameter:**
```python
# Enhanced schema
class LSTMPredictionRequest(BaseModel):
    symbol: str
    data: List[Dict[str, Any]]
    prediction_days: int = 60        # INPUT: How many days to look back
    forecast_horizon: int = 30       # OUTPUT: How many days to forecast
    method: str = "iterative"        # "iterative" or "direct"
```

**Two Forecasting Methods:**

**Method 1: Iterative (Autoregressive)**
```python
def forecast_iterative(model, initial_sequence, horizon):
    predictions = []
    current_sequence = initial_sequence.copy()
    
    for step in range(horizon):
        # Predict next step
        next_pred = model.predict(current_sequence)
        predictions.append(next_pred)
        
        # Update sequence: drop oldest, add prediction
        current_sequence = np.roll(current_sequence, -1)
        current_sequence[-1] = next_pred
    
    return predictions
```

**Method 2: Direct Multi-Output**
```python
# Retrain LSTM to output multiple timesteps
model = Sequential([
    LSTM(50, return_sequences=True),
    Dropout(0.2),
    LSTM(50),
    Dense(25),
    Dense(forecast_horizon)  # Output: [day1, day2, ..., day30]
])
```

**Pros/Cons:**

| Aspect | Iterative | Direct Multi-Output |
|--------|-----------|-------------------|
| **Accuracy (Short)** | Good | Excellent |
| **Accuracy (Long)** | Compounds errors | Better |
| **Uncertainty** | Increases with steps | Calibrated |
| **Training** | Use existing model | Requires retraining |
| **Inference** | Slower (N steps) | Fast (single pass) |

---

## Question 2: Is the Model Biased Downward?

### Critical Observation

You noticed: "Most stock prices have a downward trajectory"

**This is a VALID concern** that needs investigation. Let me analyze:

### Possible Causes

#### 1. **Training Data Period Bias**

**Hypothesis:** The model learned patterns from a specific market period.

```python
# Training data spans: 2013 - Oct 2024
# If this period had:
# - More bear markets than bull markets
# - Recent downward trend
# → Model learns to predict downward
```

**Check:**
```bash
# Analyze training data trends
cd ml/datasets
for year in 2013 2014 2023 2024; do
  echo "Year $year average returns:"
  # Calculate average price changes
done
```

#### 2. **Mean Reversion Learned**

**Hypothesis:** Model learned that high prices tend to revert to mean.

If the last data point (Oct 31, 2024) represents relatively HIGH prices compared to historical average:
- Model predicts: "Prices are high → likely to drop"
- This is **mean reversion**, not necessarily bias

**Verification:**
```python
# For SCOM:
historical_mean = 12.50  # Example
last_price = 16.75       # Oct 31, 2024
prediction = 14.39       # 1-month forecast

# Prediction is moving TOWARD historical mean (mean reversion)
```

#### 3. **Feature Scaling Issue**

**Hypothesis:** MinMax scaler creates bias.

```python
# Current code in ml/api/routes/lstm.py
request_scaler = MinMaxScaler(feature_range=(0, 1))
request_scaled = request_scaler.fit_transform(prices.reshape(-1, 1))

# If scaler is fit on recent 60 days and those are at peaks:
# → Scaled values near 1.0
# → Model sees "at top of range"
# → Predicts downward
```

**This is LIKELY a major factor!**

#### 4. **Recency Bias**

**Hypothesis:** Model overweights recent patterns.

If the last few weeks showed downward trend:
- LSTM's memory captures recent downward momentum
- Extrapolates that trend forward
- Predicts continued decline

#### 5. **Overfitting to Volatility**

**Hypothesis:** Model learned to predict high volatility = downward.

Kenya's NSE might have pattern:
- High volatility periods → usually downward
- Model learns: volatility → predict down

---

### Diagnostic Steps

#### Step 1: Analyze Training Data Distribution

```python
# Calculate distribution of returns in training data
import pandas as pd
import numpy as np

all_returns = []
for year in range(2013, 2025):
    df = pd.read_csv(f'NSE_data_all_stocks_{year}.csv')
    # Calculate returns
    returns = df.groupby('Code')['Day Price'].pct_change()
    all_returns.extend(returns.dropna())

print(f"Mean return: {np.mean(all_returns):.4f}")
print(f"Median return: {np.median(all_returns):.4f}")
print(f"% Positive days: {(np.array(all_returns) > 0).mean() * 100:.2f}%")
```

**If mean return is negative:** Training data is bearish → model learns bearish

#### Step 2: Test Multiple Stocks at Different Price Levels

```python
# Test prediction bias across price ranges
test_stocks = {
    'high_price': ['SCBK', 'SBIC'],  # 100+ KES
    'mid_price': ['SCOM', 'EQTY'],   # 15-50 KES
    'low_price': ['NBK', 'HFCK'],    # < 5 KES
}

for category, stocks in test_stocks.items():
    predictions = [predict(stock) for stock in stocks]
    returns = [(pred - current) / current for pred, current in predictions]
    print(f"{category}: Mean predicted return = {np.mean(returns):.2%}")
```

**If all categories show downward bias:** Systematic model issue

#### Step 3: Compare with Naive Baseline

```python
# Baseline: Random walk (tomorrow = today)
baseline = current_price
lstm_pred = model.predict(...)

# Calculate bias
bias = lstm_pred - baseline
print(f"LSTM bias vs random walk: {bias:.2f} KES ({bias/baseline:.2%})")
```

**If LSTM consistently below baseline:** Downward bias confirmed

#### Step 4: Check Scaler Impact

```python
# Test with different scaling approaches
scalers = {
    'minmax_60d': MinMaxScaler().fit(last_60_days),
    'minmax_all': MinMaxScaler().fit(all_historical),
    'standard': StandardScaler().fit(last_60_days),
}

for name, scaler in scalers.items():
    scaled_data = scaler.transform(data)
    prediction = model.predict(scaled_data)
    prediction_actual = scaler.inverse_transform(prediction)
    print(f"{name}: {prediction_actual:.2f}")
```

**If predictions vary significantly:** Scaling is the issue

---

### Potential Solutions

#### Solution 1: Retrain with Balanced Data

```python
# Ensure training data has balanced bull/bear periods
training_data = load_data('2013-2024')

# Check balance
bull_periods = count_periods(training_data, direction='up')
bear_periods = count_periods(training_data, direction='down')

if abs(bull_periods - bear_periods) > threshold:
    # Augment data or reweight samples
    training_data = balance_data(training_data)
```

#### Solution 2: Adjust Scaling Strategy

```python
# Option A: Use longer historical period for scaler
scaler = MinMaxScaler()
scaler.fit(all_historical_data)  # Not just last 60 days

# Option B: Use standardization instead
scaler = StandardScaler()  # Less sensitive to outliers

# Option C: Detrend before scaling
detrended_data = data - np.mean(data)
scaled_data = scaler.fit_transform(detrended_data)
```

#### Solution 3: Add Market Context Features

```python
# Include market indicators to contextualize predictions
features = [
    prices,
    moving_average_ratio,    # price / MA(200)
    volatility_regime,       # high/low vol indicator
    market_trend,            # NSE index direction
]

# Model learns: "High price relative to MA + low vol → expect stability"
```

#### Solution 4: Ensemble with Trend-Neutral Models

```python
# Combine LSTM with other models
predictions = {
    'lstm': lstm_predict(data),
    'arima': arima_predict(data),     # Trend-following
    'random_forest': rf_predict(data), # Less directional bias
}

# Weighted average
final_pred = 0.5 * lstm + 0.3 * arima + 0.2 * rf
```

#### Solution 5: Post-Processing Adjustment

```python
# If systematic bias detected, adjust predictions
historical_bias = calculate_historical_bias(model, validation_set)
# If model consistently predicts 5% too low:
adjusted_prediction = raw_prediction * (1 + abs(historical_bias))
```

---

### Immediate Action Items

#### For Horizon Parameter

**Now:**
1. ✅ Keep frontend interpolation (already done)
2. ✅ Add disclaimer in UI about interpolated path
3. ✅ Document limitation in user guide

**Later (when resources available):**
1. Implement iterative forecasting in ML API
2. Add `forecast_horizon` parameter
3. Return full prediction path, not just endpoint

#### For Bias Investigation

**Priority 1 - Quick Checks:**
```bash
# 1. Check if Oct 2024 prices are at peaks
cd ml/datasets
# Get SCOM prices for 2024
grep SCOM NSE_data_all_stocks_2024_jan_to_oct.csv | \
  awk -F',' '{print $1, $8}' | tail -30

# 2. Compare predictions across multiple stocks
python3 scripts/test_predictions.py batch SCOM EQTY KCB ABSA COOP
# Check if ALL show downward predictions
```

**Priority 2 - Analysis:**
```python
# Create a script to analyze bias
# File: ml/scripts/analyze_prediction_bias.py

import pandas as pd
import numpy as np

def analyze_bias(predictions_file):
    df = pd.read_csv(predictions_file)
    df['return'] = (df['predicted'] - df['current']) / df['current']
    
    print(f"Mean predicted return: {df['return'].mean():.2%}")
    print(f"Median predicted return: {df['return'].median():.2%}")
    print(f"% Bearish predictions: {(df['return'] < 0).mean() * 100:.1f}%")
    print(f"% Bullish predictions: {(df['return'] > 0).mean() * 100:.1f}%")
    
    # By price range
    df['price_category'] = pd.cut(df['current'], bins=[0, 10, 50, 1000])
    print("\nBy price range:")
    print(df.groupby('price_category')['return'].mean())
```

**Priority 3 - Solutions:**
1. If scaler issue → Adjust scaling strategy (quick fix)
2. If mean reversion → Document as feature, not bug
3. If training bias → Retrain with balanced data (longer term)

---

### Specific Code Changes Recommended

#### UI Disclaimer (Immediate)

```typescript
// Add to stock-analysis/page.tsx
{hasResults && (
  <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
    <AlertCircle className="inline w-3 h-3 mr-1" />
    <strong>Note:</strong> The forecast path shown is interpolated. 
    The model predicts the price at the selected horizon; 
    intermediate values are estimated for visualization.
  </div>
)}
```

#### Scaling Fix (Test This)

```python
# In ml/api/routes/lstm.py, line 32-34
# BEFORE (might cause bias):
request_scaler = MinMaxScaler(feature_range=(0, 1))
request_scaled = request_scaler.fit_transform(original_prices.reshape(-1, 1))

# AFTER (test this):
# Option 1: Use percentile-based scaling
p05, p95 = np.percentile(original_prices, [5, 95])
request_scaler = MinMaxScaler(feature_range=(0, 1))
request_scaler.fit([[p05], [p95]])  # Fit to broader range
request_scaled = request_scaler.transform(original_prices.reshape(-1, 1))

# Option 2: Use StandardScaler instead
from sklearn.preprocessing import StandardScaler
request_scaler = StandardScaler()
request_scaled = request_scaler.fit_transform(original_prices.reshape(-1, 1))
```

---

## Summary

### Horizon Parameter
- **Current:** Frontend interpolation (good enough for now)
- **Future:** Implement true multi-step forecasting in ML API
- **Priority:** Low-Medium (current approach works, future enhancement adds value)

### Bias Concern
- **Current:** Needs investigation - likely real issue
- **Probable Cause:** Scaling strategy + mean reversion learning
- **Priority:** **HIGH** - impacts prediction reliability

### Recommended Next Steps

1. **Immediate** (today):
   - Add UI disclaimer about interpolated paths
   - Run bias analysis on 10-20 stocks
   
2. **Short-term** (this week):
   - Test different scaling strategies
   - Document if mean reversion vs bias
   
3. **Medium-term** (next sprint):
   - Implement iterative forecasting
   - Retrain model if systematic bias confirmed

4. **Long-term** (future):
   - Multi-output LSTM for true multi-horizon
   - Ensemble with other models
   - Regular bias monitoring

---

## Date
November 10, 2025


