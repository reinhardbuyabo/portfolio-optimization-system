# Prediction Discrepancy Fix

## Problem

The UI was showing **different prediction values** compared to the direct ML API test script:

- **Test Script** (direct API): `14.3932 KES` for SCOM
- **UI** (via Next.js): `16.75 KES` for SCOM
- **Difference**: ~16% discrepancy

## Root Cause

The issue was caused by **different historical data sources**:

### Test Script (`ml/scripts/test_predictions.py`)
```python
# Loads from ALL CSV files (2013-2024)
all_files = sorted(DATASETS_DIR.glob("NSE_data_all_stocks_*.csv"))
all_files = [f for f in all_files if "sector" not in f.name.lower()]
# Results in: 2013.csv, 2014.csv, ... 2024.csv
```

### UI (Before Fix)
```typescript
// Only loaded from ONE file (2024 data)
const CSV_PATH = 'ml/datasets/NSE_data_all_stocks_2024_jan_to_oct.csv';
```

This caused:
- **Different training data** → Different patterns learned
- **Different price sequences** → Different predictions
- **Less historical context** → Less accurate forecasts

## Solution

Updated `lib/api/ml-data-helper.ts` to load from **all historical CSV files** (2013-2024), matching the test script behavior:

```typescript
function loadAllHistoricalData(symbol: string): CSVRow[] {
  // Get all CSV files, excluding sector files
  const allFiles = fs.readdirSync(DATASETS_DIR)
    .filter(file => file.startsWith('NSE_data_all_stocks_') && file.endsWith('.csv'))
    .filter(file => !file.toLowerCase().includes('sector'))
    .map(file => path.join(DATASETS_DIR, file))
    .sort();
    
  // Load and merge data from all files...
  // Sort by date to get complete historical timeline
}
```

## Changes Made

### File: `lib/api/ml-data-helper.ts`

1. **Removed**: Single CSV file path
2. **Added**: `loadAllHistoricalData()` function that:
   - Reads all `NSE_data_all_stocks_*.csv` files
   - Excludes sector files
   - Merges data from all years (2013-2024)
   - Sorts by date chronologically
   
3. **Updated**: Both `getHistoricalPrices()` and `getHistoricalPricesWithDates()` to use the new function

## Expected Outcome

After this fix:
- ✅ UI and test script now use **identical historical data**
- ✅ Predictions should **match** between UI and direct API calls
- ✅ More comprehensive data (2013-2024) leads to **better predictions**
- ✅ Consistent behavior across all interfaces

## Testing

To verify the fix:

1. **Run the test script**:
   ```bash
   cd ml
   python3 scripts/test_predictions.py single SCOM
   ```
   Note the prediction value.

2. **Run prediction in UI**:
   - Navigate to Stock Analysis page
   - Select SCOM
   - Click "Run LSTM"
   - Compare prediction with test script

3. **Expected**: Both should show **~14.39 KES** for SCOM (or very close values)

## Files Modified

- ✅ `/lib/api/ml-data-helper.ts` - Now loads from all CSV files

## Impact

- **Accuracy**: Predictions now based on 11+ years of data (2013-2024) instead of just 10 months (2024)
- **Consistency**: UI matches ML API test scripts exactly
- **Reliability**: Same data source = same predictions
- **Trust**: Users can verify predictions using test scripts

## Additional Notes

- The fix uses Node's native `fs.readdirSync()` instead of glob to avoid additional dependencies
- Handles both `Code`/`CODE` and `Date`/`DATE` column variations in CSV files
- Maintains backward compatibility with existing API interfaces
- All functions still respect the `days` parameter for limiting data points

## Date

November 10, 2025


