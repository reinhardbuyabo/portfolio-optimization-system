#!/usr/bin/env python3
"""
Test LSTM predictions against real data.

This script:
1. Loads historical stock data from CSV files
2. Formats it for the API
3. Makes predictions for November 2024 onwards
4. Compares with actual data if available
"""

import sys
import subprocess
from pathlib import Path

# Check and install dependencies
def ensure_dependencies():
    """Ensure required packages are installed in current environment."""
    required = ['pandas', 'requests', 'loguru']
    missing = []
    
    for package in required:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"Installing missing dependencies: {', '.join(missing)}")
        print("This may take a moment...\n")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--quiet'] + missing)
            print("Dependencies installed successfully!\n")
        except subprocess.CalledProcessError as e:
            print(f"Error installing dependencies: {e}")
            print("Please run: pip install pandas requests loguru")
            sys.exit(1)

ensure_dependencies()

import pandas as pd
import requests
import json
from typing import Optional, Dict, Any
from loguru import logger

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
DATASETS_DIR = Path(__file__).parent.parent / "datasets"
PREDICTION_DAYS = 60


def load_stock_data(stock_code: str, end_date: str = "2024-10-31") -> pd.DataFrame:
    """Load all historical data for a specific stock up to end_date."""
    all_files = sorted(DATASETS_DIR.glob("NSE_data_all_stocks_*.csv"))
    # Strictly filter out sector files
    all_files = [f for f in all_files if "sector" not in f.name.lower()]
    
    logger.info(f"Loading data from {len(all_files)} files for stock {stock_code}")
    
    dfs = []
    for file in all_files:
        try:
            df = pd.read_csv(file)
            # Normalize column names (older files use uppercase)
            df.columns = df.columns.str.strip()
            if 'CODE' in df.columns:
                df.rename(columns={'CODE': 'Code', 'DATE': 'Date'}, inplace=True)
            
            # Check if 'Code' column exists
            if 'Code' not in df.columns:
                logger.debug(f"Skipping {file.name}: no 'Code' column")
                continue
            # Filter for specific stock
            stock_df = df[df['Code'] == stock_code].copy()
            if not stock_df.empty:
                dfs.append(stock_df)
        except Exception as e:
            logger.warning(f"Error reading {file.name}: {e}")
            continue
    
    if not dfs:
        raise ValueError(f"No data found for stock {stock_code}")
    
    combined = pd.concat(dfs, ignore_index=True)
    combined['Date'] = pd.to_datetime(combined['Date'], format='%d-%b-%Y', errors='coerce')
    combined = combined.dropna(subset=['Date'])
    combined = combined.sort_values('Date')
    
    # Filter up to end_date
    combined = combined[combined['Date'] <= end_date]
    
    logger.info(f"Loaded {len(combined)} records for {stock_code} (from {combined['Date'].min()} to {combined['Date'].max()})")
    return combined


def prepare_api_payload(df: pd.DataFrame, symbol: str, prediction_days: int = PREDICTION_DAYS) -> Dict[str, Any]:
    """Prepare data for API request."""
    # Take last N days for prediction
    df_recent = df.tail(prediction_days).copy()
    
    if len(df_recent) < prediction_days:
        logger.warning(f"Only {len(df_recent)} records available, need {prediction_days}")
    
    # Ensure Day Price is numeric, remove commas if present
    df_recent['Day Price'] = df_recent['Day Price'].astype(str).str.replace(',', '')
    df_recent['Day Price'] = pd.to_numeric(df_recent['Day Price'], errors='coerce')
    df_recent = df_recent.dropna(subset=['Day Price'])
    
    # Convert to API format
    data_records = df_recent[['Day Price']].to_dict(orient='records')
    
    payload = {
        "symbol": symbol,
        "prediction_days": prediction_days,
        "data": data_records
    }
    
    return payload


def make_lstm_prediction(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Call LSTM prediction API."""
    url = f"{API_BASE_URL}/predict/lstm"
    
    try:
        logger.info(f"Making prediction for {payload['symbol']}...")
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        logger.success(
            f"Prediction: {result['prediction']:.4f} KES (scaled: {result['prediction_scaled']:.4f}) "
            f"[range: {result['price_range']['min']:.2f}-{result['price_range']['max']:.2f}] "
            f"(took {result['execution_time']:.4f}s)"
        )
        return result
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {e}")
        if hasattr(e.response, 'text'):
            logger.error(f"Response: {e.response.text}")
        return None


def load_november_data(stock_code: str) -> Optional[pd.DataFrame]:
    """Load November 2024 data if available for comparison."""
    # Check if there's a file with November data
    nov_file = DATASETS_DIR / "NSE_data_all_stocks_2024_nov_onwards.csv"
    
    if not nov_file.exists():
        logger.warning("No November 2024 data file found for comparison")
        return None
    
    df = pd.read_csv(nov_file)
    stock_df = df[df['Code'] == stock_code].copy()
    
    if stock_df.empty:
        logger.warning(f"No November data found for {stock_code}")
        return None
    
    stock_df['Date'] = pd.to_datetime(stock_df['Date'], format='%d-%b-%Y', errors='coerce')
    stock_df = stock_df.dropna(subset=['Date'])
    stock_df = stock_df.sort_values('Date')
    
    logger.info(f"Found {len(stock_df)} November records for comparison")
    return stock_df


def compare_prediction_with_actual(prediction: float, actual_df: pd.DataFrame) -> None:
    """Compare prediction with actual November data."""
    if actual_df is None or actual_df.empty:
        return
    
    # Get first day of November
    first_nov = actual_df.iloc[0]
    actual_price = first_nov['Day Price']
    
    error = abs(prediction - actual_price)
    error_pct = (error / actual_price) * 100
    
    logger.info("=" * 60)
    logger.info("PREDICTION vs ACTUAL COMPARISON")
    logger.info(f"Predicted price: {prediction:.4f} KES")
    logger.info(f"Actual price (Nov 1): {actual_price:.4f} KES")
    logger.info(f"Absolute error: {error:.4f} KES")
    logger.info(f"Percentage error: {error_pct:.2f}%")
    logger.info("=" * 60)


def test_single_stock(stock_code: str, compare_with_actual: bool = True):
    """Test prediction for a single stock."""
    logger.info(f"\n{'='*60}")
    logger.info(f"Testing predictions for {stock_code}")
    logger.info(f"{'='*60}\n")
    
    # Load training data (up to Oct 31)
    try:
        df = load_stock_data(stock_code, end_date="2024-10-31")
    except ValueError as e:
        logger.error(str(e))
        return
    
    # Prepare payload
    payload = prepare_api_payload(df, stock_code)
    
    logger.info(f"Using last {len(payload['data'])} days of data for prediction")
    logger.info(f"Date range: {df['Date'].iloc[-len(payload['data'])]} to {df['Date'].iloc[-1]}")
    
    # Make prediction
    result = make_lstm_prediction(payload)
    
    if result is None:
        return
    
    # Compare with actual if available
    if compare_with_actual:
        nov_data = load_november_data(stock_code)
        if nov_data is not None:
            compare_prediction_with_actual(result['prediction'], nov_data)


def test_batch_stocks(stock_codes: list, compare_with_actual: bool = True):
    """Test batch prediction for multiple stocks."""
    logger.info(f"\n{'='*60}")
    logger.info(f"Testing BATCH predictions for {len(stock_codes)} stocks")
    logger.info(f"{'='*60}\n")
    
    stocks_data = []
    
    for code in stock_codes:
        try:
            df = load_stock_data(code, end_date="2024-10-31")
            payload = prepare_api_payload(df, code)
            stocks_data.append(payload)
        except ValueError as e:
            logger.error(f"Skipping {code}: {e}")
    
    if not stocks_data:
        logger.error("No valid stocks to predict")
        return
    
    # Call batch API
    batch_payload = {
        "stocks": stocks_data,
        "max_workers": 4
    }
    
    url = f"{API_BASE_URL}/predict/lstm/batch"
    
    try:
        logger.info(f"Making batch prediction for {len(stocks_data)} stocks...")
        response = requests.post(url, json=batch_payload, timeout=60)
        response.raise_for_status()
        result = response.json()
        
        logger.success(f"Batch completed: {result['successful']} success, {result['failed']} failed in {result['execution_time']:.2f}s")
        
        # Display results
        for i, item in enumerate(result['results']):
            if 'prediction' in item:
                logger.info(
                    f"  {item['symbol']}: {item['prediction']:.4f} KES "
                    f"(scaled: {item['prediction_scaled']:.4f}) "
                    f"[range: {item['price_range']['min']:.2f}-{item['price_range']['max']:.2f}] "
                    f"(took {item['execution_time']:.4f}s)"
                )
                
                # Compare with actual
                if compare_with_actual:
                    nov_data = load_november_data(item['symbol'])
                    if nov_data is not None:
                        compare_prediction_with_actual(item['prediction'], nov_data)
            else:
                logger.error(f"  {stocks_data[i]['symbol']}: FAILED - {item.get('detail', 'unknown error')}")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Batch API request failed: {e}")
        if hasattr(e.response, 'text'):
            logger.error(f"Response: {e.response.text}")


def list_available_stocks(limit: int = 20) -> list:
    """List available stocks in the dataset."""
    logger.info("Scanning datasets for available stocks...")
    
    all_files = sorted(DATASETS_DIR.glob("NSE_data_all_stocks_*.csv"))
    # Strictly filter out sector files
    all_files = [f for f in all_files if "sector" not in f.name.lower()]
    
    all_codes = set()
    for file in all_files:
        try:
            df = pd.read_csv(file)
            # Normalize column names (older files use uppercase)
            df.columns = df.columns.str.strip()
            if 'CODE' in df.columns:
                df.rename(columns={'CODE': 'Code'}, inplace=True)
            
            # Check if 'Code' column exists
            if 'Code' not in df.columns:
                logger.warning(f"Skipping {file.name}: no 'Code' column")
                continue
            codes = df['Code'].unique()
            all_codes.update(codes)
        except Exception as e:
            logger.warning(f"Error reading {file.name}: {e}")
            continue
    
    # Remove index codes (starting with ^) and filter out NaN/None
    stock_codes = []
    for c in all_codes:
        if pd.isna(c):
            continue
        code_str = str(c).strip()
        if code_str and not code_str.startswith('^'):
            stock_codes.append(code_str)
    
    stock_codes = sorted(set(stock_codes))
    
    logger.info(f"Found {len(stock_codes)} unique stocks")
    logger.info(f"Sample stocks (first {limit}): {', '.join(stock_codes[:limit])}")
    
    return stock_codes


if __name__ == "__main__":
    import sys
    
    # Configure loguru
    logger.remove()
    logger.add(lambda msg: print(msg, end=""), level="INFO", colorize=True)
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python test_predictions.py list                    # List available stocks")
        print("  python test_predictions.py single SCOM             # Test single stock")
        print("  python test_predictions.py batch SCOM EQTY KPLC    # Test multiple stocks")
        print()
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "list":
        list_available_stocks(limit=50)
    
    elif command == "single":
        if len(sys.argv) < 3:
            logger.error("Please provide a stock code")
            sys.exit(1)
        stock_code = sys.argv[2].upper()
        test_single_stock(stock_code, compare_with_actual=True)
    
    elif command == "batch":
        if len(sys.argv) < 3:
            logger.error("Please provide at least one stock code")
            sys.exit(1)
        stock_codes = [code.upper() for code in sys.argv[2:]]
        test_batch_stocks(stock_codes, compare_with_actual=True)
    
    else:
        logger.error(f"Unknown command: {command}")
        sys.exit(1)
