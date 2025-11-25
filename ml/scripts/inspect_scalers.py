#!/usr/bin/env python3
"""
Scaler Diagnostic Tool

Inspects MinMaxScaler objects to identify potential data leakage or scaling issues.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import json
import pandas as pd
import numpy as np
from loguru import logger

MODELS_DIR = Path(__file__).parent.parent / "trained_models" / "stock_specific_v2"
DATASETS_DIR = Path(__file__).parent.parent / "datasets"


def load_historical_data(stock_code: str) -> pd.DataFrame:
    """Load all historical data for a stock."""
    all_files = sorted(DATASETS_DIR.glob("NSE_data_all_stocks_*.csv"))
    all_files = [f for f in all_files if "sector" not in f.name.lower()]
    
    dfs = []
    for file in all_files:
        try:
            df = pd.read_csv(file)
            df.columns = df.columns.str.strip()
            if 'CODE' in df.columns:
                df.rename(columns={'CODE': 'Code', 'DATE': 'Date'}, inplace=True)
            
            if 'Code' not in df.columns:
                continue
            
            stock_df = df[df['Code'] == stock_code].copy()
            if not stock_df.empty:
                dfs.append(stock_df)
        except Exception:
            continue
    
    if not dfs:
        return pd.DataFrame()
    
    combined = pd.concat(dfs, ignore_index=True)
    combined['Date'] = pd.to_datetime(combined['Date'], format='%d-%b-%Y', errors='coerce')
    combined = combined.dropna(subset=['Date'])
    combined = combined.sort_values('Date')
    
    # Clean price data
    combined['Day Price'] = combined['Day Price'].astype(str).str.replace(',', '')
    combined['Day Price'] = pd.to_numeric(combined['Day Price'], errors='coerce')
    combined = combined.dropna(subset=['Day Price'])
    
    return combined


def inspect_scaler(stock_code: str) -> dict:
    """Inspect a stock's scaler for potential issues."""
    scaler_path = MODELS_DIR / f"{stock_code}_scaler.joblib"
    
    if not scaler_path.exists():
        return {'error': 'Scaler not found'}
    
    # Load scaler
    scaler = joblib.load(scaler_path)
    
    # Get scaler parameters
    data_min = float(scaler.data_min_[0])
    data_max = float(scaler.data_max_[0])
    data_range = float(scaler.data_range_[0])
    
    # Load historical data
    df = load_historical_data(stock_code)
    
    if df.empty:
        return {'error': 'No historical data'}
    
    # Calculate actual data statistics
    all_prices = df['Day Price'].values
    actual_min = float(all_prices.min())
    actual_max = float(all_prices.max())
    actual_range = actual_max - actual_min
    
    # Recent data (last 60 days)
    recent_prices = df.tail(60)['Day Price'].values
    recent_min = float(recent_prices.min())
    recent_max = float(recent_prices.max())
    
    # Training data (80% split)
    train_size = int(len(df) * 0.8)
    train_prices = df.head(train_size)['Day Price'].values
    train_min = float(train_prices.min())
    train_max = float(train_prices.max())
    
    # Detect potential issues
    issues = []
    
    # Check if scaler matches all data (bad - data leakage)
    if abs(data_min - actual_min) < 0.01 and abs(data_max - actual_max) < 0.01:
        issues.append('⚠️ POTENTIAL DATA LEAKAGE: Scaler may be fitted on entire dataset')
    
    # Check if scaler matches training data (good)
    if abs(data_min - train_min) < 0.01 and abs(data_max - train_max) < 0.01:
        issues.append('✅ Scaler appears to be fitted on training data only')
    
    # Check if recent prices are outside scaler range
    if recent_min < data_min or recent_max > data_max:
        issues.append(f'⚠️ Recent prices outside scaler range')
    
    return {
        'stock_code': stock_code,
        'scaler_min': data_min,
        'scaler_max': data_max,
        'scaler_range': data_range,
        'actual_min': actual_min,
        'actual_max': actual_max,
        'actual_range': actual_range,
        'train_min': train_min,
        'train_max': train_max,
        'recent_min': recent_min,
        'recent_max': recent_max,
        'total_records': len(df),
        'train_records': train_size,
        'issues': issues
    }


def main():
    """Main inspection function."""
    logger.remove()
    logger.add(lambda msg: print(msg, end=""), level="INFO", colorize=True)
    
    # Get all available models
    model_files = sorted(MODELS_DIR.glob("*_best.h5"))
    stock_codes = [f.name.replace("_best.h5", "") for f in model_files]
    
    logger.info("="*80)
    logger.info(f"SCALER DIAGNOSTIC ANALYSIS ({len(stock_codes)} models)")
    logger.info("="*80)
    logger.info("")
    
    results = []
    
    for stock_code in stock_codes:
        logger.info(f"\n{'─'*80}")
        logger.info(f"Analyzing: {stock_code}")
        logger.info(f"{'─'*80}")
        
        result = inspect_scaler(stock_code)
        
        if 'error' in result:
            logger.error(f"  Error: {result['error']}")
            continue
        
        results.append(result)
        
        # Display scaler info
        logger.info(f"\nScaler Range:")
        logger.info(f"  Min: {result['scaler_min']:.4f} KES")
        logger.info(f"  Max: {result['scaler_max']:.4f} KES")
        logger.info(f"  Range: {result['scaler_range']:.4f} KES")
        
        logger.info(f"\nHistorical Data:")
        logger.info(f"  All Data Min/Max: {result['actual_min']:.2f} - {result['actual_max']:.2f} KES")
        logger.info(f"  Training Min/Max: {result['train_min']:.2f} - {result['train_max']:.2f} KES")
        logger.info(f"  Recent (60d) Min/Max: {result['recent_min']:.2f} - {result['recent_max']:.2f} KES")
        
        logger.info(f"\nData Points:")
        logger.info(f"  Total: {result['total_records']}")
        logger.info(f"  Training (80%): {result['train_records']}")
        
        # Display issues
        if result['issues']:
            logger.info(f"\nDiagnostics:")
            for issue in result['issues']:
                logger.info(f"  {issue}")
        else:
            logger.info(f"\n⚠️ Unable to determine scaler source")
    
    # Summary
    logger.info(f"\n\n{'='*80}")
    logger.info("SUMMARY")
    logger.info(f"{'='*80}\n")
    
    data_leakage = [r for r in results if any('DATA LEAKAGE' in i for i in r['issues'])]
    correct_scaling = [r for r in results if any('✅' in i for i in r['issues'])]
    out_of_range = [r for r in results if any('outside scaler range' in i for i in r['issues'])]
    
    logger.info(f"Total Models Analyzed: {len(results)}")
    logger.info(f"Potential Data Leakage: {len(data_leakage)}")
    logger.info(f"Correct Scaling: {len(correct_scaling)}")
    logger.info(f"Recent Prices Out of Range: {len(out_of_range)}")
    
    if data_leakage:
        logger.warning(f"\n⚠️ Models with Potential Data Leakage:")
        for r in data_leakage:
            logger.warning(f"  - {r['stock_code']}")
        logger.warning(f"\n  Action: Retrain these models with proper train/test split")
    
    if out_of_range:
        logger.info(f"\n⚠️ Models with Recent Prices Outside Scaler Range:")
        for r in out_of_range:
            logger.info(f"  - {r['stock_code']}: Recent [{r['recent_min']:.2f}-{r['recent_max']:.2f}] vs Scaler [{r['scaler_min']:.2f}-{r['scaler_max']:.2f}]")
        logger.info(f"\n  Note: This may indicate stock price has moved beyond training range")
    
    logger.info(f"\n{'='*80}\n")


if __name__ == "__main__":
    main()
