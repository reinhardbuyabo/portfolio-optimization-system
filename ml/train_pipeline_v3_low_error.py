"""
Improved Training Pipeline V3 - Focus on Reducing MAE/MAPE
Implements refinements to achieve MAE < 1.0 KES and MAPE < 10%
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import json

from config.core import settings
from processing.data_manager import load_dataset
from pipeline.lstm_model_v2 import create_regularized_lstm
from processing.walk_forward import WalkForwardValidator
from reproducibility import set_seeds
from loguru import logger

from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras import backend as K
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import MinMaxScaler


def mape_loss(y_true, y_pred):
    """Custom MAPE loss for direct optimization"""
    diff = K.abs((y_true - y_pred) / K.clip(K.abs(y_true), K.epsilon(), None))
    return 100. * K.mean(diff)


def combined_mae_mape_loss(y_true, y_pred):
    """Combine MAE and MAPE for balanced optimization"""
    mae = K.mean(K.abs(y_true - y_pred))
    mape = K.mean(K.abs((y_true - y_pred) / K.clip(K.abs(y_true), K.epsilon(), None)))
    return mae + 0.3 * mape  # Weight MAPE lower since it's percentage-based


def filter_recent_data(stock_data, years=2):
    """
    Use only recent data to match current market regime.
    Reduces noise from historical volatility.
    """
    # Check various date column names
    date_cols = ['Date', 'DATE', 'date']
    date_col = None
    for col in date_cols:
        if col in stock_data.columns:
            date_col = col
            break
    
    if date_col is None:
        logger.warning("No date column found, using all data")
        return stock_data
    
    stock_data = stock_data.copy()
    stock_data[date_col] = pd.to_datetime(stock_data[date_col], errors='coerce')
    stock_data = stock_data.dropna(subset=[date_col])
    
    if len(stock_data) == 0:
        return stock_data
    
    cutoff_date = stock_data[date_col].max() - timedelta(days=365 * years)
    recent_data = stock_data[stock_data[date_col] >= cutoff_date]
    
    # If filtering removed too much data, use all
    if len(recent_data) < 300:
        logger.warning(f"Filtering to {years} years left only {len(recent_data)} samples, using all data")
        return stock_data
    
    logger.info(f"Filtered to last {years} years: {len(recent_data)}/{len(stock_data)} samples")
    return recent_data


def add_technical_features(prices):
    """
    Add technical indicators as features.
    Helps model understand trends and momentum.
    """
    df = pd.DataFrame({'price': prices})
    
    # Moving averages
    df['ma_5'] = df['price'].rolling(5, min_periods=1).mean()
    df['ma_20'] = df['price'].rolling(20, min_periods=1).mean()
    
    # Returns and volatility
    df['returns'] = df['price'].pct_change().fillna(0)
    df['volatility'] = df['returns'].rolling(20, min_periods=1).std().fillna(0)
    
    # Relative position in recent range
    rolling_min = df['price'].rolling(60, min_periods=1).min()
    rolling_max = df['price'].rolling(60, min_periods=1).max()
    df['price_position'] = (df['price'] - rolling_min) / (rolling_max - rolling_min + 1e-8)
    df['price_position'] = df['price_position'].fillna(0.5)
    
    # Momentum
    df['momentum'] = df['price'] - df['price'].shift(10).fillna(df['price'])
    
    return df


def create_sequences_with_features(data, prediction_days, use_features=True):
    """
    Create sequences with optional technical features.
    
    Args:
        data: DataFrame with price and features OR numpy array of prices
        prediction_days: Sequence length
        use_features: Whether to include technical indicators
        
    Returns:
        X, y arrays
    """
    if isinstance(data, pd.DataFrame) and use_features:
        # Use multiple features
        feature_cols = ['price', 'ma_5', 'ma_20', 'returns', 'volatility', 'price_position', 'momentum']
        features = data[feature_cols].values
        n_features = len(feature_cols)
    else:
        # Price only
        features = data if isinstance(data, np.ndarray) else data[['price']].values
        n_features = 1
    
    X, y = [], []
    for i in range(prediction_days, len(features)):
        X.append(features[i - prediction_days:i])
        y.append(features[i, 0])  # Predict price (first column)
    
    X = np.array(X)
    y = np.array(y)
    
    return X, y, n_features


def train_stock_model_v3(
    stock_code: str,
    stock_data: pd.DataFrame,
    prediction_days: int = 30,  # Reduced from 60
    validation_split: float = 0.15,
    epochs: int = 100,  # Increased
    batch_size: int = 32,
    early_stopping_patience: int = 15,  # Increased
    use_recent_only: bool = True,
    recent_years: int = 2,
    use_features: bool = True,
    use_combined_loss: bool = True,
    **model_kwargs
):
    """
    Train improved LSTM model with focus on reducing MAE/MAPE.
    
    Key improvements:
    1. Use recent data only (last 2 years)
    2. Shorter sequence length (30 vs 60 days)
    3. Technical indicators as features
    4. Combined MAE+MAPE loss function
    5. More epochs with higher patience
    """
    logger.info(f"\n{'='*80}")
    logger.info(f"Training Improved Model V3: {stock_code}")
    logger.info(f"{'='*80}")
    
    # 1. Filter to recent data if requested
    if use_recent_only:
        stock_data = filter_recent_data(stock_data, years=recent_years)
    
    if len(stock_data) < prediction_days + 100:
        logger.warning(f"Insufficient data for {stock_code}: {len(stock_data)} samples")
        return None
    
    # 2. Add technical features
    prices = stock_data['Day Price'].dropna().values
    logger.info(f"Price range: [{prices.min():.2f}, {prices.max():.2f}] KES")
    logger.info(f"Price std: {prices.std():.2f} KES")
    
    if use_features:
        features_df = add_technical_features(prices)
        logger.info(f"Added technical features: {list(features_df.columns)}")
    else:
        features_df = pd.DataFrame({'price': prices})
    
    # 3. Scale features
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(features_df.values)
    scaled_df = pd.DataFrame(scaled_data, columns=features_df.columns)
    
    # 4. Create sequences
    X, y, n_features = create_sequences_with_features(
        scaled_df, 
        prediction_days,
        use_features=use_features
    )
    
    logger.info(f"Created {len(X)} sequences with {n_features} features")
    
    # 5. Train/val split
    split_idx = int(len(X) * (1 - validation_split))
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    
    logger.info(f"Train: {len(X_train)}, Val: {len(X_val)}")
    
    # 6. Create model
    logger.info("Creating model with combined loss...")
    model = create_regularized_lstm(
        input_shape=(prediction_days, n_features),
        **model_kwargs
    )
    
    # Recompile with combined loss if requested
    if use_combined_loss:
        from tensorflow.keras.optimizers import Adam
        model.compile(
            optimizer=Adam(learning_rate=model_kwargs.get('learning_rate', 0.001)),
            loss=combined_mae_mape_loss,
            metrics=['mae', mape_loss]
        )
        logger.info("Using combined MAE+MAPE loss")
    
    logger.info(f"Model parameters: {model.count_params():,}")
    
    # 7. Setup callbacks
    output_dir = settings.TRAINED_MODEL_DIR / 'stock_specific_v3'
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
            patience=7,
            min_lr=0.00001,
            verbose=1
        )
    ]
    
    # 8. Train
    logger.info(f"Training for up to {epochs} epochs...")
    
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks,
        verbose=1
    )
    
    # 9. Evaluate
    logger.info("\nEvaluating on validation set...")
    
    y_val_pred = model.predict(X_val, verbose=0).flatten()
    
    # Inverse transform (price is first column)
    y_val_actual_scaled = np.column_stack([y_val] + [np.zeros_like(y_val)] * (n_features - 1))
    y_val_pred_scaled = np.column_stack([y_val_pred] + [np.zeros_like(y_val_pred)] * (n_features - 1))
    
    y_val_actual = scaler.inverse_transform(y_val_actual_scaled)[:, 0]
    y_val_pred_actual = scaler.inverse_transform(y_val_pred_scaled)[:, 0]
    
    # Metrics
    mse = mean_squared_error(y_val_actual, y_val_pred_actual)
    mae = mean_absolute_error(y_val_actual, y_val_pred_actual)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_val_actual, y_val_pred_actual)
    mape = np.mean(np.abs((y_val_actual - y_val_pred_actual) / (y_val_actual + 1e-8))) * 100
    
    neg_count = np.sum(y_val_pred_actual < 0)
    bias = np.mean(y_val_pred_actual - y_val_actual)
    
    val_metrics = {
        'mse': float(mse),
        'mae': float(mae),
        'rmse': float(rmse),
        'r2': float(r2),
        'mape': float(mape),
        'negative_predictions': int(neg_count),
        'bias': float(bias)
    }
    
    logger.info(f"\nValidation Metrics:")
    logger.info(f"  R²: {r2:.4f}")
    logger.info(f"  MAE: {mae:.2f} KES")
    logger.info(f"  RMSE: {rmse:.2f} KES")
    logger.info(f"  MAPE: {mape:.2f}%")
    logger.info(f"  Bias: {bias:.2f} KES")
    logger.info(f"  Negative: {neg_count}/{len(y_val_pred_actual)}")
    
    # 10. Save metadata
    metadata = {
        'stock_code': stock_code,
        'training_date': datetime.now().isoformat(),
        'model_version': '3.0_low_mae_mape',
        'improvements': [
            'Recent data only (2 years)',
            'Shorter sequences (30 days)',
            'Technical features' if use_features else 'Price only',
            'Combined MAE+MAPE loss' if use_combined_loss else 'Standard loss',
            'Extended training (100 epochs)'
        ],
        'n_samples': int(len(prices)),
        'prediction_days': prediction_days,
        'n_features': n_features,
        'epochs_trained': len(history.history['loss']),
        'data_range': {
            'min': float(prices.min()),
            'max': float(prices.max()),
            'mean': float(prices.mean()),
            'std': float(prices.std())
        },
        'validation_metrics': val_metrics
    }
    
    metadata_path = output_dir / f"{stock_code}_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    # Save scaler and feature info
    import joblib
    scaler_path = output_dir / f"{stock_code}_scaler.joblib"
    joblib.dump({
        'scaler': scaler,
        'feature_names': list(features_df.columns),
        'n_features': n_features
    }, scaler_path)
    
    logger.info(f"\n✓ Model saved: {model_path}")
    logger.info(f"✓ Metadata saved: {metadata_path}")
    logger.info(f"✓ Scaler saved: {scaler_path}")
    
    return {
        'model': model,
        'scaler': scaler,
        'history': history.history,
        'val_metrics': val_metrics,
        'metadata': metadata,
        'feature_names': list(features_df.columns)
    }


if __name__ == "__main__":
    set_seeds(settings.SEED)
    
    # Load data
    data = load_dataset()
    stock_col = 'CODE' if 'CODE' in data.columns else 'Code'
    date_col = 'DATE' if 'DATE' in data.columns else 'Date'
    
    # Test on SCOM
    logger.info("Training SCOM with improved pipeline V3...")
    stock_data = data[data[stock_col] == 'SCOM'].copy()
    
    # Parse and sort by date
    stock_data[date_col] = pd.to_datetime(stock_data[date_col], format='%d-%b-%y', errors='coerce')
    stock_data = stock_data.dropna(subset=[date_col])
    stock_data = stock_data.sort_values(date_col)
    
    logger.info(f"SCOM data: {len(stock_data)} rows from {stock_data[date_col].min()} to {stock_data[date_col].max()}")
    
    result = train_stock_model_v3(
        stock_code='SCOM',
        stock_data=stock_data,
        prediction_days=30,  # Shorter sequences
        epochs=50,  # More epochs
        batch_size=32,
        early_stopping_patience=15,
        use_recent_only=False,  # Use all data for now
        recent_years=2,
        use_features=True,
        use_combined_loss=True,
        lstm_units=50,
        dropout_rate=0.3,
        l2_reg=0.01
    )
    
    if result:
        logger.info("\n✓ Training complete!")
        logger.info(f"Final MAE: {result['val_metrics']['mae']:.2f} KES")
        logger.info(f"Final MAPE: {result['val_metrics']['mape']:.2f}%")
