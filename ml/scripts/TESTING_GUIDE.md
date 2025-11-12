# ML API Testing Scripts

## test_predictions.py

Helper script to test LSTM predictions using real historical data from your datasets.

### Features
- Loads historical stock data from CSV files (2013-Oct 2024)
- Formats data correctly for the API
- Makes predictions for November 2024 onwards
- Compares predictions with actual November data (if available)
- Supports single stock and batch predictions
- Shows per-item execution metrics

### Prerequisites

1. **API Server Running**:
   ```bash
   cd ml
   tox -e serve-dev
   ```

2. **Dependencies**: The script will automatically install missing dependencies (pandas, requests, loguru) when you first run it.

### Usage

#### 1. List Available Stocks
```bash
cd ml
python3 scripts/test_predictions.py list
```

Example output:
```
Found 73 unique stocks
Sample stocks: ABSA, ARM, BAT, BAMB, BBK, BRIT, CAR, ...
```

#### 2. Test Single Stock Prediction
```bash
python3 scripts/test_predictions.py single SCOM
```

Example output:
```
============================================================
Testing predictions for SCOM
============================================================

Loading data from 12 files for stock SCOM
Loaded 2847 records for SCOM (from 2013-01-02 to 2024-10-31)
Using last 60 days of data for prediction
Date range: 2024-08-05 to 2024-10-31
Making prediction for SCOM...
Prediction: 13.2456 (took 0.3421s)

============================================================
PREDICTION vs ACTUAL COMPARISON
Predicted price: 13.2456
Actual price (Nov 1): 13.1800
Absolute error: 0.0656
Percentage error: 0.50%
============================================================
```

#### 3. Test Batch Predictions
```bash
python3 scripts/test_predictions.py batch SCOM EQTY KPLC SAFCOM
```

Example output:
```
============================================================
Testing BATCH predictions for 4 stocks
============================================================

Making batch prediction for 4 stocks...
Batch completed: 4 success, 0 failed in 1.23s

  SCOM: 13.2456 (took 0.3421s)
  EQTY: 45.6789 (took 0.2987s)
  KPLC: 2.3456 (took 0.3112s)
  SAFCOM: 28.9012 (took 0.2876s)
```

### Data Requirements

The script expects:
- CSV files in `ml/datasets/` directory
- Files named: `NSE_data_all_stocks_*.csv`
- Columns: `Date`, `Code`, `Day Price` (minimum required)
- Date format: `DD-MMM-YYYY` (e.g., `31-Oct-2024`)

### Testing with November 2024 Data

If you have November 2024 data for validation:
1. Create a file: `ml/datasets/NSE_data_all_stocks_2024_nov_onwards.csv`
2. Use the same format as existing files
3. The script will automatically compare predictions with actual values

### Common Stock Codes

Here are some popular NSE stocks you can test:
- **SCOM** - Safaricom
- **EQTY** - Equity Group
- **KCB** - KCB Group
- **COOP** - Co-operative Bank
- **ABSA** - ABSA Bank Kenya
- **SAFCOM** - Safaricom
- **KPLC** - Kenya Power
- **BAMB** - Bamburi Cement
- **EABL** - East African Breweries

### Error Handling

The script handles:
- Missing stock data (skips gracefully)
- API errors (logs details)
- Insufficient data points (warns and continues)
- Network timeouts (30s for single, 60s for batch)

### Performance Metrics

The script logs:
- **Per-prediction timing**: Individual execution time for each stock
- **Batch timing**: Total time for batch operations
- **API response headers**: X-Process-Time from middleware
- **Error rates**: Success/failure counts in batch operations

### Examples

**Find stocks with most data**:
```bash
python3 scripts/test_predictions.py list
```

**Test a well-traded stock**:
```bash
python3 scripts/test_predictions.py single SCOM
```

**Compare multiple banks**:
```bash
python3 scripts/test_predictions.py batch EQTY KCB COOP ABSA
```

**Test parallel processing**:
```bash
python3 scripts/test_predictions.py batch SCOM EQTY KCB COOP ABSA BAMB EABL KPLC
```

### Troubleshooting

**"No data found for stock XXX"**:
- Check if the stock code exists in your CSV files
- Run `list` command to see available stocks
- Verify the stock traded during 2013-2024

**"Input must include 'Day Price' column"**:
- This means the CSV files have wrong column names
- Check CSV format matches expected structure

**Connection refused**:
- Ensure API server is running: `tox -e serve-dev`
- Check URL: `http://localhost:8000/api/v1/health`

**Predictions seem off**:
- Remember: Model trained on historical patterns
- Stock market is inherently unpredictable
- Check if stock had unusual events in November

### Next Steps

After testing predictions:
1. Review accuracy metrics (percentage error)
2. Test with different stocks (high/low volatility)
3. Compare batch vs single prediction times
4. Test parallel processing with different `max_workers`
5. Add more November data for better validation

---

## Quick Reference

```bash
# Start API server (in one terminal)
cd ml
tox -e serve-dev

# Run tests (in another terminal)
cd ml

# List all available stocks
python3 scripts/test_predictions.py list

# Test single stock
python3 scripts/test_predictions.py single SCOM

# Test multiple stocks (batch)
python3 scripts/test_predictions.py batch SCOM EQTY KCB COOP
```

**Note**: The script automatically installs missing dependencies (pandas, requests, loguru) on first run.
