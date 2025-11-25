"""
Validate General Model v4 (Log Transformations)

Test the general multi-stock model on real predictions.

Author: Reinhard
Date: 2024-11-18
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
import json
import joblib
from tensorflow import keras
from loguru import logger

from processing.log_scaler import LogPriceScaler


def validate_general_model():
    """Validate general model predictions."""
    
    logger.info("="*80)
    logger.info("VALIDATING GENERAL MODEL v4 (Log)")
    logger.info("="*80)
    
    # Load model and artifacts
    model_dir = Path(__file__).parent.parent / "trained_models" / "general_v4_log"
    
    logger.info("Loading model...")
    import tensorflow as tf
    model = keras.models.load_model(
        model_dir / "general_v4_log_best.h5",
        custom_objects={'mse': tf.keras.losses.MeanSquaredError()}
    )
    
    logger.info("Loading scalers...")
    scalers = joblib.load(model_dir / "scalers.joblib")
    
    logger.info("Loading stock ID mapping...")
    with open(model_dir / "stock_id_mapping.json", 'r') as f:
        stock_id_map = json.load(f)
    
    logger.info("Loading metadata...")
    with open(model_dir / "metadata.json", 'r') as f:
        metadata = json.load(f)
    
    logger.info(f"Model covers {len(stock_id_map)} stocks")
    logger.info(f"Training date: {metadata['training_date']}")
    logger.info(f"Epochs trained: {metadata['epochs_trained']}")
    
    # Test on a few sample stocks
    test_stocks = ['BKG', 'NBK', 'KPLC', 'TOTL', 'NCBA']
    
    logger.info("\n" + "="*80)
    logger.info("TESTING SAMPLE PREDICTIONS")
    logger.info("="*80)
    
    datasets_dir = Path(__file__).parent.parent / "datasets"
    df_2024 = pd.read_csv(datasets_dir / "NSE_data_all_stocks_2024_jan_to_oct.csv")
    if 'Code' in df_2024.columns:
        df_2024 = df_2024.rename(columns={'Code': 'Stock_code'})
    
    results = []
    
    for stock in test_stocks:
        if stock not in stock_id_map:
            logger.warning(f"Stock {stock} not in model")
            continue
        
        # Get recent data
        stock_data = df_2024[df_2024['Stock_code'] == stock].copy()
        
        if len(stock_data) < 61:
            logger.warning(f"Insufficient data for {stock}")
            continue
        
        # Get last 60 days for prediction
        prices = stock_data['Day Price'].astype(str).str.replace(',', '').astype(float).values
        recent_60 = prices[-61:-1]  # Last 60 days (excluding most recent)
        actual_next = prices[-1]     # Actual next day price
        
        # Scale prices
        scaler = scalers[stock]
        scaled_prices = scaler.transform(recent_60)
        
        # Prepare input
        stock_id = stock_id_map[stock]
        X_stock = np.array([stock_id])
        X_price = scaled_prices.reshape(1, 60, 1)
        
        # Predict
        pred_scaled = model.predict([X_stock, X_price], verbose=0)[0][0]
        
        # Inverse transform
        prediction = scaler.inverse_transform(np.array([[pred_scaled]]))[0][0]
        
        # Calculate error
        error = abs(prediction - actual_next)
        pct_error = (error / actual_next) * 100
        
        results.append({
            'stock': stock,
            'actual': actual_next,
            'predicted': prediction,
            'error': error,
            'pct_error': pct_error
        })
        
        logger.info(f"\n{stock}:")
        logger.info(f"  Actual:     {actual_next:.2f} KES")
        logger.info(f"  Predicted:  {prediction:.2f} KES")
        logger.info(f"  Error:      {error:.2f} KES ({pct_error:.2f}%)")
    
    # Summary
    if results:
        avg_mape = np.mean([r['pct_error'] for r in results])
        logger.info("\n" + "="*80)
        logger.info("SUMMARY")
        logger.info("="*80)
        logger.info(f"Stocks tested: {len(results)}")
        logger.info(f"Average MAPE: {avg_mape:.2f}%")
        logger.info(f"Target MAPE: 8-12%")
        
        if avg_mape < 15:
            logger.info("✅ Model performance ACCEPTABLE")
        else:
            logger.warning("⚠️  Model performance below target")
        
        # Print results table
        df_results = pd.DataFrame(results)
        print("\nDetailed Results:")
        print(df_results.to_string(index=False))
    
    return results, metadata


if __name__ == "__main__":
    try:
        results, metadata = validate_general_model()
        logger.info("\n✅ Validation complete!")
    except Exception as e:
        logger.exception(f"Validation failed: {e}")
        sys.exit(1)
