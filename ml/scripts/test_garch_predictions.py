#!/usr/bin/env python3
"""
Test GARCH volatility predictions.

Usage:
    python3 test_garch_predictions.py single SCOM
    python3 test_garch_predictions.py batch SCOM EQTY KCB
"""

import sys
import subprocess
from pathlib import Path

# Ensure dependencies
def ensure_dependencies():
    required = ['pandas', 'requests', 'loguru', 'numpy']
    missing = []
    for package in required:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    if missing:
        print(f"Installing: {', '.join(missing)}")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--quiet'] + missing)

ensure_dependencies()

import pandas as pd
import numpy as np
import requests
from loguru import logger

API_BASE_URL = "http://localhost:8000/api/v1"
DATASETS_DIR = Path(__file__).parent.parent / "datasets"


def get_log_returns(stock_code: str, n_days: int = 200) -> list:
    """Calculate log returns from historical prices."""
    all_files = sorted(DATASETS_DIR.glob("NSE_data_all_stocks_*.csv"))
    all_files = [f for f in all_files if "sector" not in f.name.lower()]
    
    dfs = []
    for file in all_files:
        df = pd.read_csv(file)
        df.columns = df.columns.str.strip()
        if 'CODE' in df.columns:
            df.rename(columns={'CODE': 'Code', 'DATE': 'Date'}, inplace=True)
        if 'Code' in df.columns:
            stock_df = df[df['Code'] == stock_code].copy()
            if not stock_df.empty:
                dfs.append(stock_df)
    
    if not dfs:
        raise ValueError(f"No data found for {stock_code}")
    
    combined = pd.concat(dfs, ignore_index=True)
    combined['Date'] = pd.to_datetime(combined['Date'], format='%d-%b-%Y', errors='coerce')
    combined = combined.dropna(subset=['Date'])
    combined = combined.sort_values('Date')
    combined = combined[combined['Date'] <= '2024-10-31']
    
    last_n = combined.tail(n_days)
    last_n['Day Price'] = last_n['Day Price'].astype(str).str.replace(',', '')
    last_n['Day Price'] = pd.to_numeric(last_n['Day Price'], errors='coerce')
    last_n = last_n.dropna(subset=['Day Price'])
    
    prices = last_n['Day Price'].values
    log_returns = np.log(prices[1:] / prices[:-1])
    
    logger.info(f"Calculated {len(log_returns)} log returns for {stock_code}")
    logger.info(f"  Range: [{log_returns.min():.6f}, {log_returns.max():.6f}]")
    logger.info(f"  Mean: {log_returns.mean():.6f}, Std: {log_returns.std():.6f}")
    
    return log_returns.tolist()


def test_single_garch(stock_code: str):
    """Test GARCH prediction for a single stock."""
    logger.info(f"\n{'='*60}")
    logger.info(f"Testing GARCH volatility for {stock_code}")
    logger.info(f"{'='*60}\n")
    
    try:
        log_returns = get_log_returns(stock_code, n_days=200)
        
        payload = {
            "symbol": stock_code,
            "log_returns": log_returns,
            "train_frac": 0.8
        }
        
        logger.info(f"Calling API with {len(log_returns)} log returns...")
        url = f"{API_BASE_URL}/predict/garch"
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        result = response.json()
        
        logger.success(
            f"Forecasted Variance: {result['forecasted_variance']:.8f}\n"
            f"Realized Variance: {result.get('realized_variance', 'N/A')}\n"
            f"Volatility (annualized): {np.sqrt(result['forecasted_variance'] * 252):.4f}\n"
            f"Execution time: {result['execution_time']:.4f}s"
        )
        
        return result
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {e}")
        if hasattr(e, 'response') and e.response:
            logger.error(f"Response: {e.response.text}")
        return None
    except Exception as e:
        logger.error(f"Error: {e}")
        return None


def test_batch_garch(stock_codes: list):
    """Test GARCH predictions for multiple stocks."""
    logger.info(f"\n{'='*60}")
    logger.info(f"Testing GARCH batch for {len(stock_codes)} stocks")
    logger.info(f"{'='*60}\n")
    
    stocks_data = []
    for code in stock_codes:
        try:
            log_returns = get_log_returns(code, n_days=200)
            stocks_data.append({
                "symbol": code,
                "log_returns": log_returns,
                "train_frac": 0.8
            })
        except Exception as e:
            logger.error(f"Skipping {code}: {e}")
    
    if not stocks_data:
        logger.error("No valid stocks to predict")
        return
    
    payload = {
        "stocks": stocks_data,
        "max_workers": 4
    }
    
    try:
        url = f"{API_BASE_URL}/predict/garch/batch"
        logger.info(f"Making batch prediction for {len(stocks_data)} stocks...")
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()
        
        logger.success(
            f"Batch completed: {result['successful']} success, {result['failed']} failed "
            f"in {result['execution_time']:.2f}s"
        )
        
        for item in result['results']:
            if 'forecasted_variance' in item:
                annualized_vol = np.sqrt(item['forecasted_variance'] * 252)
                logger.info(
                    f"  {item['symbol']}: "
                    f"Var={item['forecasted_variance']:.8f}, "
                    f"Vol(annual)={annualized_vol:.4f}, "
                    f"Time={item['execution_time']:.4f}s"
                )
            else:
                logger.error(f"  {item.get('symbol', 'Unknown')}: FAILED - {item.get('detail', 'unknown')}")
        
    except Exception as e:
        logger.error(f"Batch request failed: {e}")


if __name__ == "__main__":
    logger.remove()
    logger.add(lambda msg: print(msg, end=""), level="INFO", colorize=True)
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python3 test_garch_predictions.py single SCOM")
        print("  python3 test_garch_predictions.py batch SCOM EQTY KCB")
        print()
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "single":
        if len(sys.argv) < 3:
            logger.error("Please provide a stock code")
            sys.exit(1)
        stock_code = sys.argv[2].upper()
        test_single_garch(stock_code)
    
    elif command == "batch":
        if len(sys.argv) < 3:
            logger.error("Please provide at least one stock code")
            sys.exit(1)
        stock_codes = [code.upper() for code in sys.argv[2:]]
        test_batch_garch(stock_codes)
    
    else:
        logger.error(f"Unknown command: {command}")
        sys.exit(1)
