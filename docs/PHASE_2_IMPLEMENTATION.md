# Phase 2 Implementation: Display ML Predictions in Portfolio Table

## ✅ Completed Features

### 1. Batch Prediction Enhancement
**File:** `app/api/ml/batch/predict/route.ts`
- ✅ Now runs **both LSTM and GARCH** predictions in parallel
- ✅ Calculates `expectedReturn` for each stock
- ✅ Returns combined results with all prediction data

**Response Structure:**
```json
{
  "results": [
    {
      "symbol": "SCOM",
      "currentPrice": 16.50,
      "lstm": {
        "prediction": 17.25,
        "horizon": 1
      },
      "garch": {
        "volatility_annualized": 0.22
      },
      "expectedReturn": 0.0455,
      "status": "success"
    }
  ],
  "total": 5,
  "successful": 5,
  "failed": 0
}
```

### 2. Portfolio Table Enhancements
**File:** `app/(dashboard)/portfolios/[id]/page.tsx`

#### New State Variables
- `predictions`: Stores ML prediction data
- `hasPredictions`: Boolean flag for showing/hiding prediction columns
- `showMLPredictions`: Reads `?mlPredictions=true` query parameter

#### Updated HoldingRow Interface
```typescript
interface HoldingRow {
  // ... existing fields
  predictedPrice?: number;      // NEW: LSTM prediction
  expectedReturn?: number;       // NEW: Calculated return
  volatility?: number;           // NEW: GARCH volatility
}
```

#### Conditional Table Columns
**When predictions are NOT loaded:**
| Ticker | Name | Sector | Weight | Value | Shares | Price | Change | Actions |

**When predictions ARE loaded:**
| Ticker | Name | Sector | Weight | Value | Shares | Price | **Predicted Price** | **Expected Return** | **Volatility** | Change | Actions |

### 3. Prediction Loading Logic

#### Auto-load on Redirect
```typescript
useEffect(() => {
  if (showMLPredictions && portfolioId) {
    const stored = sessionStorage.getItem(`portfolio_predictions_${portfolioId}`);
    if (stored) {
      const data = JSON.parse(stored);
      setPredictions(data.predictions);
      setHasPredictions(true);
      toast.success("ML predictions loaded");
    }
  }
}, [showMLPredictions, portfolioId]);
```

#### Clear Predictions Function
```typescript
const clearPredictions = () => {
  sessionStorage.removeItem(`portfolio_predictions_${portfolioId}`);
  setPredictions(null);
  setHasPredictions(false);
  toast.info("Predictions cleared");
  window.history.replaceState({}, '', `/portfolios/${portfolioId}`);
};
```

### 4. UI Enhancements

#### "Clear Predictions" Button
- Only shows when predictions are loaded
- Yellow warning color (matches "temporary" status)
- Removes predictions and query parameter

#### Prediction Column Styling
- **Predicted Price**: Blue color (`text-chart-1`) - indicates ML prediction
- **Expected Return**: Green (positive) / Red (negative) - indicates gain/loss
- **Volatility**: Muted foreground - neutral metric

## User Flow

### Scenario 1: Run Batch Predictions
1. User on Stock Analysis page
2. Clicks "Run Batch" button
3. Selects portfolio
4. BatchRunModal runs LSTM + GARCH on all stocks
5. Stores results in sessionStorage
6. Redirects to `/portfolios/{id}?mlPredictions=true`
7. ✅ **Table shows 3 new columns with predictions**
8. ✅ **Toast: "ML predictions loaded - 5 stocks analyzed"**

### Scenario 2: View Predictions Later
1. User navigates to portfolio page normally
2. If predictions exist in sessionStorage
3. ✅ **Can manually add `?mlPredictions=true` to URL**
4. ✅ **Predictions load and display**

### Scenario 3: Clear Predictions
1. User viewing portfolio with predictions
2. Clicks "Clear Predictions" button
3. ✅ **Prediction columns disappear**
4. ✅ **URL updates to remove query parameter**
5. ✅ **Toast: "Predictions cleared"**

## Testing Checklist

### ✅ Phase 2 Testing
- [ ] Run batch prediction from Stock Analysis page
- [ ] Verify redirect to `/portfolios/{id}?mlPredictions=true`
- [ ] Check that 3 new columns appear: Predicted Price, Expected Return, Volatility
- [ ] Verify predicted prices are reasonable (close to current price)
- [ ] Verify expected returns show as percentages with + or - sign
- [ ] Verify volatility shows as percentage
- [ ] Click "Clear Predictions" button
- [ ] Verify columns disappear and URL updates
- [ ] Manually add `?mlPredictions=true` to URL
- [ ] Verify predictions reload from sessionStorage

### Sample Data Verification
For a stock like SCOM at 16.50 KES:
- ✅ Predicted Price should be near 16.50 (e.g., 16.75)
- ✅ Expected Return should be small (e.g., +1.5% or -0.8%)
- ✅ Volatility should be 15-30% (typical for NSE stocks)

## Next Phases

### Phase 3: Portfolio Metrics (NEXT)
- Calculate mean return, mean volatility from predictions
- Display Sharpe Ratio, Sortino Ratio, Max Drawdown
- Update portfolio metric cards with ML-based values

### Phase 4: Portfolio Optimization
- Add "Optimize Portfolio" button
- Rebalance weights to maximize Sharpe Ratio
- Show before/after comparison

### Phase 5: Risk-Return Chart
- Create efficient frontier visualization
- Plot stocks on risk-return graph
- Add chart view toggle

### Phase 6: Export Report
- Generate PDF/Excel report
- Include all predictions and metrics
- Add download button

## Files Modified

1. ✅ `app/api/ml/batch/predict/route.ts` - Enhanced to run LSTM + GARCH
2. ✅ `lib/portfolio-predictions.ts` - Utility functions for metrics (created, ready for Phase 3)
3. ✅ `app/(dashboard)/portfolios/[id]/page.tsx` - Table with prediction columns

## Benefits

### For Users
- ✅ See ML predictions directly in portfolio table
- ✅ Make informed decisions based on expected returns
- ✅ Understand risk (volatility) for each holding
- ✅ Easy to toggle predictions on/off

### For System
- ✅ Clean separation: predictions stored in sessionStorage
- ✅ No database changes needed
- ✅ Predictions persist across page refreshes
- ✅ Easy to clear and re-run

## Known Limitations

1. **SessionStorage Scope**: Predictions only persist in current browser tab
2. **No Historical Predictions**: Only latest run is stored
3. **Manual Trigger**: User must run batch predictions manually

These limitations will be addressed in future phases (export reports, save predictions to database).
