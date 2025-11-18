# GARCH Model Validations & Error Handling

## Overview

This document describes all the validations implemented to ensure the GARCH model works correctly and provides meaningful feedback to users through toast notifications.

## Validation Layers

### 1. Python ML Service Validations (`ml/api/routes/garch.py`)

#### Input Validations

**Validation 1: Empty Data Check**
```python
if not req.log_returns:
    raise ValueError("log_returns cannot be empty")
```
- **Purpose**: Ensure data is provided
- **User Impact**: Prevents crashes from missing data

**Validation 2: Minimum Data Points**
```python
if len(req.log_returns) < 30:
    raise ValueError(f"Insufficient data: need at least 30 returns, got {len(req.log_returns)}")
```
- **Purpose**: GARCH requires minimum data for reliable estimation
- **Reason**: GARCH(1,1) has 3-4 parameters to estimate, needs sufficient observations
- **User Impact**: Clear message about data requirements

**Validation 3: Invalid Values Check**
```python
invalid_count = sum(1 for r in req.log_returns if not np.isfinite(r))
if invalid_count > 0:
    raise ValueError(f"Data contains {invalid_count} invalid values (NaN or Infinity)")
```
- **Purpose**: Detect NaN, Infinity, or other invalid numbers
- **User Impact**: Identifies data quality issues

**Validation 4: Zero Variance Check**
```python
if np.std(returns_array) == 0:
    raise ValueError("Data has zero variance - all returns are identical")
```
- **Purpose**: Volatility modeling requires price variation
- **User Impact**: Catches data errors (e.g., all same values)

**Validation 5: Extreme Outlier Detection**
```python
max_abs_return = np.max(np.abs(returns_array))
if max_abs_return > 0.5:
    logger.warning(f"Extreme return detected for {symbol}: {max_abs_return:.2%}")
```
- **Purpose**: Flag unusual data (>50% daily return)
- **User Impact**: Warning (not error) - proceeds but logs concern

#### Output Validations

**Validation 6: Valid Forecast Check**
```python
if forecasted_variance is None or not np.isfinite(forecasted_variance):
    raise ValueError("GARCH model produced invalid forecast")
```
- **Purpose**: Ensure model computation succeeded
- **User Impact**: Catches model fitting failures

**Validation 7: Negative Variance Check**
```python
if forecasted_variance < 0:
    raise ValueError(f"Negative variance forecast: {forecasted_variance}")
```
- **Purpose**: Variance must be non-negative by definition
- **User Impact**: Catches mathematical errors

**Validation 8: Unrealistic Volatility Check**
```python
if volatility_annualized > 5.0:
    raise ValueError(f"Unrealistic volatility: {volatility_annualized:.1%}")
```
- **Purpose**: Sanity check (>500% annual volatility is extreme)
- **User Impact**: Prevents displaying nonsensical results

**Validation 9: High Volatility Warning**
```python
if volatility_annualized > 1.0:
    logger.warning(f"Unusually high variance for {symbol}: {forecasted_variance}")
```
- **Purpose**: Flag high but not impossible volatility (>100%)
- **User Impact**: Logs warning without blocking

### 2. Next.js API Validations (`app/api/ml/garch/predict/route.ts`)

#### Request Validations

**Validation 1: Required Fields**
```typescript
if (!symbol || !data) {
  return NextResponse.json(
    { detail: 'Symbol and data are required' },
    { status: 400 }
  );
}
```

**Validation 2: Data Format**
```typescript
if (!Array.isArray(data) || data.length === 0) {
  return NextResponse.json(
    { detail: 'Data must be a non-empty array' },
    { status: 400 }
  );
}
```

**Validation 3: Minimum Data Points (API level)**
```typescript
if (data.length < 30) {
  return NextResponse.json(
    { detail: `Insufficient data for GARCH: need at least 30 price points, got ${data.length}` },
    { status: 400 }
  );
}
```
- **Note**: Checked early to avoid unnecessary ML service calls

**Validation 4: Price Data Quality**
```typescript
for (let i = 0; i < prices.length; i++) {
  if (prices[i] === null || prices[i] === undefined) {
    errors.push(`Price at index ${i} is null or undefined`);
  }
  if (isNaN(prices[i])) {
    errors.push(`Price at index ${i} is NaN`);
  }
  if (prices[i] <= 0) {
    errors.push(`Price at index ${i} is non-positive: ${prices[i]}`);
  }
}
```
- **Purpose**: Validate before calculating log returns
- **Catches**: Missing, invalid, or negative prices

**Validation 5: Log Return Calculation**
```typescript
const logReturn = Math.log(prices[i] / prices[i-1]);
if (!isFinite(logReturn)) {
  errors.push(`Invalid log return at index ${i}: ${logReturn}`);
}
```
- **Purpose**: Ensure log returns are calculable
- **Catches**: Division by zero, log of negative

#### Response Validations

**Validation 6: ML Service Response**
```typescript
if (!prediction.forecasted_variance || !isFinite(prediction.forecasted_variance)) {
  return NextResponse.json(
    { detail: 'ML service returned invalid variance forecast' },
    { status: 500 }
  );
}

if (!prediction.volatility_annualized || !isFinite(prediction.volatility_annualized)) {
  return NextResponse.json(
    { detail: 'ML service returned invalid volatility forecast' },
    { status: 500 }
  );
}
```
- **Purpose**: Validate ML service output before sending to frontend
- **User Impact**: Prevents displaying invalid predictions

### 3. Frontend Validations (`app/(dashboard)/stock-analysis/page.tsx`)

#### Pre-Request Validations

**Validation 1: Historical Data Exists**
```typescript
if (!historicalData || historicalData.length === 0) {
  toast.error("No historical data available", {
    description: "Please select a stock with available price data"
  });
  return;
}
```
- **User Feedback**: Toast notification
- **Action**: Prevents API call

**Validation 2: Minimum Data for Model**
```typescript
const minDataPoints = activeTab === 'garch' ? 30 : 60;
if (historicalData.length < minDataPoints) {
  toast.error(`Insufficient data for ${activeTab.toUpperCase()}`, {
    description: `Need at least ${minDataPoints} days of data, have ${historicalData.length}`
  });
  return;
}
```
- **Model-Specific**: GARCH needs 30, LSTM needs 60
- **User Feedback**: Clear message with actual vs. required

#### Post-Response Validations

**Validation 3: GARCH Result Validation**
```typescript
if (activeTab === 'garch') {
  if (!result.volatility_annualized || !isFinite(result.volatility_annualized)) {
    toast.error("Invalid GARCH forecast", {
      id: 'prediction',
      description: "The model returned invalid volatility forecast"
    });
    throw new Error("Invalid GARCH forecast received");
  }
}
```

#### Chart Data Validations

**Validation 4: GARCH Chart Data**
```typescript
// Validate forecasted volatility
if (!forecastedVolatility || isNaN(forecastedVolatility)) {
  console.warn('Invalid GARCH forecasted volatility');
  return [];
}

// Only add if valid
if (!isNaN(annualizedVol) && isFinite(annualizedVol)) {
  points.push({
    date: historicalData[i].date,
    volatility: annualizedVol * 100,
    type: 'historical'
  });
}
```
- **Purpose**: Prevent NaN values in charts
- **User Impact**: Clean charts, no rendering errors

## Toast Notifications

### Success Messages

**GARCH Forecast Complete**
```typescript
toast.success("GARCH forecast complete", {
  id: 'prediction',
  description: `Volatility: ${formatPercent(result.volatility_annualized * 100)}`
});
```

**Batch Predictions Complete**
```typescript
toast.success("Batch predictions complete", {
  id: 'batch-prediction',
  description: `${successCount} successful${failedCount > 0 ? `, ${failedCount} failed` : ''}`
});
```

### Error Messages

**Insufficient Data**
```typescript
toast.error(`Insufficient data for GARCH`, {
  description: `Need at least 30 days of data, have ${historicalData.length}`
});
```

**Invalid Forecast**
```typescript
toast.error("Invalid GARCH forecast", {
  description: "The model returned invalid volatility forecast"
});
```

**No Assets in Portfolio**
```typescript
toast.error("No assets in portfolio", {
  description: "Add stocks to your portfolio first"
});
```

### Loading States

**Running Model**
```typescript
toast.loading(`Running GARCH model...`, { id: 'prediction' });
```

**Batch Processing**
```typescript
toast.loading(`Running predictions for ${symbols.length} stocks...`, {
  id: 'batch-prediction'
});
```

## Error Flow Example

### Scenario: User tries to run GARCH with insufficient data

1. **Frontend Check** (stock-analysis/page.tsx)
   ```
   User clicks "Run GARCH"
   → Check: historicalData.length < 30
   → Toast: "Insufficient data for GARCH"
   → Return (no API call)
   ```

2. **If Frontend Check Bypassed** (API route)
   ```
   API receives request
   → Check: data.length < 30
   → Return 400: "Insufficient data for GARCH: need at least 30..."
   ```

3. **If API Check Bypassed** (ML service)
   ```
   ML service receives request
   → Check: len(req.log_returns) < 30
   → Return error: "Insufficient data: need at least 30 returns..."
   ```

**Result**: Triple-layer protection ensures user gets clear feedback at earliest possible point.

## Validation Benefits

### 1. **Data Quality Assurance**
- ✅ No NaN or Infinity values in predictions
- ✅ No negative variances
- ✅ Realistic volatility ranges

### 2. **User Experience**
- ✅ Clear, actionable error messages
- ✅ Toast notifications for immediate feedback
- ✅ No cryptic technical errors

### 3. **System Reliability**
- ✅ Prevents crashes from invalid data
- ✅ Catches errors at earliest layer
- ✅ Comprehensive logging for debugging

### 4. **Performance**
- ✅ Frontend validations prevent unnecessary API calls
- ✅ API validations prevent ML service load
- ✅ Early exit on obvious errors

## Testing the Validations

### Test Case 1: Insufficient Data
```bash
# Send request with only 20 data points (need 30)
curl -X POST http://localhost:3000/api/ml/garch/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol": "TEST", "data": [...]}'  # 20 points

# Expected: 400 error with clear message
```

### Test Case 2: Invalid Price Data
```bash
# Send data with NaN or negative prices
curl -X POST http://localhost:3000/api/ml/garch/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol": "TEST", "data": [{"Day Price": -10}, ...]}'

# Expected: 400 error about non-positive prices
```

### Test Case 3: Zero Variance
```bash
# Send identical prices (no variation)
curl -X POST http://localhost:3000/api/ml/garch/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol": "TEST", "data": [{"Day Price": 15}, {"Day Price": 15}, ...]}'

# Expected: 400 error about zero variance
```

## Summary

The GARCH model now has **9 validation layers** plus comprehensive toast notifications:

| Layer | Validations | Feedback Method |
|-------|------------|-----------------|
| Frontend | 4 | Toast notifications |
| Next.js API | 6 | HTTP errors + toasts |
| Python ML | 9 | HTTP errors + logging |

**Total Protection**: 19 validation checks ensure reliable, user-friendly GARCH forecasting! 🎯
