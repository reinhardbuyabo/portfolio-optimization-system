#!/usr/bin/env python3
"""
Stock-Specific Training Pipeline with Logarithmic Transformations - Version 4

This version implements:
1. Log price transformations (industry standard for finance)
2. Proper train/validation/test split with NO data leakage
3. Dropout and L2 regularization
4. Early stopping with patience
5. Comprehensive validation metrics (MAE, MAPE, Sharpe)
6. Scaler validation to ensure correct fitting

Author: Reinhard
Date: 2024-11-18
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd
from datetime import datetime
import json
import warnings
warnings.filterwarnings('ignore')

from processing.log_scaler import LogPriceScaler, validate_scaler_fit
from loguru import logger

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, regularizers
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error


# Configuration
DATASETS_DIR = Path(__file__).parent / "datasets"
MODELS_DIR = Path(__file__).parent / "trained_models" / "stock_specific_v4_log"
PREDICTION_DAYS = 60
VALIDATION_SPLIT = 0.15
TEST_SPLIT = 0.15
EPOCHS = 100
BATCH_SIZE = 32
EARLY_STOPPING_PATIENCE = 15


def load_stock_data(stock_code: str, end_date: str = "2024-10-31") -> pd.DataFrame:
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
    combined = combined[combined['Date'] <= end_date]
    
    # Clean price data
    combined['Day Price'] = combined['Day Price'].astype(str).str.replace(',', '')
    combined['Day Price'] = pd.to_numeric(combined['Day Price'], errors='coerce')
    combined = combined.dropna(subset=['Day Price'])
    
    return combined


def create_sequences(data: np.ndarray, sequence_length: int):
    """
    Create LSTM sequences from time series data.
    
    Args:
        data: Scaled data (1D or 2D array)
        sequence_length: Number of time steps per sequence
    
    Returns:
        X: Input sequences [n_samples, sequence_length, 1]
        y: Target values [n_samples, 1]
    """
    # Ensure data is 2D
    if data.ndim == 1:
        data = data.reshape(-1, 1)
    
    X, y = [], []
    
    for i in range(sequence_length, len(data)):
        X.append(data[i - sequence_length:i, 0])
        y.append(data[i, 0])
    
    return np.array(X), np.array(y)


def create_lstm_model(sequence_length: int, dropout=0.2, l2_reg=0.01):
    """
    Create LSTM model with dropout and L2 regularization.
    
    Architecture:
    - LSTM(50) with dropout and L2
    - LSTM(50) with dropout and L2  
    - Dense(25) with dropout and L2
    - Dense(1) output
    
    Args:
        sequence_length: Input sequence length
        dropout: Dropout rate (0.0-0.5)
        l2_reg: L2 regularization factor
    
    Returns:
        Compiled Keras model
    """
    model = keras.Sequential([
        # Input layer
        layers.Input(shape=(sequence_length, 1)),
        
        # First LSTM layer with regularization
        layers.LSTM(
            50,
            return_sequences=True,
            kernel_regularizer=regularizers.l2(l2_reg),
            recurrent_regularizer=regularizers.l2(l2_reg)
        ),
        layers.Dropout(dropout),
        
        # Second LSTM layer
        layers.LSTM(
            50,
            return_sequences=False,
            kernel_regularizer=regularizers.l2(l2_reg),
            recurrent_regularizer=regularizers.l2(l2_reg)
        ),
        layers.Dropout(dropout),
        
        # Dense layer
        layers.Dense(
            25,
            activation='relu',
            kernel_regularizer=regularizers.l2(l2_reg)
        ),
        layers.Dropout(dropout / 2),
        
        # Output layer
        layers.Dense(1)
    ])
    
    # Compile with Adam optimizer
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae', 'mape']
    )
    
    return model


def calculate_sharpe_ratio(returns: np.ndarray, risk_free_rate: float = 0.05) -> float:
    """
    Calculate annualized Sharpe ratio.
    
    Args:
        returns: Array of returns
        risk_free_rate: Annual risk-free rate (default 5%)
    
    Returns:
        Sharpe ratio
    """
    if len(returns) < 2:
        return 0.0
    
    # Annualize
    daily_rf = (1 + risk_free_rate) ** (1/252) - 1
    excess_returns = returns - daily_rf
    
    if np.std(excess_returns) == 0:
        return 0.0
    
    sharpe = np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252)
    return float(sharpe)


def train_stock_specific_model(
    stock_code: str,
    prediction_days: int = PREDICTION_DAYS,
    validation_split: float = VALIDATION_SPLIT,
    test_split: float = TEST_SPLIT,
    epochs: int = EPOCHS,
    batch_size: int = BATCH_SIZE,
    early_stopping_patience: int = EARLY_STOPPING_PATIENCE,
    save_model: bool = True
):
    """
    Train a stock-specific LSTM model with log price transformations.
    
    Args:
        stock_code: Stock ticker (e.g., 'SCOM', 'EQTY')
        prediction_days: Sequence length (default: 60)
        validation_split: Validation set fraction (default: 0.15)
        test_split: Test set fraction (default: 0.15)
        epochs: Maximum epochs (default: 100)
        batch_size: Training batch size (default: 32)
        early_stopping_patience: Patience for early stopping (default: 15)
        save_model: Whether to save model and scaler (default: True)
    
    Returns:
        Dictionary with model, scaler, history, and metrics
    """
    logger.info(f"\n{'='*80}")
    logger.info(f"Training Stock-Specific Model: {stock_code} (with LOG transformation)")
    logger.info(f"{'='*80}")
    
    # 1. Load data
    try:
        df = load_stock_data(stock_code)
    except ValueError as e:
        logger.error(str(e))
        return None
    
    prices = df['Day Price'].values
    
    logger.info(f"Total samples: {len(prices)}")
    logger.info(f"Date range: {df['Date'].min()} to {df['Date'].max()}")
    logger.info(f"Price range: [{prices.min():.2f}, {prices.max():.2f}] KES")
    
    # Check minimum data requirement
    min_samples = prediction_days + 100
    if len(prices) < min_samples:
        logger.error(f"Insufficient data: {len(prices)} < {min_samples}")
        return None
    
    # 2. Split data (temporal order - CRITICAL for time series)
    total_size = len(prices)
    test_size = int(total_size * test_split)
    val_size = int(total_size * validation_split)
    train_size = total_size - test_size - val_size
    
    train_prices = prices[:train_size]
    val_prices = prices[train_size:train_size + val_size]
    test_prices = prices[train_size + val_size:]
    
    logger.info(f"\nData Split:")
    logger.info(f"  Training:   {len(train_prices)} samples ({train_size/total_size*100:.1f}%)")
    logger.info(f"  Validation: {len(val_prices)} samples ({val_size/total_size*100:.1f}%)")
    logger.info(f"  Test:       {len(test_prices)} samples ({test_size/total_size*100:.1f}%)")
    
    # 3. Create and fit LogPriceScaler (ONLY on training data!)
    logger.info(f"\nCreating LogPriceScaler...")
    scaler = LogPriceScaler()
    scaler.fit(train_prices)  # FIT ONLY ON TRAINING DATA!
    
    # Validate scaler
    try:
        validate_scaler_fit(scaler, train_prices)
        logger.success("✅ Scaler validation passed")
    except AssertionError as e:
        logger.error(f"❌ Scaler validation failed: {e}")
        return None
    
    # Log scaler parameters
    params = scaler.get_params()
    logger.info(f"Scaler parameters:")
    logger.info(f"  Price range: [{params['min_price']:.2f}, {params['max_price']:.2f}] KES")
    logger.info(f"  Log range:   [{params['log_min']:.4f}, {params['log_max']:.4f}]")
    
    # 4. Transform data
    train_scaled = scaler.transform(train_prices)
    val_scaled = scaler.transform(val_prices)
    test_scaled = scaler.transform(test_prices)
    
    # 5. Create sequences
    X_train, y_train = create_sequences(train_scaled, prediction_days)
    X_val, y_val = create_sequences(val_scaled, prediction_days)
    X_test, y_test = create_sequences(test_scaled, prediction_days)
    
    # Reshape for LSTM [samples, time_steps, features]
    X_train = X_train.reshape(X_train.shape[0], X_train.shape[1], 1)
    X_val = X_val.reshape(X_val.shape[0], X_val.shape[1], 1)
    X_test = X_test.reshape(X_test.shape[0], X_test.shape[1], 1)
    
    logger.info(f"\nSequences created:")
    logger.info(f"  Train: {X_train.shape[0]} sequences")
    logger.info(f"  Val:   {X_val.shape[0]} sequences")
    logger.info(f"  Test:  {X_test.shape[0]} sequences")
    
    # 6. Create model
    logger.info(f"\nBuilding LSTM model...")
    model = create_lstm_model(sequence_length=prediction_days, dropout=0.2, l2_reg=0.01)
    
    logger.info(f"Model architecture:")
    model.summary(print_fn=lambda x: logger.info(x))
    
    # 7. Setup callbacks
    callbacks = [
        EarlyStopping(
            monitor='val_loss',
            patience=early_stopping_patience,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=7,
            min_lr=1e-6,
            verbose=1
        )
    ]
    
    if save_model:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        checkpoint_path = MODELS_DIR / f"{stock_code}_best.h5"
        callbacks.append(
            ModelCheckpoint(
                checkpoint_path,
                monitor='val_loss',
                save_best_only=True,
                verbose=0
            )
        )
    
    # 8. Train model
    logger.info(f"\nStarting training...")
    logger.info(f"  Max epochs: {epochs}")
    logger.info(f"  Batch size: {batch_size}")
    logger.info(f"  Early stopping patience: {early_stopping_patience}")
    
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks,
        verbose=1
    )
    
    # 9. Evaluate on test set
    logger.info(f"\n{'─'*80}")
    logger.info("Evaluating on test set...")
    
    # Predictions (scaled log space)
    y_pred_scaled = model.predict(X_test, verbose=0)
    
    # Inverse transform to get actual prices
    y_test_prices = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
    y_pred_prices = scaler.inverse_transform(y_pred_scaled).flatten()
    
    # Calculate metrics
    mae = mean_absolute_error(y_test_prices, y_pred_prices)
    mape = mean_absolute_percentage_error(y_test_prices, y_pred_prices) * 100
    
    # Calculate returns and Sharpe ratio
    returns_actual = np.diff(y_test_prices) / y_test_prices[:-1]
    returns_pred = np.diff(y_pred_prices) / y_pred_prices[:-1]
    sharpe = calculate_sharpe_ratio(returns_pred)
    
    # Display results
    logger.info(f"\n{'='*80}")
    logger.info("TEST SET RESULTS")
    logger.info(f"{'='*80}")
    logger.info(f"MAE:          {mae:.4f} KES")
    logger.info(f"MAPE:         {mape:.2f}%")
    logger.info(f"Sharpe Ratio: {sharpe:.2f}")
    logger.info(f"Price range:  [{y_test_prices.min():.2f}, {y_test_prices.max():.2f}] KES")
    logger.info(f"Pred range:   [{y_pred_prices.min():.2f}, {y_pred_prices.max():.2f}] KES")
    logger.info(f"{'='*80}")
    
    # 10. Save model and metadata
    if save_model:
        # Save scaler
        scaler_path = MODELS_DIR / f"{stock_code}_log_scaler.joblib"
        scaler.save(scaler_path)
        
        # Save metadata
        metadata = {
            'stock_code': stock_code,
            'training_date': datetime.now().isoformat(),
            'prediction_days': prediction_days,
            'total_samples': int(len(prices)),
            'train_samples': int(len(train_prices)),
            'val_samples': int(len(val_prices)),
            'test_samples': int(len(test_prices)),
            'epochs_trained': len(history.history['loss']),
            'early_stopped': len(history.history['loss']) < epochs,
            'best_val_loss': float(min(history.history['val_loss'])),
            'best_val_mae': float(min(history.history['val_mae'])),
            'best_val_mape': float(min(history.history['val_mape'])),
            'test_mae': float(mae),
            'test_mape': float(mape),
            'test_sharpe': float(sharpe),
            'scaler_type': 'LogPriceScaler',
            'scaler_params': scaler.get_params(),
            'model_architecture': {
                'lstm_units': [50, 50],
                'dense_units': [25],
                'dropout': 0.2,
                'l2_reg': 0.01
            }
        }
        
        metadata_path = MODELS_DIR / f"{stock_code}_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.success(f"\n✅ Model saved:")
        logger.success(f"   Model:    {checkpoint_path}")
        logger.success(f"   Scaler:   {scaler_path}")
        logger.success(f"   Metadata: {metadata_path}")
    
    return {
        'stock_code': stock_code,
        'model': model,
        'scaler': scaler,
        'history': history,
        'metrics': {
            'mae': mae,
            'mape': mape,
            'sharpe': sharpe
        },
        'predictions': {
            'actual': y_test_prices,
            'predicted': y_pred_prices
        }
    }


def train_multiple_stocks(stock_codes: list, **kwargs):
    """
    Train models for multiple stocks.
    
    Args:
        stock_codes: List of stock tickers
        **kwargs: Arguments to pass to train_stock_specific_model
    
    Returns:
        Dictionary of results for each stock
    """
    results = {}
    
    logger.info(f"\n{'='*80}")
    logger.info(f"TRAINING {len(stock_codes)} STOCK-SPECIFIC MODELS (LOG TRANSFORMATION)")
    logger.info(f"{'='*80}\n")
    
    for i, stock_code in enumerate(stock_codes, 1):
        logger.info(f"\n[{i}/{len(stock_codes)}] Processing: {stock_code}")
        
        result = train_stock_specific_model(stock_code, **kwargs)
        
        if result:
            results[stock_code] = result
            logger.success(f"✅ {stock_code} completed successfully")
        else:
            logger.error(f"❌ {stock_code} failed")
    
    # Summary
    logger.info(f"\n{'='*80}")
    logger.info("TRAINING SUMMARY")
    logger.info(f"{'='*80}")
    logger.info(f"Total stocks: {len(stock_codes)}")
    logger.info(f"Successful:   {len(results)}")
    logger.info(f"Failed:       {len(stock_codes) - len(results)}")
    
    if results:
        logger.info(f"\n{'Stock':<8} {'MAE':>10} {'MAPE':>10} {'Sharpe':>10}")
        logger.info(f"{'─'*8} {'─'*10} {'─'*10} {'─'*10}")
        for code, res in results.items():
            logger.info(
                f"{code:<8} "
                f"{res['metrics']['mae']:>10.4f} "
                f"{res['metrics']['mape']:>9.2f}% "
                f"{res['metrics']['sharpe']:>10.2f}"
            )
    
    logger.info(f"{'='*80}\n")
    
    return results


if __name__ == "__main__":
    # Configure logger
    logger.remove()
    logger.add(lambda msg: print(msg, end=""), level="INFO", colorize=True)
    
    # Test stocks (start with these 5)
    test_stocks = ['SCOM', 'EQTY', 'KCB', 'BAMB', 'EABL']
    
    # All trained stocks
    all_stocks = [
        'SCOM', 'EQTY', 'KCB', 'BAMB', 'EABL',
        'COOP', 'ABSA', 'SCBK', 'NCBA', 'NBK', 'DTK',
        'KPLC', 'TOTL', 'KEGN', 'BRIT', 'CIC'
    ]
    
    import argparse
    parser = argparse.ArgumentParser(description='Train stock-specific LSTM models with log transformations')
    parser.add_argument('--stock', type=str, help='Single stock to train')
    parser.add_argument('--test', action='store_true', help='Train on test stocks (5 stocks)')
    parser.add_argument('--all', action='store_true', help='Train on all stocks (16 stocks)')
    
    args = parser.parse_args()
    
    if args.stock:
        # Single stock
        result = train_stock_specific_model(args.stock.upper())
    elif args.test:
        # Test set (5 stocks)
        results = train_multiple_stocks(test_stocks)
    elif args.all:
        # All stocks (16 stocks)
        results = train_multiple_stocks(all_stocks)
    else:
        # Default: train test set
        logger.info("No arguments provided. Training test set (5 stocks).")
        logger.info("Usage:")
        logger.info("  --stock SCOM     # Train single stock")
        logger.info("  --test           # Train 5 test stocks")
        logger.info("  --all            # Train all 16 stocks")
        logger.info("")
        results = train_multiple_stocks(test_stocks)
