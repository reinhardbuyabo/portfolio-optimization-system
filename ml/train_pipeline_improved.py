"""
Improved LSTM Training Pipeline
- Trains per-stock models with stock-specific scaling
- Implements walk-forward validation
- Prevents negative price predictions
- Reports financial metrics
"""
from config.core import settings
from processing.data_manager import load_dataset, save_pipeline, save_preprocessor
from processing.walk_forward import WalkForwardValidator, validate_stock_predictions
from pipeline.lstm_model import create_lstm_model
from reproducibility import set_seeds, hash_dataframe, hash_files_and_timestamps, log_run_metadata
import numpy as np
import pandas as pd
import datetime
from sklearn.preprocessing import MinMaxScaler
from loguru import logger
import json


def train_stock_specific_model(
    stock_data: pd.DataFrame,
    stock_code: str,
    prediction_days: int = 60,
    epochs: int = 25,
    batch_size: int = 32,
    validation_split: float = 0.2
) -> dict:
    """
    Train LSTM model for a specific stock with stock-specific scaling.
    
    Args:
        stock_data: DataFrame containing stock price data
        stock_code: Stock ticker/code
        prediction_days: Sequence length for LSTM
        epochs: Number of training epochs
        batch_size: Batch size for training
        validation_split: Fraction of data to use for validation
        
    Returns:
        Dictionary containing model, scaler, and training history
    """
    logger.info(f"Training model for {stock_code}")
    
    # Extract prices
    prices = stock_data['Day Price'].values
    
    if len(prices) < prediction_days + 100:
        logger.warning(f"Insufficient data for {stock_code}: {len(prices)} samples")
        return None
    
    # Stock-specific scaling
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_prices = scaler.fit_transform(prices.reshape(-1, 1))
    
    logger.info(f"  Data range: [{scaler.data_min_[0]:.2f}, {scaler.data_max_[0]:.2f}]")
    logger.info(f"  Total samples: {len(prices)}")
    
    # Create sequences
    X, y = [], []
    for i in range(prediction_days, len(scaled_prices)):
        X.append(scaled_prices[i - prediction_days:i, 0])
        y.append(scaled_prices[i, 0])
    
    X = np.array(X).reshape(-1, prediction_days, 1)
    y = np.array(y)
    
    logger.info(f"  Training sequences: {len(X)}")
    
    # Create and train model
    model = create_lstm_model(input_shape=(prediction_days, 1))
    
    history = model.fit(
        X, y,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=validation_split,
        verbose=0
    )
    
    # Evaluate on full dataset
    y_pred = model.predict(X, verbose=0).flatten()
    
    # Inverse transform
    y_actual = scaler.inverse_transform(y.reshape(-1, 1)).flatten()
    y_pred_actual = scaler.inverse_transform(y_pred.reshape(-1, 1)).flatten()
    
    # Check for negative predictions
    neg_count = np.sum(y_pred_actual < 0)
    neg_ratio = neg_count / len(y_pred_actual)
    
    # Calculate final metrics
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    
    mse = mean_squared_error(y_actual, y_pred_actual)
    mae = mean_absolute_error(y_actual, y_pred_actual)
    r2 = r2_score(y_actual, y_pred_actual)
    
    logger.info(f"  Training metrics - MSE: {mse:.2f}, MAE: {mae:.2f}, R²: {r2:.4f}")
    logger.info(f"  Negative predictions: {neg_count}/{len(y_pred_actual)} ({100*neg_ratio:.2f}%)")
    
    return {
        'model': model,
        'scaler': scaler,
        'history': history.history,
        'metrics': {
            'mse': float(mse),
            'mae': float(mae),
            'r2': float(r2),
            'negative_predictions': int(neg_count),
            'negative_ratio': float(neg_ratio)
        },
        'data_range': {
            'min': float(scaler.data_min_[0]),
            'max': float(scaler.data_max_[0])
        },
        'n_samples': len(prices)
    }


def run_training_with_validation():
    """
    Train LSTM models with proper validation and stock-specific scaling.
    """
    set_seeds(settings.SEED)
    
    logger.info("="*80)
    logger.info("IMPROVED LSTM TRAINING PIPELINE")
    logger.info("="*80)
    
    # Load data
    data = load_dataset()
    logger.info(f"Loaded {len(data)} total records")
    
    # Group by stock
    if 'CODE' in data.columns:
        stock_col = 'CODE'
    elif 'Code' in data.columns:
        stock_col = 'Code'
    else:
        logger.error("No stock code column found")
        return
    
    stocks = data[stock_col].unique()
    logger.info(f"Found {len(stocks)} unique stocks")
    
    # Select top stocks by data availability
    stock_counts = data[stock_col].value_counts()
    top_stocks = stock_counts[stock_counts >= 500].head(10).index.tolist()
    
    logger.info(f"Training on {len(top_stocks)} stocks with sufficient data")
    logger.info(f"Selected stocks: {top_stocks}")
    
    results = {}
    
    for stock_code in top_stocks:
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing: {stock_code}")
        logger.info(f"{'='*60}")
        
        stock_data = data[data[stock_col] == stock_code].copy()
        stock_data = stock_data.sort_values('DATE' if 'DATE' in stock_data.columns else 'Date')
        stock_data = stock_data.dropna(subset=['Day Price'])
        
        # Train model
        result = train_stock_specific_model(
            stock_data=stock_data,
            stock_code=stock_code,
            prediction_days=60,
            epochs=settings.EPOCHS,
            batch_size=settings.BATCH_SIZE
        )
        
        if result is None:
            continue
        
        # Run walk-forward validation
        logger.info("Running walk-forward validation...")
        validation_results = validate_stock_predictions(
            stock_data=stock_data,
            model=result['model'],
            scaler=result['scaler'],
            prediction_days=60
        )
        
        if validation_results:
            logger.info(f"Walk-forward validation completed: {validation_results['n_splits']} splits")
            result['walk_forward_metrics'] = validation_results['metrics']
        
        results[stock_code] = result
    
    # Save results
    output_dir = settings.TRAINED_MODEL_DIR / 'stock_specific'
    output_dir.mkdir(exist_ok=True)
    
    for stock_code, result in results.items():
        # Save model
        model_path = output_dir / f"{stock_code}_model.h5"
        result['model'].save(model_path)
        logger.info(f"Saved model: {model_path}")
        
        # Save scaler
        import joblib
        scaler_path = output_dir / f"{stock_code}_scaler.joblib"
        joblib.dump(result['scaler'], scaler_path)
        logger.info(f"Saved scaler: {scaler_path}")
        
        # Save metadata
        metadata = {
            'stock_code': stock_code,
            'training_date': datetime.datetime.now().isoformat(),
            'model_version': settings.MODEL_VERSION,
            'metrics': result['metrics'],
            'data_range': result['data_range'],
            'n_samples': result['n_samples']
        }
        
        if 'walk_forward_metrics' in result:
            metadata['walk_forward_metrics'] = result['walk_forward_metrics']
        
        metadata_path = output_dir / f"{stock_code}_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"Saved metadata: {metadata_path}")
    
    # Summary report
    logger.info("\n" + "="*80)
    logger.info("TRAINING SUMMARY")
    logger.info("="*80)
    
    for stock_code, result in results.items():
        logger.info(f"\n{stock_code}:")
        logger.info(f"  Training R²: {result['metrics']['r2']:.4f}")
        logger.info(f"  Training MAE: {result['metrics']['mae']:.2f}")
        logger.info(f"  Negative predictions: {result['metrics']['negative_ratio']*100:.2f}%")
        
        if 'walk_forward_metrics' in result:
            wf = result['walk_forward_metrics']
            if 'r2_mean' in wf:
                logger.info(f"  Walk-forward R²: {wf['r2_mean']:.4f} ± {wf.get('r2_std', 0):.4f}")
            if 'mae_mean' in wf:
                logger.info(f"  Walk-forward MAE: {wf['mae_mean']:.2f} ± {wf.get('mae_std', 0):.2f}")
            if 'sharpe_ratio_mean' in wf:
                logger.info(f"  Sharpe ratio: {wf['sharpe_ratio_mean']:.4f}")
            if 'win_rate_mean' in wf:
                logger.info(f"  Win rate: {wf['win_rate_mean']*100:.2f}%")
    
    logger.info("\n" + "="*80)
    logger.info("TRAINING COMPLETE")
    logger.info("="*80)


if __name__ == "__main__":
    run_training_with_validation()
