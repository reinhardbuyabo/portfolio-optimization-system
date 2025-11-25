"""
Improved Stock-Specific Training Pipeline - Version 2
Implements Phase 2: Enhanced architecture with proper validation
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd
from datetime import datetime
import json

from config.core import settings
from processing.data_manager import load_dataset
from processing.stock_scaler import StockSpecificScaler
from processing.walk_forward import WalkForwardValidator
from pipeline.lstm_model_v2 import create_regularized_lstm
from reproducibility import set_seeds
from loguru import logger

from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score


def create_sequences(data: np.ndarray, prediction_days: int):
    """Create sequences for LSTM input"""
    X, y = [], []
    for i in range(prediction_days, len(data)):
        X.append(data[i - prediction_days:i, 0])
        y.append(data[i, 0])
    return np.array(X), np.array(y)


def train_stock_model(
    stock_code: str,
    stock_data: pd.DataFrame,
    prediction_days: int = 60,
    validation_split: float = 0.15,
    epochs: int = 100,
    batch_size: int = 32,
    early_stopping_patience: int = 10,
    **model_kwargs
):
    """
    Train LSTM model for a specific stock with proper validation.
    
    Args:
        stock_code: Stock ticker (e.g., 'SCOM')
        stock_data: DataFrame with 'Day Price' column for this stock only
        prediction_days: Sequence length (60 days default)
        validation_split: Fraction for validation (0.15 = 15%)
        epochs: Max epochs (early stopping will stop earlier)
        batch_size: Batch size for training
        early_stopping_patience: Epochs to wait before stopping
        **model_kwargs: Additional arguments for create_regularized_lstm
        
    Returns:
        Dictionary with model, scaler, history, and metrics
    """
    logger.info(f"\n{'='*80}")
    logger.info(f"Training Stock-Specific Model: {stock_code}")
    logger.info(f"{'='*80}")
    
    # Extract prices
    prices = stock_data['Day Price'].dropna().values
    
    if len(prices) < prediction_days + 100:
        logger.warning(f"Insufficient data for {stock_code}: {len(prices)} samples")
        return None
    
    logger.info(f"Total samples: {len(prices)}")
    logger.info(f"Price range: [{prices.min():.2f}, {prices.max():.2f}] KES")
    
    # 1. Stock-specific scaling
    from sklearn.preprocessing import MinMaxScaler
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_prices = scaler.fit_transform(prices.reshape(-1, 1))
    
    logger.info(f"Scaler fitted: [{scaler.data_min_[0]:.2f}, {scaler.data_max_[0]:.2f}] KES")
    
    # 2. Create sequences
    X, y = create_sequences(scaled_prices, prediction_days)
    logger.info(f"Created {len(X)} sequences")
    
    # 3. Split into train/validation (temporal order)
    split_idx = int(len(X) * (1 - validation_split))
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    
    # Reshape for LSTM [samples, time steps, features]
    X_train = X_train.reshape(X_train.shape[0], X_train.shape[1], 1)
    X_val = X_val.reshape(X_val.shape[0], X_val.shape[1], 1)
    
    logger.info(f"Train set: {len(X_train)} samples")
    logger.info(f"Validation set: {len(X_val)} samples")
    
    # 4. Create model with regularization
    logger.info("Creating regularized LSTM model...")
    model = create_regularized_lstm(
        input_shape=(prediction_days, 1),
        **model_kwargs
    )
    
    logger.info(f"Model parameters: {model.count_params():,}")
    
    # 5. Setup callbacks
    output_dir = settings.TRAINED_MODEL_DIR / 'stock_specific_v2'
    output_dir.mkdir(exist_ok=True)
    
    model_path = output_dir / f"{stock_code}_best.h5"
    
    callbacks = [
        EarlyStopping(
            monitor='val_loss',
            patience=early_stopping_patience,
            restore_best_weights=True,
            verbose=1
        ),
        ModelCheckpoint(
            str(model_path),
            monitor='val_loss',
            save_best_only=True,
            verbose=0
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=0.00001,
            verbose=1
        )
    ]
    
    # 6. Train model
    logger.info(f"Training for up to {epochs} epochs (early stopping enabled)...")
    
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks,
        verbose=1
    )
    
    # 7. Evaluate on validation set
    logger.info("\nEvaluating on validation set...")
    
    y_val_pred = model.predict(X_val, verbose=0).flatten()
    
    # Inverse transform to original prices
    y_val_actual = scaler.inverse_transform(y_val.reshape(-1, 1)).flatten()
    y_val_pred_actual = scaler.inverse_transform(y_val_pred.reshape(-1, 1)).flatten()
    
    # Calculate metrics
    mse = mean_squared_error(y_val_actual, y_val_pred_actual)
    mae = mean_absolute_error(y_val_actual, y_val_pred_actual)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_val_actual, y_val_pred_actual)
    mape = np.mean(np.abs((y_val_actual - y_val_pred_actual) / y_val_actual)) * 100
    
    # Check for negative predictions
    neg_count = np.sum(y_val_pred_actual < 0)
    neg_ratio = neg_count / len(y_val_pred_actual)
    
    # Bias check
    bias = np.mean(y_val_pred_actual - y_val_actual)
    
    val_metrics = {
        'mse': float(mse),
        'mae': float(mae),
        'rmse': float(rmse),
        'r2': float(r2),
        'mape': float(mape),
        'negative_predictions': int(neg_count),
        'negative_ratio': float(neg_ratio),
        'bias': float(bias)
    }
    
    logger.info(f"\nValidation Metrics:")
    logger.info(f"  R²: {r2:.4f}")
    logger.info(f"  MAE: {mae:.2f} KES")
    logger.info(f"  RMSE: {rmse:.2f} KES")
    logger.info(f"  MAPE: {mape:.2f}%")
    logger.info(f"  Bias: {bias:.2f} KES")
    logger.info(f"  Negative predictions: {neg_count}/{len(y_val_pred_actual)} ({neg_ratio*100:.2f}%)")
    
    # 8. Walk-forward validation (optional but recommended)
    logger.info("\nRunning walk-forward validation...")
    try:
        validator = WalkForwardValidator(
            min_train_size=100,
            test_size=20,
            step_size=20,
            n_splits=2
        )
        
        wf_results = []
        for train_idx, test_idx in validator.split(X_train):
            X_test_wf = X_train[test_idx]
            y_test_wf = y_train[test_idx]
            
            y_pred_wf = model.predict(X_test_wf, verbose=0).flatten()
            
            y_test_actual_wf = scaler.inverse_transform(y_test_wf.reshape(-1, 1)).flatten()
            y_pred_actual_wf = scaler.inverse_transform(y_pred_wf.reshape(-1, 1)).flatten()
            
            wf_metrics = validator.evaluate_predictions(y_test_actual_wf, y_pred_actual_wf, prices=True)
            wf_financial = validator.financial_metrics(y_test_actual_wf, y_pred_actual_wf)
            wf_metrics.update(wf_financial)
            wf_results.append(wf_metrics)
        
        # Aggregate walk-forward results
        wf_aggregated = {}
        if wf_results:
            for key in wf_results[0].keys():
                values = [r[key] for r in wf_results if not np.isnan(r[key])]
                if values:
                    wf_aggregated[f'{key}_mean'] = float(np.mean(values))
                    wf_aggregated[f'{key}_std'] = float(np.std(values))
            
            logger.info(f"Walk-forward R²: {wf_aggregated.get('r2_mean', 0):.4f}")
            logger.info(f"Walk-forward Sharpe: {wf_aggregated.get('sharpe_ratio_mean', 0):.4f}")
            logger.info(f"Walk-forward Win Rate: {wf_aggregated.get('win_rate_mean', 0)*100:.2f}%")
    
    except Exception as e:
        logger.warning(f"Walk-forward validation failed: {e}")
        wf_aggregated = {}
    
    # 9. Save metadata
    metadata = {
        'stock_code': stock_code,
        'training_date': datetime.now().isoformat(),
        'model_version': '2.0_stock_specific',
        'n_samples': int(len(prices)),
        'prediction_days': prediction_days,
        'validation_split': validation_split,
        'epochs_trained': len(history.history['loss']),
        'data_range': {
            'min': float(scaler.data_min_[0]),
            'max': float(scaler.data_max_[0])
        },
        'validation_metrics': val_metrics,
        'walk_forward_metrics': wf_aggregated,
        'model_path': str(model_path)
    }
    
    metadata_path = output_dir / f"{stock_code}_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"\n✓ Model saved: {model_path}")
    logger.info(f"✓ Metadata saved: {metadata_path}")
    
    # Save scaler
    import joblib
    scaler_path = output_dir / f"{stock_code}_scaler.joblib"
    joblib.dump(scaler, scaler_path)
    logger.info(f"✓ Scaler saved: {scaler_path}")
    
    return {
        'model': model,
        'scaler': scaler,
        'history': history.history,
        'val_metrics': val_metrics,
        'wf_metrics': wf_aggregated,
        'metadata': metadata
    }


def train_multiple_stocks(
    stock_codes: list = None,
    prediction_days: int = 60,
    epochs: int = 100,
    **kwargs
):
    """
    Train models for multiple stocks.
    
    Args:
        stock_codes: List of stock codes (None = use recommendations)
        prediction_days: Sequence length
        epochs: Max epochs
        **kwargs: Additional arguments for train_stock_model
    """
    set_seeds(settings.SEED)
    
    logger.info("="*80)
    logger.info("STOCK-SPECIFIC LSTM TRAINING - VERSION 2")
    logger.info("="*80)
    
    # Load data
    data = load_dataset()
    logger.info(f"\nLoaded {len(data):,} total records")
    
    # Determine stock column
    stock_col = 'CODE' if 'CODE' in data.columns else 'Code'
    date_col = 'DATE' if 'DATE' in data.columns else 'Date'
    
    # Use recommended stocks if none provided
    if stock_codes is None:
        recommendations_path = settings.TRAINED_MODEL_DIR / 'analysis' / 'training_recommendations.json'
        if recommendations_path.exists():
            with open(recommendations_path) as f:
                recommendations = json.load(f)
            stock_codes = recommendations['recommended_for_training'][:10]
            logger.info(f"Using recommended stocks: {stock_codes}")
        else:
            # Fallback to most liquid stocks
            stock_codes = ['SCOM', 'EQTY', 'KCB', 'BAMB', 'EABL']
            logger.info(f"Using default stocks: {stock_codes}")
    
    # Train each stock
    results = {}
    successful = 0
    failed = 0
    
    for stock_code in stock_codes:
        try:
            # Get stock data
            stock_data = data[data[stock_col] == stock_code].copy()
            stock_data = stock_data.sort_values(date_col)
            stock_data = stock_data.dropna(subset=['Day Price'])
            
            if len(stock_data) < 500:
                logger.warning(f"Skipping {stock_code}: insufficient data ({len(stock_data)} samples)")
                failed += 1
                continue
            
            # Train
            result = train_stock_model(
                stock_code=stock_code,
                stock_data=stock_data,
                prediction_days=prediction_days,
                epochs=epochs,
                **kwargs
            )
            
            if result:
                results[stock_code] = result
                successful += 1
            else:
                failed += 1
        
        except Exception as e:
            logger.error(f"Error training {stock_code}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    # Summary
    logger.info("\n" + "="*80)
    logger.info("TRAINING SUMMARY")
    logger.info("="*80)
    logger.info(f"\nSuccessful: {successful}/{len(stock_codes)}")
    logger.info(f"Failed: {failed}/{len(stock_codes)}")
    
    if results:
        logger.info(f"\n{'Stock':<10} {'R²':>8} {'MAE':>8} {'MAPE':>8} {'Neg%':>8} {'WF Sharpe':>12}")
        logger.info("-"*80)
        
        for stock, res in results.items():
            val = res['val_metrics']
            wf_sharpe = res['wf_metrics'].get('sharpe_ratio_mean', 0)
            logger.info(
                f"{stock:<10} "
                f"{val['r2']:>8.4f} "
                f"{val['mae']:>8.2f} "
                f"{val['mape']:>8.2f} "
                f"{val['negative_ratio']*100:>7.2f}% "
                f"{wf_sharpe:>12.4f}"
            )
    
    logger.info("\n" + "="*80)
    logger.info("✓ TRAINING COMPLETE")
    logger.info("="*80)
    
    return results


if __name__ == "__main__":
    # Train on recommended stocks
    results = train_multiple_stocks(
        stock_codes=None,  # Use recommendations
        prediction_days=60,
        epochs=50,  # Reduced for testing
        batch_size=32,
        early_stopping_patience=10
    )
