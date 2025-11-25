# GARCH Volatility Integration Test Guide

## Overview

GARCH (Generalized Autoregressive Conditional Heteroskedasticity) is used to forecast **volatility** (risk) in stock prices. This complements LSTM price predictions by providing risk assessment.

## GARCH API Format

### Request Format
```json
{
  "symbol": "SCOM",
  "log_returns": [0.0015, -0.0023, 0.0018, ...],
  "train_frac": 0.8
}
```

**Fields:**
- `symbol`: Stock ticker (e.g., "SCOM")
- `log_returns`: Array of log returns calculated as `ln(price_t / price_t-1)`
- `train_frac`: Fraction of data to use for training (default: 0.8 = 80%)

### Response Format
```json
{
  "symbol": "SCOM",
  "forecasted_variance": 0.000324,
  "realized_variance": 0.000312,
  "execution_time": 0.0234
}
```

**Fields:**
- `forecasted_variance`: Daily variance forecast
- `realized_variance`: Optional - actual observed variance
- `execution_time`: Time taken to compute (seconds)

**Annualized Volatility Calculation:**
```
volatility_annualized = sqrt(forecasted_variance × 252)
```
Where 252 = number of trading days per year

## Implementation Status

### ✅ Backend (ML API)
- **File**: `ml/api/routes/garch.py`
- **Endpoint**: `POST /api/v1/predict/garch`
- **Status**: ✅ Working correctly

### ✅ Data Preparation
- **File**: `lib/api/ml-data-helper.ts`
- **Function**: `calculateLogReturns(prices: number[])`
- **Logic**:
  ```typescript
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > 0 && prices[i - 1] > 0) {
      const logReturn = Math.log(prices[i] / prices[i - 1]);
      returns.push(logReturn);
    }
  }
  ```
- **Status**: ✅ Correctly calculates log returns

### ✅ TypeScript Types
- **File**: `types/ml-api.ts`
- **Changes**: 
  ```typescript
  export interface GARCHVolatilityRequest {
    symbol: string;
    log_returns: number[];  // ✅ Correct field name
    train_frac?: number;
  }
  
  export interface GARCHVolatilityResponse {
    symbol: string;
    forecasted_variance: number;
    realized_variance?: number;
    volatility_annualized: number;  // ✅ Calculated on frontend
    execution_time: number;
  }
  ```
- **Status**: ✅ Matches Python API

### ✅ ML Client
- **File**: `lib/api/ml-client.ts`
- **Implementation**:
  ```typescript
  this.predictGARCH({ 
    symbol, 
    log_returns: returns,  // ✅ Correct field name
    train_frac: 0.8
  })
  
  // Calculate annualized volatility
  const volatility_annualized = Math.sqrt(garchData.forecasted_variance * 252);
  results.garch = {
    ...garchData,
    volatility_annualized,
  };
  ```
- **Status**: ✅ Correct request format and response transformation

### ✅ UI Display
- **File**: `app/new/(newui)/stock-analysis/page.tsx`
- **Features**:
  - Volatility chart visualization
  - Annualized volatility percentage
  - Daily variance (in basis points)
  - Risk classification (Low/Medium/High)
- **Status**: ✅ Displays all GARCH metrics

## Testing GARCH Predictions

### Test 1: Direct API Test (Python Script)

```bash
cd /Users/reinhard/portfolio-optimization-system/ml
python3 scripts/test_garch_predictions.py single SCOM
```

**Expected Output:**
```
============================================================
Testing GARCH volatility for SCOM
============================================================

Calculated 199 log returns for SCOM
  Range: [-0.123456, 0.098765]
  Mean: 0.000123, Std: 0.023456

Calling API with 199 log returns...
✓ Forecasted Variance: 0.00032400
Realized Variance: 0.00031200
Volatility (annualized): 0.2856
Execution time: 0.0234s
```

### Test 2: UI Test

1. **Navigate to Stock Analysis Page**
2. **Select SCOM from dropdown**
3. **Click "Run GARCH" button**
4. **Verify Results:**

   **Expected Display:**
   - ✅ Volatility Chart showing risk over time
   - ✅ "Annualized Volatility" card: e.g., "28.56%"
   - ✅ "Daily Variance" card: e.g., "3.2400 bps"
   - ✅ "Risk Classification" card: "Medium" (for 25-40% volatility)
   - ✅ Execution time displayed

5. **Check Browser Console:**
   - ✅ No errors
   - ✅ API call returns 200 OK
   - ✅ Response contains `forecasted_variance` and `volatility_annualized`

### Test 3: Combined LSTM + GARCH Test

This is the most realistic scenario - running both predictions together.

**In UI:**
1. Navigate to Stock Analysis page
2. Select SCOM
3. Click "Run LSTM" (this triggers both LSTM and GARCH)
4. Verify both tabs show results:
   - **LSTM Tab**: Price forecast with confidence intervals
   - **GARCH Tab**: Volatility chart and risk metrics

**Expected Combined Results:**
```
LSTM Prediction:
  - Predicted Price: Ksh 14.39
  - Expected Return: -14.09%
  - Confidence: ±0.72 KES

GARCH Volatility:
  - Annualized Volatility: 28.56%
  - Risk Classification: Medium
  - Daily Variance: 3.24 bps
```

## Volatility Interpretation

### Risk Classification Thresholds

```typescript
volatility_annualized > 0.4  (40%)  → High Risk (Red)
volatility_annualized > 0.25 (25%)  → Medium Risk (Yellow)
volatility_annualized ≤ 0.25 (25%)  → Low Risk (Green)
```

### What the Numbers Mean

| Annualized Volatility | Risk Level | Interpretation |
|----------------------|------------|----------------|
| < 15% | Very Low | Stable, blue-chip stock |
| 15-25% | Low | Moderate stability |
| 25-40% | Medium | Normal market volatility |
| 40-60% | High | Risky, high fluctuation |
| > 60% | Very High | Extremely volatile |

### Example: SCOM at 28.56% volatility
- **Classification**: Medium Risk
- **Meaning**: Price can swing ±28.56% annually with 68% confidence (1 standard deviation)
- **Daily Movement**: Expected daily price change of ~1.8% (28.56% / √252)

## Troubleshooting

### Issue: "Not enough data for GARCH"
**Solution**: Ensure at least 60 days of historical prices (produces 59 log returns)

### Issue: 422 Error on GARCH API call
**Checklist:**
- ✅ Using `log_returns` field name (not `returns`)
- ✅ Sending array of numbers (not objects)
- ✅ Values are valid floats (not NaN or Infinity)

### Issue: Volatility shows N/A
**Checklist:**
- ✅ Check browser console for API errors
- ✅ Verify `prepareMLData()` is calculating log returns
- ✅ Ensure GARCH response includes `forecasted_variance`

## API Endpoints

### Single GARCH Prediction
- **URL**: `http://localhost:8000/api/v1/predict/garch`
- **Method**: POST
- **Body**: See request format above

### Batch GARCH Predictions
- **URL**: `http://localhost:8000/api/v1/predict/garch/batch`
- **Method**: POST
- **Body**:
  ```json
  {
    "stocks": [
      {"symbol": "SCOM", "log_returns": [...], "train_frac": 0.8},
      {"symbol": "EQTY", "log_returns": [...], "train_frac": 0.8}
    ],
    "max_workers": 4
  }
  ```

## Files Reference

### Backend
- `ml/api/routes/garch.py` - GARCH API endpoint
- `ml/api/models/schemas.py` - Request/Response schemas
- `ml/pipeline/garch_model.py` - GARCH model implementation
- `ml/scripts/test_garch_predictions.py` - Test script

### Frontend
- `types/ml-api.ts` - TypeScript type definitions
- `lib/api/ml-client.ts` - ML API client
- `lib/api/ml-data-helper.ts` - Data preparation (log returns)
- `app/new/(newui)/stock-analysis/page.tsx` - UI implementation

## Next Steps

1. ✅ Test GARCH with test script
2. ✅ Test GARCH in UI
3. ✅ Verify volatility calculations are correct
4. 🔄 Use GARCH volatility in portfolio optimization
5. 🔄 Add historical volatility comparison charts

## Mathematical Reference

### Log Returns Formula
```
r_t = ln(P_t / P_{t-1})
```
Where:
- `r_t` = log return at time t
- `P_t` = price at time t
- `P_{t-1}` = price at time t-1

### Annualization Formula
```
σ_annual = σ_daily × √252
```
Where:
- `σ_annual` = annualized volatility
- `σ_daily` = daily volatility (standard deviation)
- 252 = trading days per year

### Variance to Volatility
```
volatility = √variance
```

## Date

November 10, 2025


