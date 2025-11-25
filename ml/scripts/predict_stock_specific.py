#!/usr/bin/env python3
"""
Stock-Specific Model Prediction Script

This script runs predictions on stock-specific LSTM models.
It loads the trained models from stock_specific_v2 directory and makes predictions.

Usage:
    python predict_stock_specific.py SCOM                    # Single stock prediction
    python predict_stock_specific.py SCOM EQTY KCB          # Multiple stocks
    python predict_stock_specific.py --all                   # All trained stocks
    python predict_stock_specific.py --list                  # List available models
"""

import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
import warnings
warnings.filterwarnings('ignore')

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
import tensorflow as tf
import joblib
from loguru import logger

# Configuration
MODELS_DIR = Path(__file__).parent.parent / "trained_models" / "stock_specific_v2"
DATASETS_DIR = Path(__file__).parent.parent / "datasets"
PREDICTION_DAYS = 60


def load_stock_model(stock_code: str) -> Optional[Dict[str, Any]]:
    """Load stock-specific model, scaler, and metadata."""
    model_path = MODELS_DIR / f"{stock_code}_best.h5"
    scaler_path = MODELS_DIR / f"{stock_code}_scaler.joblib"
    metadata_path = MODELS_DIR / f"{stock_code}_metadata.json"
    
    if not model_path.exists():
        logger.error(f"Model not found: {model_path}")
        return None
    
    if not scaler_path.exists():
        logger.error(f"Scaler not found: {scaler_path}")
        return None
    
    try:
        # Load model
        model = tf.keras.models.load_model(model_path)
        
        # Load scaler
        scaler = joblib.load(scaler_path)
        
        # Load metadata
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        
        logger.success(f"Loaded model for {stock_code}")
        return {
            'model': model,
            'scaler': scaler,
            'metadata': metadata,
            'stock_code': stock_code
        }
    
    except Exception as e:
        logger.error(f"Error loading model for {stock_code}: {e}")
        return None


def load_stock_data(stock_code: str, end_date: Optional[str] = None) -> pd.DataFrame:
    """Load historical data for a specific stock."""
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
        except Exception as e:
            logger.debug(f"Skipping {file.name}: {e}")
            continue
    
    if not dfs:
        raise ValueError(f"No data found for stock {stock_code}")
    
    combined = pd.concat(dfs, ignore_index=True)
    combined['Date'] = pd.to_datetime(combined['Date'], format='%d-%b-%Y', errors='coerce')
    combined = combined.dropna(subset=['Date'])
    combined = combined.sort_values('Date')
    
    if end_date:
        combined = combined[combined['Date'] <= end_date]
    
    return combined


def prepare_prediction_data(df: pd.DataFrame, prediction_days: int = PREDICTION_DAYS) -> np.ndarray:
    """Prepare data for prediction."""
    df_recent = df.tail(prediction_days).copy()
    
    # Clean and convert Day Price
    df_recent['Day Price'] = df_recent['Day Price'].astype(str).str.replace(',', '')
    df_recent['Day Price'] = pd.to_numeric(df_recent['Day Price'], errors='coerce')
    df_recent = df_recent.dropna(subset=['Day Price'])
    
    if len(df_recent) < prediction_days:
        logger.warning(f"Only {len(df_recent)} records available, need {prediction_days}")
    
    prices = df_recent['Day Price'].values
    return prices


def make_prediction(model_data: Dict[str, Any], prices: np.ndarray) -> Dict[str, Any]:
    """Make prediction using stock-specific model."""
    model = model_data['model']
    scaler = model_data['scaler']
    stock_code = model_data['stock_code']
    metadata = model_data['metadata']
    
    # Scale the input data
    prices_scaled = scaler.transform(prices.reshape(-1, 1))
    
    # Reshape for LSTM [samples, time_steps, features]
    X = prices_scaled.reshape(1, -1, 1)
    
    # Make prediction
    prediction_scaled = model.predict(X, verbose=0)[0][0]
    
    # Inverse transform to get actual price
    prediction = scaler.inverse_transform([[prediction_scaled]])[0][0]
    
    # Calculate statistics
    price_min = prices.min()
    price_max = prices.max()
    price_mean = prices.mean()
    price_last = prices[-1]
    
    # Prediction change
    change = prediction - price_last
    change_pct = (change / price_last) * 100
    
    result = {
        'stock_code': stock_code,
        'prediction': float(prediction),
        'prediction_scaled': float(prediction_scaled),
        'last_price': float(price_last),
        'change': float(change),
        'change_pct': float(change_pct),
        'price_range': {
            'min': float(price_min),
            'max': float(price_max),
            'mean': float(price_mean)
        },
        'model_info': {
            'mae': metadata.get('best_val_mae', 'N/A'),
            'mape': metadata.get('best_val_mape', 'N/A'),
            'training_date': metadata.get('training_date', 'N/A')
        }
    }
    
    return result


def predict_single_stock(stock_code: str, show_details: bool = True) -> Optional[Dict[str, Any]]:
    """Run prediction for a single stock."""
    logger.info(f"\n{'='*70}")
    logger.info(f"Predicting: {stock_code}")
    logger.info(f"{'='*70}")
    
    # Load model
    model_data = load_stock_model(stock_code)
    if model_data is None:
        return None
    
    # Load data
    try:
        df = load_stock_data(stock_code, end_date="2024-10-31")
        logger.info(f"Loaded {len(df)} historical records")
        logger.info(f"Date range: {df['Date'].min()} to {df['Date'].max()}")
    except ValueError as e:
        logger.error(str(e))
        return None
    
    # Prepare data
    prices = prepare_prediction_data(df, PREDICTION_DAYS)
    logger.info(f"Using last {len(prices)} days for prediction")
    
    # Make prediction
    result = make_prediction(model_data, prices)
    
    # Display results
    if show_details:
        logger.info(f"\n{'─'*70}")
        logger.info("PREDICTION RESULTS")
        logger.info(f"{'─'*70}")
        logger.info(f"Stock:           {result['stock_code']}")
        logger.info(f"Last Price:      {result['last_price']:.4f} KES")
        logger.info(f"Predicted:       {result['prediction']:.4f} KES")
        logger.info(f"Change:          {result['change']:+.4f} KES ({result['change_pct']:+.2f}%)")
        logger.info(f"Price Range:     {result['price_range']['min']:.2f} - {result['price_range']['max']:.2f} KES")
        logger.info(f"{'─'*70}")
        logger.info(f"Model MAE:       {result['model_info']['mae']}")
        logger.info(f"Model MAPE:      {result['model_info']['mape']}")
        logger.info(f"Trained:         {result['model_info']['training_date']}")
        logger.info(f"{'='*70}\n")
    
    return result


def predict_multiple_stocks(stock_codes: List[str]) -> List[Dict[str, Any]]:
    """Run predictions for multiple stocks."""
    logger.info(f"\n{'='*70}")
    logger.info(f"BATCH PREDICTION: {len(stock_codes)} stocks")
    logger.info(f"{'='*70}\n")
    
    results = []
    successful = 0
    failed = 0
    
    for stock_code in stock_codes:
        result = predict_single_stock(stock_code, show_details=False)
        if result:
            results.append(result)
            successful += 1
        else:
            failed += 1
    
    # Display summary
    logger.info(f"\n{'='*70}")
    logger.info("BATCH PREDICTION SUMMARY")
    logger.info(f"{'='*70}")
    logger.info(f"Total:     {len(stock_codes)}")
    logger.info(f"Success:   {successful}")
    logger.info(f"Failed:    {failed}")
    logger.info(f"{'='*70}\n")
    
    # Display results table
    if results:
        logger.info(f"{'Stock':<8} {'Last Price':>12} {'Predicted':>12} {'Change':>12} {'Change %':>10} {'MAE':>8}")
        logger.info(f"{'─'*8} {'─'*12} {'─'*12} {'─'*12} {'─'*10} {'─'*8}")
        
        for r in results:
            mae = r['model_info']['mae']
            mae_str = f"{mae:.4f}" if isinstance(mae, (int, float)) else "N/A"
            
            logger.info(
                f"{r['stock_code']:<8} "
                f"{r['last_price']:>12.4f} "
                f"{r['prediction']:>12.4f} "
                f"{r['change']:>+12.4f} "
                f"{r['change_pct']:>+9.2f}% "
                f"{mae_str:>8}"
            )
        
        logger.info(f"{'='*70}\n")
    
    return results


def list_available_models() -> List[str]:
    """List all available stock-specific models."""
    model_files = sorted(MODELS_DIR.glob("*_best.h5"))
    stock_codes = [f.name.replace("_best.h5", "") for f in model_files]
    
    logger.info(f"\n{'='*70}")
    logger.info(f"AVAILABLE STOCK-SPECIFIC MODELS ({len(stock_codes)})")
    logger.info(f"{'='*70}\n")
    
    # Load metadata for each model
    models_info = []
    for stock_code in stock_codes:
        metadata_path = MODELS_DIR / f"{stock_code}_metadata.json"
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            models_info.append({
                'code': stock_code,
                'mae': metadata.get('best_val_mae', 'N/A'),
                'mape': metadata.get('best_val_mape', 'N/A'),
                'date': metadata.get('training_date', 'N/A')
            })
        else:
            models_info.append({
                'code': stock_code,
                'mae': 'N/A',
                'mape': 'N/A',
                'date': 'N/A'
            })
    
    # Display table
    logger.info(f"{'Stock':<8} {'MAE':>10} {'MAPE':>10} {'Training Date':<20}")
    logger.info(f"{'─'*8} {'─'*10} {'─'*10} {'─'*20}")
    
    for info in models_info:
        mae_str = f"{info['mae']:.4f}" if isinstance(info['mae'], (int, float)) else info['mae']
        mape_str = f"{info['mape']:.4f}" if isinstance(info['mape'], (int, float)) else info['mape']
        
        logger.info(
            f"{info['code']:<8} "
            f"{mae_str:>10} "
            f"{mape_str:>10} "
            f"{info['date']:<20}"
        )
    
    logger.info(f"{'='*70}\n")
    
    return stock_codes


def save_results_to_file(results: List[Dict[str, Any]], filename: str = "predictions.json"):
    """Save prediction results to JSON file."""
    output_path = Path(__file__).parent.parent / filename
    
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.success(f"Results saved to: {output_path}")


if __name__ == "__main__":
    # Configure logger
    logger.remove()
    logger.add(lambda msg: print(msg, end=""), level="INFO", colorize=True)
    
    if len(sys.argv) < 2:
        print("\nStock-Specific Model Prediction Script")
        print("=" * 70)
        print("\nUsage:")
        print("  python predict_stock_specific.py --list                # List available models")
        print("  python predict_stock_specific.py SCOM                  # Single stock")
        print("  python predict_stock_specific.py SCOM EQTY KCB        # Multiple stocks")
        print("  python predict_stock_specific.py --all                 # All trained stocks")
        print("  python predict_stock_specific.py --all --save          # Save results to file")
        print()
        sys.exit(1)
    
    command = sys.argv[1].upper()
    
    if command == "--LIST":
        list_available_models()
    
    elif command == "--ALL":
        stock_codes = list_available_models()
        results = predict_multiple_stocks(stock_codes)
        
        if "--save" in [arg.lower() for arg in sys.argv]:
            save_results_to_file(results)
    
    else:
        # Single or multiple stocks
        stock_codes = [code.upper() for code in sys.argv[1:] if not code.startswith("--")]
        
        if len(stock_codes) == 1:
            result = predict_single_stock(stock_codes[0])
            
            if result and "--save" in [arg.lower() for arg in sys.argv]:
                save_results_to_file([result], f"prediction_{stock_codes[0]}.json")
        
        else:
            results = predict_multiple_stocks(stock_codes)
            
            if results and "--save" in [arg.lower() for arg in sys.argv]:
                save_results_to_file(results)
