#!/usr/bin/env python3
"""
Analyze LSTM prediction bias across multiple stocks.

This script tests predictions on various stocks to determine if there's
a systematic downward bias or if predictions reflect mean reversion.

Usage:
    python3 analyze_prediction_bias.py
"""

import sys
import subprocess
from pathlib import Path

# Check dependencies
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

def get_historical_stats(stock_code: str) -> dict:
    """Get historical price statistics for a stock."""
    all_files = sorted(DATASETS_DIR.glob("NSE_data_all_stocks_*.csv"))
    all_files = [f for f in all_files if "sector" not in f.name.lower()]
    
    dfs = []
    for file in all_files:
        try:
            df = pd.read_csv(file)
            df.columns = df.columns.str.strip()
            if 'CODE' in df.columns:
                df.rename(columns={'CODE': 'Code'}, inplace=True)
            
            if 'Code' in df.columns:
                stock_df = df[df['Code'] == stock_code].copy()
                if not stock_df.empty:
                    dfs.append(stock_df)
        except Exception as e:
            logger.warning(f"Error reading {file.name}: {e}")
            continue
    
    if not dfs:
        return None
    
    combined = pd.concat(dfs, ignore_index=True)
    combined['Date'] = pd.to_datetime(combined['Date'], format='%d-%b-%Y', errors='coerce')
    combined = combined.dropna(subset=['Date'])
    combined = combined.sort_values('Date')
    
    # Parse prices
    combined['Day Price'] = combined['Day Price'].astype(str).str.replace(',', '')
    combined['Day Price'] = pd.to_numeric(combined['Day Price'], errors='coerce')
    combined = combined.dropna(subset=['Day Price'])
    
    prices = combined['Day Price'].values
    
    return {
        'code': stock_code,
        'total_days': len(prices),
        'mean': np.mean(prices),
        'median': np.median(prices),
        'std': np.std(prices),
        'min': np.min(prices),
        'max': np.max(prices),
        'last_60_mean': np.mean(prices[-60:]) if len(prices) >= 60 else np.mean(prices),
        'last_price': prices[-1],
        'last_date': combined.iloc[-1]['Date'].strftime('%Y-%m-%d'),
    }

def make_prediction(stock_code: str) -> dict:
    """Make LSTM prediction for a stock."""
    # Load data
    all_files = sorted(DATASETS_DIR.glob("NSE_data_all_stocks_*.csv"))
    all_files = [f for f in all_files if "sector" not in f.name.lower()]
    
    dfs = []
    for file in all_files:
        try:
            df = pd.read_csv(file)
            df.columns = df.columns.str.strip()
            if 'CODE' in df.columns:
                df.rename(columns={'CODE': 'Code'}, inplace=True)
            
            if 'Code' in df.columns:
                stock_df = df[df['Code'] == stock_code].copy()
                if not stock_df.empty:
                    dfs.append(stock_df)
        except Exception:
            continue
    
    if not dfs:
        return None
    
    combined = pd.concat(dfs, ignore_index=True)
    combined['Date'] = pd.to_datetime(combined['Date'], format='%d-%b-%Y', errors='coerce')
    combined = combined.dropna(subset=['Date'])
    combined = combined.sort_values('Date')
    combined = combined[combined['Date'] <= '2024-10-31']
    
    # Parse prices
    combined['Day Price'] = combined['Day Price'].astype(str).str.replace(',', '')
    combined['Day Price'] = pd.to_numeric(combined['Day Price'], errors='coerce')
    combined = combined.dropna(subset=['Day Price'])
    
    # Take last 60 days
    df_recent = combined.tail(60)
    data_records = df_recent[['Day Price']].to_dict(orient='records')
    
    payload = {
        "symbol": stock_code,
        "data": data_records,
        "prediction_days": 60
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/predict/lstm", json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Prediction failed for {stock_code}: {e}")
        return None

def analyze_stock(stock_code: str) -> dict:
    """Analyze a single stock for bias."""
    logger.info(f"\nAnalyzing {stock_code}...")
    
    # Get historical stats
    stats = get_historical_stats(stock_code)
    if not stats:
        logger.error(f"No data for {stock_code}")
        return None
    
    # Make prediction
    prediction = make_prediction(stock_code)
    if not prediction:
        logger.error(f"Prediction failed for {stock_code}")
        return None
    
    # Calculate metrics
    current = stats['last_price']
    predicted = prediction['prediction']
    historical_mean = stats['mean']
    recent_mean = stats['last_60_mean']
    
    predicted_return = ((predicted - current) / current) * 100
    distance_from_mean = ((current - historical_mean) / historical_mean) * 100
    predicted_vs_mean = ((predicted - historical_mean) / historical_mean) * 100
    
    result = {
        'symbol': stock_code,
        'current_price': current,
        'predicted_price': predicted,
        'predicted_return_%': predicted_return,
        'historical_mean': historical_mean,
        'recent_60d_mean': recent_mean,
        'current_vs_mean_%': distance_from_mean,
        'predicted_vs_mean_%': predicted_vs_mean,
        'is_bearish': predicted < current,
        'is_mean_reversion': abs(predicted - historical_mean) < abs(current - historical_mean),
    }
    
    return result

def main():
    logger.remove()
    logger.add(lambda msg: print(msg, end=""), level="INFO", colorize=True)
    
    # Test stocks across different price ranges and sectors
    test_stocks = [
        # High price (>100)
        'SCBK', 'SBIC',
        # Mid-high price (50-100)
        'EQTY', 'KCB', 'NCBA',
        # Mid price (10-50)
        'SCOM', 'COOP', 'ABSA',
        # Low price (<10)
        'NBK', 'HFCK',
    ]
    
    results = []
    for stock in test_stocks:
        result = analyze_stock(stock)
        if result:
            results.append(result)
    
    if not results:
        logger.error("No results obtained")
        return
    
    # Convert to DataFrame for analysis
    df = pd.DataFrame(results)
    
    # Summary statistics
    print("\n" + "="*80)
    print("BIAS ANALYSIS SUMMARY")
    print("="*80)
    
    print(f"\nTotal stocks analyzed: {len(df)}")
    print(f"Bearish predictions: {df['is_bearish'].sum()} ({df['is_bearish'].mean()*100:.1f}%)")
    print(f"Bullish predictions: {(~df['is_bearish']).sum()} ({(~df['is_bearish']).mean()*100:.1f}%)")
    
    print(f"\nMean predicted return: {df['predicted_return_%'].mean():.2f}%")
    print(f"Median predicted return: {df['predicted_return_%'].median():.2f}%")
    print(f"Std dev of predicted returns: {df['predicted_return_%'].std():.2f}%")
    
    print(f"\nMean reversion predictions: {df['is_mean_reversion'].sum()} ({df['is_mean_reversion'].mean()*100:.1f}%)")
    print(f"Non-mean-reversion: {(~df['is_mean_reversion']).sum()}")
    
    # By current price level
    print("\n" + "-"*80)
    print("ANALYSIS BY CURRENT PRICE POSITION")
    print("-"*80)
    
    above_mean = df[df['current_vs_mean_%'] > 5]
    below_mean = df[df['current_vs_mean_%'] < -5]
    near_mean = df[abs(df['current_vs_mean_%']) <= 5]
    
    print(f"\nStocks ABOVE historical mean (>{5}%):")
    print(f"  Count: {len(above_mean)}")
    if len(above_mean) > 0:
        print(f"  Avg predicted return: {above_mean['predicted_return_%'].mean():.2f}%")
        print(f"  Bearish predictions: {above_mean['is_bearish'].sum()} / {len(above_mean)}")
    
    print(f"\nStocks NEAR historical mean (±{5}%):")
    print(f"  Count: {len(near_mean)}")
    if len(near_mean) > 0:
        print(f"  Avg predicted return: {near_mean['predicted_return_%'].mean():.2f}%")
        print(f"  Bearish predictions: {near_mean['is_bearish'].sum()} / {len(near_mean)}")
    
    print(f"\nStocks BELOW historical mean (<-{5}%):")
    print(f"  Count: {len(below_mean)}")
    if len(below_mean) > 0:
        print(f"  Avg predicted return: {below_mean['predicted_return_%'].mean():.2f}%")
        print(f"  Bullish predictions: {(~below_mean['is_bearish']).sum()} / {len(below_mean)}")
    
    # Detailed table
    print("\n" + "-"*80)
    print("DETAILED RESULTS")
    print("-"*80)
    print(df[['symbol', 'current_price', 'predicted_price', 'predicted_return_%', 
              'current_vs_mean_%', 'is_bearish', 'is_mean_reversion']].to_string(index=False))
    
    # Interpretation
    print("\n" + "="*80)
    print("INTERPRETATION")
    print("="*80)
    
    bearish_pct = df['is_bearish'].mean() * 100
    mean_reversion_pct = df['is_mean_reversion'].mean() * 100
    
    if bearish_pct > 70:
        if mean_reversion_pct > 60:
            print("\n✓ LIKELY MEAN REVERSION, NOT BIAS")
            print("  Most predictions are bearish because current prices are elevated.")
            print("  This is normal market behavior (reversion to mean).")
        else:
            print("\n⚠ POTENTIAL DOWNWARD BIAS")
            print("  High percentage of bearish predictions across all price levels.")
            print("  Consider investigating:")
            print("  - Scaling strategy (MinMaxScaler on recent window)")
            print("  - Training data composition (more bear than bull markets?)")
            print("  - Model architecture (too conservative?)")
    elif bearish_pct < 30:
        print("\n⚠ POTENTIAL UPWARD BIAS")
        print("  Most predictions are bullish - model may be too optimistic.")
    else:
        print("\n✓ BALANCED PREDICTIONS")
        print("  Predictions appear balanced across bullish/bearish outcomes.")
    
    if abs(df['predicted_return_%'].mean()) < 2:
        print("\n✓ PREDICTIONS NEAR ZERO MEAN")
        print("  Average predicted return is close to zero - model is not systematically biased.")
    elif df['predicted_return_%'].mean() < -2:
        print(f"\n⚠ NEGATIVE MEAN RETURN: {df['predicted_return_%'].mean():.2f}%")
        print("  Average prediction is negative - investigate if justified by market conditions.")
    else:
        print(f"\n⚠ POSITIVE MEAN RETURN: {df['predicted_return_%'].mean():.2f}%")
        print("  Average prediction is positive - model may be overly optimistic.")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    main()



