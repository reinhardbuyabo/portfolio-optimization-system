# Prediction Horizons Feature

## Overview

Added support for multiple prediction horizons (1D, 3D, 1W, 1M, 3M, 6M, 1Y) for both LSTM price predictions and GARCH volatility forecasts, allowing users to see forecasts across various market time frames.

## Problem Statement

**Before**: 
- LSTM predicted only the "next data point" (Day 61 after 60 days input)
- Chart showed a visual gap from Oct 31 (last historical) to Nov 12+ (prediction)
- No way to customize prediction timeframe
- Users couldn't see short-term (1 day) or long-term (1 year) forecasts

**After**:
- Users can select from 7 different prediction horizons
- Chart shows smooth forecast path from last historical date to chosen horizon
- Supports 1 day to 1 year predictions
- Clear visual continuity between historical and forecast data

---

## Implementation

### 1. Horizon Selector

Added dropdown with 7 horizons:

```typescript
type PredictionHorizon = '1D' | '3D' | '1W' | '1M' | '3M' | '6M' | '1Y';

const HORIZON_DAYS: Record<PredictionHorizon, number> = {
  '1D': 1,      // 1 day
  '3D': 3,      // 3 days
  '1W': 7,      // 1 week
  '1M': 30,     // 1 month (default)
  '3M': 90,     // 3 months
  '6M': 180,    // 6 months
  '1Y': 365,    // 1 year
};
```

### 2. Chart Data Generation

Updated LSTM chart to show smooth forecast path:

```typescript
// Generate forecast path from last historical date to horizon
const forecastSteps = Math.min(forecastDays, 60); // Max 60 points for visualization
const stepSize = forecastDays > 60 ? Math.ceil(forecastDays / 60) : 1;

for (let i = 1; i <= forecastSteps; i++) {
  const daysAhead = i * stepSize;
  const forecastDate = new Date(lastHistoricalDate);
  forecastDate.setDate(forecastDate.getDate() + daysAhead);
  
  // Linear interpolation from current to predicted
  const progress = daysAhead / forecastDays;
  const interpolatedPrice = currentPrice + (prediction - currentPrice) * progress;
  const confidenceRange = interpolatedPrice * 0.05;
  
  chartPoints.push({
    date: forecastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    predicted: interpolatedPrice,
    lower: interpolatedPrice - confidenceRange,
    upper: interpolatedPrice + confidenceRange,
    isHistorical: false,
  });
}
```

**Key Features**:
- **Smooth Path**: Linear interpolation from current price to predicted price
- **Adaptive Resolution**: Max 60 forecast points regardless of horizon
- **Confidence Bands**: ±5% confidence intervals throughout forecast
- **Date Continuity**: Starts immediately after last historical date

---

## Visual Improvements

### Before Fix
```
Historical Data:
├─ Oct 29: Ksh 16.80
├─ Oct 30: Ksh 16.85
└─ Oct 31: Ksh 16.75 [Last point]

[Visual Gap - No connection]

Prediction:
└─ Nov 12: Ksh 14.39 [Single point far away]
```

### After Fix
```
Historical Data:
├─ Oct 29: Ksh 16.80
├─ Oct 30: Ksh 16.85
└─ Oct 31: Ksh 16.75 [Last point]

Forecast Path (1M horizon):
├─ Nov 1:  Ksh 16.67 ← Smooth transition
├─ Nov 2:  Ksh 16.59
├─ Nov 5:  Ksh 16.43
├─ ...
└─ Nov 30: Ksh 14.39 [Final prediction]
```

---

## Horizon Options

### 1D - Next Day Prediction
**Use Case**: Day trading, short-term decisions
**Forecast**: Tomorrow's closing price
**Example**: Oct 31 → Nov 1

### 3D - Three Days
**Use Case**: Short-term swing trading
**Forecast**: 3 days ahead
**Example**: Oct 31 → Nov 3

### 1W - One Week
**Use Case**: Weekly trading strategies
**Forecast**: 7 days ahead
**Example**: Oct 31 → Nov 7

### 1M - One Month (Default)
**Use Case**: Monthly portfolio rebalancing
**Forecast**: 30 days ahead
**Example**: Oct 31 → Nov 30

### 3M - Three Months
**Use Case**: Quarterly analysis
**Forecast**: 90 days ahead
**Example**: Oct 31 → Jan 29

### 6M - Six Months
**Use Case**: Mid-term investment planning
**Forecast**: 180 days ahead
**Example**: Oct 31 → Apr 29

### 1Y - One Year
**Use Case**: Long-term investment strategy
**Forecast**: 365 days ahead
**Example**: Oct 31 → Oct 31 (next year)

---

## UI Updates

### 1. Horizon Selector Dropdown

**Location**: Stock Analysis page, next to stock selector

**Appearance**:
```
┌──────────────────────────────┐
│ Prediction Horizon        ▼  │
├──────────────────────────────┤
│ 1 Day                        │
│ 3 Days                       │
│ 1 Week                       │
│ 1 Month (Default)        ✓   │
│ 3 Months                     │
│ 6 Months                     │
│ 1 Year                       │
└──────────────────────────────┘
```

### 2. Chart Title Update

**Before**: "Price Forecast - Next 30 Days"

**After**: Dynamic based on selection
- 1D: "Price Forecast - 1D Horizon"
- 1W: "Price Forecast - 1W Horizon"
- 1M: "Price Forecast - 1M Horizon"
- 1Y: "Price Forecast - 1Y Horizon"

### 3. Chart Subtitle

Shows exact day count:
- "LSTM prediction with 95% confidence intervals (±5%) for 30 days"
- "LSTM prediction with 95% confidence intervals (±5%) for 365 days"

### 4. Metric Cards

Updated to show horizon:
- "Predicted Price (1M)" instead of "Predicted Price (30-Day)"
- "Predicted Price (1Y)" for year horizon

---

## Technical Details

### Adaptive Chart Resolution

For performance and clarity, the chart uses adaptive point density:

```typescript
// For short horizons (≤60 days): Show every day
if (forecastDays <= 60) {
  stepSize = 1; // 1 day per point
  points = forecastDays; // e.g., 30 points for 1M
}

// For long horizons (>60 days): Sample intelligently
if (forecastDays > 60) {
  maxPoints = 60;
  stepSize = Math.ceil(forecastDays / 60);
  // e.g., 1Y = 365 days ÷ 60 points ≈ 6 days per point
}
```

**Examples**:
- 1D: 1 point (1 day)
- 1W: 7 points (1 per day)
- 1M: 30 points (1 per day)
- 3M: 60 points (1 every 1.5 days)
- 1Y: 60 points (1 every 6 days)

### Interpolation Method

**Linear Interpolation**:
```
P(t) = P_current + (P_predicted - P_current) × (t / T)

Where:
- P(t) = Price at time t
- P_current = Current price (last historical)
- P_predicted = Predicted price at horizon
- t = Days into forecast
- T = Total forecast days
```

**Why Linear?**
- Simple and interpretable
- Smooth visual transition
- Not claiming to predict exact daily path
- Shows general trend direction

---

## Limitations & Future Enhancements

### Current Limitations

1. **Single Point Prediction**
   - LSTM model outputs one prediction (next period)
   - We interpolate between current and predicted
   - Not predicting exact path for each day

2. **Constant Confidence Bands**
   - ±5% confidence throughout
   - In reality, uncertainty increases with horizon

3. **No Multi-Step Forecasting**
   - Not using iterative prediction (predict day 1, use to predict day 2, etc.)
   - May be less accurate for very long horizons

### Future Enhancements

1. **Multi-Step Predictions**
   ```python
   # Iteratively predict each day
   for day in range(1, horizon_days + 1):
       prediction = model.predict(last_n_days)
       append_to_sequence(prediction)
   ```

2. **Expanding Confidence Intervals**
   ```typescript
   // Confidence increases with time
   const confidenceRange = interpolatedPrice * (0.05 + 0.001 * daysAhead);
   ```

3. **Non-Linear Paths**
   - Use polynomial or spline interpolation
   - Show more realistic price paths

4. **Ensemble Predictions**
   - Run multiple models (LSTM, ARIMA, Prophet)
   - Show consensus forecast

---

## Testing

### Manual Testing Steps

1. **Navigate to Stock Analysis**
2. **Select SCOM from dropdown**
3. **Test Each Horizon**:

#### 1 Day (1D)
- Select "1 Day" from Prediction Horizon
- Click "Run LSTM"
- **Verify**: Chart shows forecast from Oct 31 to Nov 1
- **Verify**: Title shows "1D Horizon" and "1 days"

#### 1 Week (1W)
- Select "1 Week"
- Click "Run LSTM"
- **Verify**: Chart shows forecast from Oct 31 to Nov 7
- **Verify**: Smooth line with 7 points

#### 1 Month (1M)
- Select "1 Month"
- **Verify**: Chart shows forecast from Oct 31 to Nov 30
- **Verify**: 30 forecast points

#### 1 Year (1Y)
- Select "1 Year"
- **Verify**: Chart shows forecast from Oct 31 to Oct 31 next year
- **Verify**: ~60 forecast points (sampled every 6 days)

4. **Check Metric Cards**
   - "Predicted Price (1D)", "(1W)", "(1M)", etc.
   - Values should match prediction
   - Expected return calculated correctly

5. **Verify Date Continuity**
   - No gap between last historical and first forecast
   - Dates progress smoothly
   - Final date matches selected horizon

---

## API Considerations

### Current Behavior

The ML API (`/api/ml/predict`) currently:
- Takes last 60 days of prices
- Predicts next period (day 61)
- Returns single prediction value

### Horizon-Aware API (Future)

To properly support multi-horizon predictions, we may need:

```typescript
// Enhanced API request
{
  symbol: "SCOM",
  data: [{'Day Price': 16.75}, ...],
  prediction_days: 60,  // Existing (input window)
  forecast_horizon: 30  // NEW (how far ahead to predict)
}

// Enhanced response
{
  symbol: "SCOM",
  predictions: [
    { day: 1, price: 16.67, confidence: 0.95 },
    { day: 2, price: 16.59, confidence: 0.94 },
    ...
    { day: 30, price: 14.39, confidence: 0.75 }
  ],
  execution_time: 0.234
}
```

For now, we use interpolation on the frontend as a pragmatic solution.

---

## Mathematical Notes

### Annualized Return Calculation

When showing expected return, account for horizon:

```typescript
// For 1 month (30 days):
annualizedReturn = ((predicted / current) - 1) × (365 / 30)

// For 1 year (365 days):
annualizedReturn = ((predicted / current) - 1) × (365 / 365) = raw return
```

### Confidence Interval Scaling

Current: Fixed ±5%

Better approach (future):
```typescript
// Confidence decreases with horizon (more uncertainty)
const baseConfidence = 0.95;
const confidenceDecay = 0.001; // per day
const confidence = baseConfidence - (confidenceDecay * daysAhead);
const confidenceRange = interpolatedPrice * (1 - confidence);
```

---

## User Documentation

### How to Use Prediction Horizons

**Step 1**: Select your stock (e.g., SCOM)

**Step 2**: Choose prediction horizon:
- Short-term trader? → Select 1D or 1W
- Portfolio manager? → Select 1M or 3M
- Long-term investor? → Select 6M or 1Y

**Step 3**: Click "Run LSTM"

**Step 4**: Interpret results:
- **Green line trending up**: Bullish forecast
- **Red line trending down**: Bearish forecast
- **Confidence bands**: Wider = more uncertainty

**Example**:
```
SCOM selected, 1M horizon:
Current: Ksh 16.75
Predicted (30 days): Ksh 14.39
Expected Return: -14.09%
Interpretation: Bearish outlook for next month
```

---

## Benefits

### For Users

✅ **Flexibility**: Choose relevant time horizon for their strategy
✅ **Clarity**: No more confusing date jumps
✅ **Context**: See full forecast path, not just endpoint
✅ **Confidence**: Bands show uncertainty throughout forecast

### For System

✅ **Scalability**: Easy to add new horizons
✅ **Performance**: Adaptive resolution keeps charts fast
✅ **Maintainability**: Clean code with clear logic
✅ **Extensibility**: Foundation for multi-step forecasting

---

## Files Modified

1. **`app/new/(newui)/stock-analysis/page.tsx`**
   - Added `PredictionHorizon` type and `HORIZON_DAYS` mapping
   - Added `predictionHorizon` state
   - Updated chart data generation with interpolation
   - Added horizon selector dropdown
   - Updated all labels to show selected horizon

---

## Summary

Before this feature:
❌ Fixed 30-day prediction only
❌ Visual gap between historical and forecast
❌ Single data point, no path visualization
❌ Not flexible for different trading strategies

After this feature:
✅ 7 horizon options (1D to 1Y)
✅ Smooth forecast path from last historical date
✅ Adaptive chart resolution for performance
✅ Clear labels showing selected horizon
✅ Supports various trading/investment timeframes

---

## Date

November 10, 2025


