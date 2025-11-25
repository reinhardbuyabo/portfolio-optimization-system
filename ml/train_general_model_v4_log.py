"""
General Multi-Stock LSTM Model with Log Transformations (v4)

Trains a single model on multiple stocks using stock embeddings.
Uses log transformations to prevent absurd predictions.

This model serves as a fallback for stocks without dedicated models.

Architecture:
- Stock ID embedding (10 dimensions)
- Price sequence LSTM (60 days)
- Concatenate embeddings + LSTM output
- Dense layers for prediction

Target MAPE: 8-12% (acceptable for tier 2 stocks)

Author: Reinhard
Date: 2024-11-18
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from sklearn.model_selection import train_test_split
from loguru import logger
import json
import joblib
from typing import List, Dict, Tuple
from datetime import datetime
import argparse

from processing.log_scaler import LogPriceScaler


# Configuration
PREDICTION_DAYS = 60
EPOCHS = 100
BATCH_SIZE = 32
EMBEDDING_DIM = 10

# Top 15 stocks (exclude from general model - they get specific models)
TOP_15_STOCKS = [
    'SCOM', 'EQTY', 'KCB', 'COOP', 'ABSA', 'SCBK',  # Banking + Telecom
    'EABL', 'BAT', 'UNGA',  # Manufacturing
    'BRIT', 'JUB', 'CIC',  # Insurance
    'BAMB', 'ARM',  # Construction
    'NMG'  # Services
]


def load_all_stock_data(exclude_top_15: bool = True) -> Tuple[pd.DataFrame, List[str]]:
    """
    Load historical data for all NSE stocks.
    
    Args:
        exclude_top_15: If True, exclude top 15 stocks (they have specific models)
    
    Returns:
        DataFrame with all stock data and list of stock symbols
    """
    logger.info("Loading NSE stock data...")
    
    # Load sector mapping
    datasets_dir = Path(__file__).parent / "datasets"
    sector_file = datasets_dir / "NSE_data_stock_market_sectors_2023_2024.csv"
    sectors_df = pd.read_csv(sector_file)
    all_stocks = sectors_df['Stock_code'].unique().tolist()
    
    # Remove indices and invalid stocks
    invalid_stocks = [s for s in all_stocks if s.startswith('^') or 'REIT' in str(sectors_df[sectors_df['Stock_code']==s]['Stock_name'].values)]
    all_stocks = [s for s in all_stocks if s not in invalid_stocks]
    
    if exclude_top_15:
        all_stocks = [s for s in all_stocks if s not in TOP_15_STOCKS]
        logger.info(f"Excluding top 15 stocks, remaining: {len(all_stocks)}")
    
    logger.info(f"Loading data for {len(all_stocks)} stocks...")
    
    # Load data from yearly CSV files
    all_data = []
    
    for year in range(2013, 2025):
        file_path = datasets_dir / f"NSE_data_all_stocks_{year}.csv"
        if file_path.exists():
            try:
                df = pd.read_csv(file_path)
                # Handle different column names
                if 'Code' in df.columns:
                    df = df.rename(columns={'Code': 'Stock_code'})
                if 'Stock_code' in df.columns and 'Day Price' in df.columns:
                    # Filter to our stocks
                    df = df[df['Stock_code'].isin(all_stocks)]
                    all_data.append(df)
                    logger.debug(f"Loaded {year}: {len(df)} rows")
            except Exception as e:
                logger.warning(f"Failed to load {year}: {e}")
    
    # Also check for 2024 Jan-Oct file
    file_path = datasets_dir / "NSE_data_all_stocks_2024_jan_to_oct.csv"
    if file_path.exists():
        try:
            df = pd.read_csv(file_path)
            if 'Code' in df.columns:
                df = df.rename(columns={'Code': 'Stock_code'})
            if 'Stock_code' in df.columns and 'Day Price' in df.columns:
                df = df[df['Stock_code'].isin(all_stocks)]
                all_data.append(df)
                logger.debug(f"Loaded 2024 (Jan-Oct): {len(df)} rows")
        except Exception as e:
            logger.warning(f"Failed to load 2024 Jan-Oct: {e}")
    
    if not all_data:
        raise ValueError("No stock data loaded!")
    
    # Combine all years
    combined_df = pd.concat(all_data, ignore_index=True)
    
    # Convert date
    combined_df['Date'] = pd.to_datetime(combined_df['Date'])
    
    # Sort by stock and date
    combined_df = combined_df.sort_values(['Stock_code', 'Date'])
    
    # Remove stocks with insufficient data
    stock_counts = combined_df.groupby('Stock_code').size()
    valid_stocks = stock_counts[stock_counts >= 300].index.tolist()  # At least 300 days
    combined_df = combined_df[combined_df['Stock_code'].isin(valid_stocks)]
    
    logger.info(f"Loaded {len(combined_df)} rows for {len(valid_stocks)} stocks")
    logger.info(f"Date range: {combined_df['Date'].min()} to {combined_df['Date'].max()}")
    
    return combined_df, valid_stocks


def create_stock_id_mapping(stocks: List[str]) -> Dict[str, int]:
    """Create mapping from stock symbol to integer ID."""
    return {stock: idx for idx, stock in enumerate(sorted(stocks))}


def prepare_sequences_multi_stock(
    df: pd.DataFrame,
    stock_id_map: Dict[str, int],
    scalers: Dict[str, LogPriceScaler],
    prediction_days: int = 60
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Prepare training sequences for multiple stocks.
    
    Args:
        df: DataFrame with columns [Stock_code, Date, Day Price]
        stock_id_map: Mapping from stock code to integer ID
        scalers: Dictionary of scalers per stock
        prediction_days: Sequence length
    
    Returns:
        Tuple of (stock_ids, price_sequences, targets)
    """
    logger.info("Preparing sequences for all stocks...")
    
    stock_ids_list = []
    sequences_list = []
    targets_list = []
    
    for stock_code in stock_id_map.keys():
        stock_data = df[df['Stock_code'] == stock_code].copy()
        
        if len(stock_data) < prediction_days + 1:
            logger.warning(f"Skipping {stock_code}: insufficient data ({len(stock_data)} rows)")
            continue
        
        # Convert Day Price to float, handle commas and errors
        try:
            prices = stock_data['Day Price'].astype(str).str.replace(',', '').astype(float).values
        except Exception as e:
            logger.warning(f"Skipping {stock_code}: price conversion error: {e}")
            continue
        
        # Get or create scaler for this stock
        if stock_code not in scalers:
            scalers[stock_code] = LogPriceScaler()
            scalers[stock_code].fit(prices)
        
        # Scale prices
        scaled_prices = scalers[stock_code].transform(prices)
        
        # Create sequences
        for i in range(len(scaled_prices) - prediction_days):
            sequence = scaled_prices[i:i+prediction_days]
            target = scaled_prices[i+prediction_days]
            
            stock_ids_list.append(stock_id_map[stock_code])
            sequences_list.append(sequence)
            targets_list.append(target)
    
    stock_ids = np.array(stock_ids_list)
    sequences = np.array(sequences_list).reshape(-1, prediction_days, 1)
    targets = np.array(targets_list)
    
    logger.info(f"Created {len(stock_ids)} sequences from {len(stock_id_map)} stocks")
    
    return stock_ids, sequences, targets


def build_multi_stock_model(
    num_stocks: int,
    sequence_length: int = 60,
    embedding_dim: int = 10
) -> Model:
    """
    Build LSTM model with stock embeddings.
    
    Architecture:
        Stock ID → Embedding(10)
        Price Seq → LSTM(50) → LSTM(50)
        Concat → Dense(25) → Dense(1)
    
    Args:
        num_stocks: Number of unique stocks
        sequence_length: Length of price sequence
        embedding_dim: Dimension of stock embedding
    
    Returns:
        Compiled Keras model
    """
    # Stock ID input
    stock_id_input = layers.Input(shape=(1,), name='stock_id')
    stock_embedding = layers.Embedding(
        input_dim=num_stocks,
        output_dim=embedding_dim,
        name='stock_embedding'
    )(stock_id_input)
    stock_embedding = layers.Flatten()(stock_embedding)
    
    # Price sequence input
    price_input = layers.Input(shape=(sequence_length, 1), name='price_sequence')
    
    # LSTM layers
    x = layers.LSTM(50, return_sequences=True, kernel_regularizer=keras.regularizers.l2(0.01))(price_input)
    x = layers.Dropout(0.2)(x)
    x = layers.LSTM(50, kernel_regularizer=keras.regularizers.l2(0.01))(x)
    x = layers.Dropout(0.2)(x)
    
    # Concatenate stock embedding with LSTM output
    combined = layers.Concatenate()([stock_embedding, x])
    
    # Dense layers
    x = layers.Dense(25, activation='relu', kernel_regularizer=keras.regularizers.l2(0.01))(combined)
    x = layers.Dropout(0.2)(x)
    output = layers.Dense(1, activation='linear')(x)
    
    # Build model
    model = Model(inputs=[stock_id_input, price_input], outputs=output, name='multi_stock_lstm')
    
    # Compile
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae', 'mape']
    )
    
    return model


def train_general_model(
    stocks_to_exclude: List[str] = None,
    output_dir: str = "trained_models/general_v4_log"
):
    """
    Train general multi-stock model with log transformations.
    
    Args:
        stocks_to_exclude: List of stocks to exclude (top 15)
        output_dir: Directory to save model
    """
    if stocks_to_exclude is None:
        stocks_to_exclude = TOP_15_STOCKS
    
    output_path = Path(__file__).parent / output_dir
    output_path.mkdir(parents=True, exist_ok=True)
    
    logger.info("="*80)
    logger.info("TRAINING GENERAL MULTI-STOCK MODEL (v4 Log)")
    logger.info("="*80)
    logger.info(f"Excluding {len(stocks_to_exclude)} top stocks: {stocks_to_exclude}")
    
    # Load data
    df, valid_stocks = load_all_stock_data(exclude_top_15=True)
    
    # Create stock ID mapping
    stock_id_map = create_stock_id_mapping(valid_stocks)
    logger.info(f"Stock ID mapping created for {len(stock_id_map)} stocks")
    
    # Create scalers
    scalers = {}
    
    # Prepare sequences
    stock_ids, sequences, targets = prepare_sequences_multi_stock(
        df, stock_id_map, scalers, PREDICTION_DAYS
    )
    
    logger.info(f"Dataset shape: {sequences.shape}")
    logger.info(f"Stock IDs shape: {stock_ids.shape}")
    logger.info(f"Targets shape: {targets.shape}")
    
    # Train/val/test split (80/10/10)
    # Use stratified split to ensure all stocks represented
    indices = np.arange(len(stock_ids))
    
    train_idx, temp_idx = train_test_split(indices, test_size=0.2, random_state=42, stratify=stock_ids)
    val_idx, test_idx = train_test_split(temp_idx, test_size=0.5, random_state=42, stratify=stock_ids[temp_idx])
    
    X_stock_train, X_stock_val, X_stock_test = stock_ids[train_idx], stock_ids[val_idx], stock_ids[test_idx]
    X_seq_train, X_seq_val, X_seq_test = sequences[train_idx], sequences[val_idx], sequences[test_idx]
    y_train, y_val, y_test = targets[train_idx], targets[val_idx], targets[test_idx]
    
    logger.info(f"Train: {len(X_stock_train)} samples")
    logger.info(f"Val:   {len(X_stock_val)} samples")
    logger.info(f"Test:  {len(X_stock_test)} samples")
    
    # Build model
    logger.info("Building model...")
    model = build_multi_stock_model(
        num_stocks=len(stock_id_map),
        sequence_length=PREDICTION_DAYS,
        embedding_dim=EMBEDDING_DIM
    )
    
    model.summary(print_fn=logger.info)
    
    # Callbacks
    callbacks = [
        EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1
        ),
        ModelCheckpoint(
            str(output_path / "general_v4_log_best.h5"),
            monitor='val_loss',
            save_best_only=True,
            verbose=1
        )
    ]
    
    # Train
    logger.info("Training...")
    history = model.fit(
        [X_stock_train, X_seq_train], y_train,
        validation_data=([X_stock_val, X_seq_val], y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=1
    )
    
    # Evaluate on test set
    logger.info("Evaluating on test set...")
    test_loss, test_mae, test_mape = model.evaluate(
        [X_stock_test, X_seq_test], y_test, verbose=0
    )
    
    logger.info(f"Test Loss: {test_loss:.6f}")
    logger.info(f"Test MAE:  {test_mae:.6f}")
    logger.info(f"Test MAPE: {test_mape:.2f}%")
    
    # Save artifacts
    logger.info("Saving model and artifacts...")
    
    # Save model
    model.save(output_path / "general_v4_log_best.h5")
    
    # Save stock ID mapping
    with open(output_path / "stock_id_mapping.json", 'w') as f:
        json.dump(stock_id_map, f, indent=2)
    
    # Save scalers
    joblib.dump(scalers, output_path / "scalers.joblib")
    
    # Save metadata
    metadata = {
        "model_version": "general_v4_log",
        "training_date": datetime.now().isoformat(),
        "num_stocks": len(stock_id_map),
        "stocks": list(stock_id_map.keys()),
        "excluded_stocks": stocks_to_exclude,
        "prediction_days": PREDICTION_DAYS,
        "embedding_dim": EMBEDDING_DIM,
        "total_samples": len(stock_ids),
        "train_samples": len(X_stock_train),
        "val_samples": len(X_stock_val),
        "test_samples": len(X_stock_test),
        "epochs_trained": len(history.history['loss']),
        "best_val_loss": float(min(history.history['val_loss'])),
        "best_val_mape": float(min(history.history['val_mape'])),
        "test_loss": float(test_loss),
        "test_mae": float(test_mae),
        "test_mape": float(test_mape),
        "architecture": {
            "embedding_dim": EMBEDDING_DIM,
            "lstm_units": [50, 50],
            "dense_units": [25],
            "dropout": 0.2,
            "l2_reg": 0.01
        }
    }
    
    with open(output_path / "metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    # Print summary
    logger.info("="*80)
    logger.info("TRAINING COMPLETE")
    logger.info("="*80)
    logger.info(f"Stocks trained: {len(stock_id_map)}")
    logger.info(f"Test MAPE: {test_mape:.2f}%")
    logger.info(f"Model saved: {output_path / 'general_v4_log_best.h5'}")
    logger.info(f"Scalers saved: {output_path / 'scalers.joblib'}")
    logger.info(f"Metadata saved: {output_path / 'metadata.json'}")
    logger.info("="*80)
    
    return model, scalers, stock_id_map, metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train general multi-stock LSTM model")
    parser.add_argument('--exclude-top15', action='store_true', default=True,
                        help="Exclude top 15 stocks (they get specific models)")
    parser.add_argument('--output-dir', type=str, default="trained_models/general_v4_log",
                        help="Output directory for model")
    
    args = parser.parse_args()
    
    try:
        train_general_model(
            stocks_to_exclude=TOP_15_STOCKS if args.exclude_top15 else [],
            output_dir=args.output_dir
        )
    except Exception as e:
        logger.exception(f"Training failed: {e}")
        sys.exit(1)
