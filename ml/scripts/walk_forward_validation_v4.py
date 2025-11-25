#!/usr/bin/env python3
"""
Walk-Forward Validation for Stock-Specific Models (v4 Log Transformation)

This script performs comprehensive walk-forward validation using:
1. Expanding window approach (train on all past data)
2. Multiple prediction horizons (1-day, 5-day, 10-day, 30-day)
3. Comprehensive metrics (MAE, MAPE, Sharpe, Win Rate)
4. Proper handling of LogPriceScaler

Author: Reinhard
Date: 2024-11-18
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
import tensorflow as tf
from datetime import datetime, timedelta
import json
import warnings
warnings.filterwarnings('ignore')

from processing.log_scaler import LogPriceScaler
from loguru import logger
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error

# Configuration
MODELS_DIR = Path(__file__).parent.parent / "trained_models" / "stock_specific_v4_log"
DATASETS_DIR = Path(__file__).parent.parent / "datasets"
OUTPUT_DIR = Path(__file__).parent.parent / "trained_models"
PREDICTION_DAYS = 60

# Validation configuration
WALK_FORWARD_CONFIG = {
    'min_train_size': 200,  # Minimum days for training
    'test_horizons': [1, 5, 10, 30],  # Prediction horizons (days ahead)
    'refit_frequency': 30,  # Refit model every N days
    'min_test_samples': 100  # Minimum samples for test period (was 50)
}


def load_stock_data(stock_code: str) -> pd.DataFrame:
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


def create_sequences(data: np.ndarray, sequence_length: int):
    """Create LSTM sequences."""
    if data.ndim == 1:
        data = data.reshape(-1, 1)
    
    X, y = [], []
    for i in range(sequence_length, len(data)):
        X.append(data[i - sequence_length:i, 0])
        y.append(data[i, 0])
    
    return np.array(X), np.array(y)


def calculate_returns(prices: np.ndarray) -> np.ndarray:
    """Calculate returns from prices."""
    return np.diff(prices) / prices[:-1]


def calculate_sharpe_ratio(returns: np.ndarray, risk_free_rate: float = 0.05) -> float:
    """Calculate annualized Sharpe ratio."""
    if len(returns) < 2:
        return 0.0
    
    daily_rf = (1 + risk_free_rate) ** (1/252) - 1
    excess_returns = returns - daily_rf
    
    if np.std(excess_returns) == 0:
        return 0.0
    
    sharpe = np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252)
    return float(sharpe)


def calculate_win_rate(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Calculate directional accuracy (win rate)."""
    if len(actual) < 2 or len(predicted) < 2:
        return 0.0
    
    actual_direction = np.sign(np.diff(actual))
    pred_direction = np.sign(np.diff(predicted))
    
    correct = np.sum(actual_direction == pred_direction)
    total = len(actual_direction)
    
    return float(correct / total) if total > 0 else 0.0


def walk_forward_validate_stock(
    stock_code: str,
    model_path: Path,
    scaler_path: Path,
    df: pd.DataFrame,
    config: dict
) -> dict:
    """
    Perform walk-forward validation for a single stock.
    
    Args:
        stock_code: Stock ticker
        model_path: Path to model file
        scaler_path: Path to scaler file
        df: Historical price data
        config: Validation configuration
    
    Returns:
        Dictionary with validation results
    """
    logger.info(f"\n{'='*80}")
    logger.info(f"Walk-Forward Validation: {stock_code}")
    logger.info(f"{'='*80}")
    
    # Load model and scaler
    try:
        # Load model with custom_objects to handle metrics
        model = tf.keras.models.load_model(
            model_path,
            custom_objects={'mse': tf.keras.losses.MeanSquaredError()}
        )
        scaler = LogPriceScaler.load(scaler_path)
    except Exception as e:
        logger.error(f"Failed to load model/scaler: {e}")
        return None
    
    prices = df['Day Price'].values
    dates = df['Date'].values
    
    logger.info(f"Total samples: {len(prices)}")
    logger.info(f"Date range: {dates[0]} to {dates[-1]}")
    
    # Split point: use last config['min_test_samples'] for walk-forward
    min_train = config['min_train_size']
    test_samples = config['min_test_samples']
    
    if len(prices) < min_train + test_samples:
        logger.error(f"Insufficient data: {len(prices)} < {min_train + test_samples}")
        return None
    
    # Define walk-forward windows
    split_point = len(prices) - test_samples
    
    # Results storage
    results_by_horizon = {}
    
    for horizon in config['test_horizons']:
        logger.info(f"\n{'─'*80}")
        logger.info(f"Testing {horizon}-day ahead predictions")
        logger.info(f"{'─'*80}")
        
        predictions = []
        actuals = []
        pred_dates = []
        
        # Walk forward through test period
        for i in range(split_point, len(prices) - horizon - PREDICTION_DAYS):
            # Training data: all data up to current point
            train_prices = prices[:i]
            
            # Skip if not enough training data
            if len(train_prices) < min_train:
                continue
            
            # Fit scaler on training data
            temp_scaler = LogPriceScaler()
            temp_scaler.fit(train_prices)
            
            # Get recent data for prediction (last PREDICTION_DAYS)
            if i < PREDICTION_DAYS:
                continue
                
            recent_prices = prices[i-PREDICTION_DAYS:i]
            scaled_recent = temp_scaler.transform(recent_prices)
            
            # Reshape for LSTM
            X_input = scaled_recent.reshape(1, PREDICTION_DAYS, 1)
            
            # Predict
            pred_scaled = model.predict(X_input, verbose=0)[0][0]
            pred_price = temp_scaler.inverse_transform(np.array([[pred_scaled]]))[0][0]
            
            # Actual price at horizon
            actual_price = prices[i + horizon]
            
            predictions.append(pred_price)
            actuals.append(actual_price)
            pred_dates.append(dates[i + horizon])
        
        if len(predictions) == 0:
            logger.warning(f"No predictions for {horizon}-day horizon")
            continue
        
        predictions = np.array(predictions)
        actuals = np.array(actuals)
        
        # Calculate metrics
        mae = mean_absolute_error(actuals, predictions)
        mape = mean_absolute_percentage_error(actuals, predictions) * 100
        
        # Returns-based metrics
        actual_returns = calculate_returns(actuals)
        pred_returns = calculate_returns(predictions)
        
        sharpe = calculate_sharpe_ratio(pred_returns)
        win_rate = calculate_win_rate(actuals, predictions)
        
        # Direction accuracy (for next price)
        if len(actuals) > 1:
            base_prices = actuals[:-1]  # Previous actual prices
            next_actuals = actuals[1:]
            next_preds = predictions[1:]
            
            actual_up = next_actuals > base_prices
            pred_up = next_preds > base_prices
            direction_acc = np.mean(actual_up == pred_up)
        else:
            direction_acc = 0.0
        
        results_by_horizon[f'{horizon}d'] = {
            'horizon_days': horizon,
            'n_predictions': len(predictions),
            'mae': float(mae),
            'mape': float(mape),
            'sharpe_ratio': float(sharpe),
            'win_rate': float(win_rate),
            'direction_accuracy': float(direction_acc),
            'actual_range': [float(actuals.min()), float(actuals.max())],
            'pred_range': [float(predictions.min()), float(predictions.max())],
            'actual_mean': float(actuals.mean()),
            'pred_mean': float(predictions.mean())
        }
        
        logger.info(f"  Predictions:        {len(predictions)}")
        logger.info(f"  MAE:                {mae:.4f} KES")
        logger.info(f"  MAPE:               {mape:.2f}%")
        logger.info(f"  Sharpe Ratio:       {sharpe:.2f}")
        logger.info(f"  Win Rate:           {win_rate*100:.1f}%")
        logger.info(f"  Direction Accuracy: {direction_acc*100:.1f}%")
    
    # Summary across all horizons
    if not results_by_horizon:
        logger.warning("No valid predictions made - insufficient data")
        return None
    
    all_maes = [results_by_horizon[h]['mae'] for h in results_by_horizon]
    all_mapes = [results_by_horizon[h]['mape'] for h in results_by_horizon]
    
    summary = {
        'stock_code': stock_code,
        'validation_date': datetime.now().isoformat(),
        'total_samples': int(len(prices)),
        'train_samples': int(split_point),
        'test_samples': int(len(prices) - split_point),
        'results_by_horizon': results_by_horizon,
        'summary': {
            'avg_mae': float(np.mean(all_maes)),
            'avg_mape': float(np.mean(all_mapes)),
            'best_horizon': min(results_by_horizon.keys(), 
                              key=lambda k: results_by_horizon[k]['mape'])
        }
    }
    
    logger.info(f"\n{'='*80}")
    logger.info(f"Summary: {stock_code}")
    logger.info(f"{'='*80}")
    logger.info(f"Average MAE:  {summary['summary']['avg_mae']:.4f} KES")
    logger.info(f"Average MAPE: {summary['summary']['avg_mape']:.2f}%")
    logger.info(f"Best Horizon: {summary['summary']['best_horizon']}")
    logger.info(f"{'='*80}\n")
    
    return summary


def validate_all_models(stock_codes: list = None) -> dict:
    """
    Run walk-forward validation on all available models.
    
    Args:
        stock_codes: List of stock codes to validate (None = all available)
    
    Returns:
        Dictionary with all validation results
    """
    # Find available models
    model_files = sorted(MODELS_DIR.glob("*_best.h5"))
    available_stocks = [f.name.replace("_best.h5", "") for f in model_files]
    
    if stock_codes:
        stocks_to_validate = [s for s in stock_codes if s in available_stocks]
    else:
        stocks_to_validate = available_stocks
    
    logger.info(f"\n{'='*80}")
    logger.info(f"WALK-FORWARD VALIDATION - STOCK-SPECIFIC MODELS (v4 Log)")
    logger.info(f"{'='*80}")
    logger.info(f"Models available: {len(available_stocks)}")
    logger.info(f"Models to validate: {len(stocks_to_validate)}")
    logger.info(f"Stocks: {', '.join(stocks_to_validate)}")
    logger.info(f"{'='*80}\n")
    
    all_results = {}
    successful = 0
    failed = 0
    
    for i, stock_code in enumerate(stocks_to_validate, 1):
        logger.info(f"\n[{i}/{len(stocks_to_validate)}] Processing: {stock_code}")
        
        # Load data
        df = load_stock_data(stock_code)
        if df.empty:
            logger.error(f"No data for {stock_code}")
            failed += 1
            continue
        
        # Paths
        model_path = MODELS_DIR / f"{stock_code}_best.h5"
        scaler_path = MODELS_DIR / f"{stock_code}_log_scaler.joblib"
        
        if not model_path.exists() or not scaler_path.exists():
            logger.error(f"Model or scaler not found for {stock_code}")
            failed += 1
            continue
        
        # Validate
        result = walk_forward_validate_stock(
            stock_code,
            model_path,
            scaler_path,
            df,
            WALK_FORWARD_CONFIG
        )
        
        if result:
            all_results[stock_code] = result
            successful += 1
        else:
            failed += 1
    
    # Overall summary
    logger.info(f"\n{'='*80}")
    logger.info("VALIDATION SUMMARY")
    logger.info(f"{'='*80}")
    logger.info(f"Total stocks:  {len(stocks_to_validate)}")
    logger.info(f"Successful:    {successful}")
    logger.info(f"Failed:        {failed}")
    
    if all_results:
        logger.info(f"\n{'Stock':<8} {'1d MAE':>10} {'1d MAPE':>10} {'30d MAE':>10} {'30d MAPE':>10}")
        logger.info(f"{'─'*8} {'─'*10} {'─'*10} {'─'*10} {'─'*10}")
        
        for stock, res in all_results.items():
            mae_1d = res['results_by_horizon'].get('1d', {}).get('mae', 0)
            mape_1d = res['results_by_horizon'].get('1d', {}).get('mape', 0)
            mae_30d = res['results_by_horizon'].get('30d', {}).get('mae', 0)
            mape_30d = res['results_by_horizon'].get('30d', {}).get('mape', 0)
            
            logger.info(
                f"{stock:<8} "
                f"{mae_1d:>10.4f} "
                f"{mape_1d:>9.2f}% "
                f"{mae_30d:>10.4f} "
                f"{mape_30d:>9.2f}%"
            )
    
    logger.info(f"{'='*80}\n")
    
    # Save results
    output_file = OUTPUT_DIR / "walk_forward_validation_v4_log.json"
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    logger.success(f"Results saved to: {output_file}")
    
    # Also save CSV summary
    if all_results:
        summary_data = []
        for stock, res in all_results.items():
            for horizon_key, horizon_res in res['results_by_horizon'].items():
                summary_data.append({
                    'stock': stock,
                    'horizon': horizon_key,
                    **horizon_res
                })
        
        df_summary = pd.DataFrame(summary_data)
        csv_file = OUTPUT_DIR / "walk_forward_validation_v4_log.csv"
        df_summary.to_csv(csv_file, index=False)
        logger.success(f"CSV summary saved to: {csv_file}")
    
    return all_results


if __name__ == "__main__":
    # Configure logger
    logger.remove()
    logger.add(lambda msg: print(msg, end=""), level="INFO", colorize=True)
    
    import argparse
    parser = argparse.ArgumentParser(description='Walk-forward validation for stock-specific models')
    parser.add_argument('--stock', type=str, help='Single stock to validate')
    parser.add_argument('--stocks', type=str, nargs='+', help='Multiple stocks to validate')
    parser.add_argument('--all', action='store_true', help='Validate all available models')
    
    args = parser.parse_args()
    
    if args.stock:
        results = validate_all_models([args.stock.upper()])
    elif args.stocks:
        results = validate_all_models([s.upper() for s in args.stocks])
    elif args.all:
        results = validate_all_models()
    else:
        # Default: validate SCOM (the one we trained)
        logger.info("No arguments provided. Validating SCOM.")
        logger.info("Usage:")
        logger.info("  --stock SCOM          # Validate single stock")
        logger.info("  --stocks SCOM EQTY    # Validate multiple stocks")
        logger.info("  --all                 # Validate all available models")
        logger.info("")
        results = validate_all_models(['SCOM'])
