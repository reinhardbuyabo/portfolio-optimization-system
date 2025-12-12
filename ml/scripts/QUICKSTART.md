# Quick Start: Testing ML API Predictions

## Prerequisites
- API server running on http://localhost:8000
- Python 3 installed
- Historical stock data in `ml/datasets/`

## Setup (One Time)

### Terminal 1: Start API Server
```bash
cd ml
tox -e serve-dev
```

Wait until you see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Running Tests

### Terminal 2: Run Prediction Tests

```bash
cd ml

# List all available stocks (73 stocks from NSE data)
python3 scripts/test_predictions.py list

# Test prediction for a single stock
python3 scripts/test_predictions.py single SCOM

# Test batch prediction for multiple stocks
python3 scripts/test_predictions.py batch SCOM EQTY KCB COOP
```

## What the Script Does

1. **Auto-installs dependencies** (pandas, requests, loguru) if missing
2. **Loads historical data** from your CSV files (2013 - Oct 31, 2024)
3. **Formats data** with correct `Day Price` column
4. **Calls the API** (single or batch endpoint)
5. **Shows results** with execution times and metrics

## Example Output

```
============================================================
Testing predictions for SCOM
============================================================

Loading data from 12 files for stock SCOM
Loaded 2847 records for SCOM (from 2013-01-02 to 2024-10-31)
Using last 60 days of data for prediction
Date range: 2024-08-05 to 2024-10-31
Making prediction for SCOM...
Prediction: 0.0234 (took 0.3421s)
```

## Popular Stock Codes to Test

- **SCOM** - Safaricom (most traded)
- **EQTY** - Equity Group
- **KCB** - KCB Group  
- **COOP** - Co-operative Bank
- **KPLC** - Kenya Power
- **EABL** - East African Breweries

## Metrics Tracked

- ✅ Prediction value (scaled 0-1)
- ✅ Execution time per stock
- ✅ Batch processing time
- ✅ Success/failure counts
- ✅ API response headers

## Troubleshooting

**"Connection refused"**: API server not running
- Solution: Start with `tox -e serve-dev`

**"No data found for stock XXX"**: Stock code doesn't exist
- Solution: Run `list` command to see available stocks

**"ModuleNotFoundError"**: Dependencies missing (shouldn't happen)
- Solution: Script auto-installs, but can manually run: `pip3 install pandas requests loguru`

## Next: Add November Data for Validation

To compare predictions with actual results:

1. Create file: `ml/datasets/NSE_data_all_stocks_2024_nov_onwards.csv`
2. Use same CSV format as existing files
3. Script will automatically show prediction accuracy

## More Details

See `TESTING_GUIDE.md` for complete documentation.
