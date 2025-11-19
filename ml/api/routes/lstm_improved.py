"""
Improved LSTM prediction route with stock-specific models and validation
"""
from fastapi import APIRouter, HTTPException, Request
from loguru import logger
import numpy as np
import pandas as pd
import time
import asyncio
from pathlib import Path
import joblib
import tensorflow as tf

from ..models.schemas import (
    LSTMPredictionRequest,
    LSTMPredictionResponse,
    BatchLSTMRequest,
    BatchLSTMResponse,
    ErrorResponse,
)
from config.core import settings

router = APIRouter()


def load_stock_model(stock_code: str):
    """
    Load stock-specific model and scaler.
    
    Args:
        stock_code: Stock ticker/code
        
    Returns:
        Tuple of (model, scaler) or (None, None) if not found
    """
    model_dir = settings.TRAINED_MODEL_DIR / 'stock_specific'
    
    model_path = model_dir / f"{stock_code}_model.h5"
    scaler_path = model_dir / f"{stock_code}_scaler.joblib"
    
    if not model_path.exists() or not scaler_path.exists():
        logger.warning(f"Stock-specific model not found for {stock_code}")
        return None, None
    
    try:
        model = tf.keras.models.load_model(model_path)
        scaler = joblib.load(scaler_path)
        return model, scaler
    except Exception as e:
        logger.error(f"Error loading model for {stock_code}: {e}")
        return None, None


def _compute_lstm_prediction_improved(
    req: LSTMPredictionRequest,
    use_stock_specific: bool = True
) -> dict:
    """
    Computes LSTM prediction with improved stock-specific scaling.
    
    Args:
        req: The prediction request
        use_stock_specific: Whether to use stock-specific models (recommended)
        
    Returns:
        Dictionary containing the prediction response or an error
    """
    start = time.perf_counter()
    
    try:
        input_df = pd.DataFrame(req.data)
        if 'Day Price' not in input_df.columns:
            raise ValueError("Input must include 'Day Price' column")
        
        original_prices = input_df['Day Price'].values
        prediction_days = req.prediction_days
        
        if len(original_prices) < prediction_days:
            raise ValueError(f"Require at least {prediction_days} samples for prediction")
        
        # Try to load stock-specific model
        stock_model, stock_scaler = None, None
        if use_stock_specific and req.symbol:
            stock_model, stock_scaler = load_stock_model(req.symbol)
        
        # Use stock-specific if available, otherwise create request-specific scaler
        if stock_model is not None and stock_scaler is not None:
            logger.info(f"Using stock-specific model for {req.symbol}")
            model = stock_model
            scaler = stock_scaler
            model_type = "stock_specific"
        else:
            logger.info(f"Using general model with request-specific scaling for {req.symbol}")
            # Load general model from app state (fallback)
            # For now, create a request-specific scaler
            from sklearn.preprocessing import MinMaxScaler
            scaler = MinMaxScaler(feature_range=(0, 1))
            scaler.fit(original_prices.reshape(-1, 1))
            
            # This would come from the app state in production
            model_path = settings.TRAINED_MODEL_DIR / f"{settings.MODEL_VERSION}.h5"
            if not model_path.exists():
                raise ValueError("No trained model found")
            model = tf.keras.models.load_model(model_path)
            model_type = "general_with_stock_scaling"
        
        # Scale prices
        scaled_prices = scaler.transform(original_prices.reshape(-1, 1))
        
        # Create sequence from the end of the data
        sequence = scaled_prices[-prediction_days:].reshape(1, prediction_days, 1)
        
        # Make prediction
        prediction_scaled = model.predict(sequence, verbose=0).ravel()[0]
        
        # Inverse transform to get actual price
        prediction_actual = scaler.inverse_transform([[prediction_scaled]])[0][0]
        
        # Ensure prediction is not negative
        if prediction_actual < 0:
            logger.warning(f"Negative prediction {prediction_actual:.2f} for {req.symbol}, clipping to 0")
            prediction_actual = max(0, prediction_actual)
        
        exec_time = time.perf_counter() - start
        
        # Get price range from the original data
        price_min = float(np.min(original_prices))
        price_max = float(np.max(original_prices))
        price_current = float(original_prices[-1])
        
        # Calculate prediction change
        prediction_change = prediction_actual - price_current
        prediction_change_pct = (prediction_change / price_current) * 100 if price_current != 0 else 0
        
        return LSTMPredictionResponse(
            symbol=req.symbol,
            prediction=float(prediction_actual),
            prediction_scaled=float(prediction_scaled),
            price_range={'min': price_min, 'max': price_max},
            horizon=prediction_days,
            execution_time=exec_time,
            model_type=model_type,
            current_price=price_current,
            predicted_change=float(prediction_change),
            predicted_change_pct=float(prediction_change_pct)
        ).dict()
        
    except Exception as e:
        exec_time = time.perf_counter() - start
        logger.error(f"Error during prediction for {req.symbol}: {e}")
        import traceback
        traceback.print_exc()
        return ErrorResponse(
            error="prediction_failed",
            detail=str(e),
            execution_time=exec_time
        ).dict()


@router.post("/lstm/improved", response_model=LSTMPredictionResponse)
async def predict_lstm_improved(req: LSTMPredictionRequest):
    """
    Improved LSTM prediction endpoint with stock-specific models.
    """
    result = await asyncio.to_thread(_compute_lstm_prediction_improved, req, use_stock_specific=True)
    
    if 'prediction' in result:
        logger.info(
            f"LSTM prediction for {req.symbol}: {result['current_price']:.2f} -> "
            f"{result['prediction']:.2f} ({result['predicted_change_pct']:+.2f}%) "
            f"in {result['execution_time']:.4f}s using {result['model_type']}"
        )
        return LSTMPredictionResponse(**result)
    else:
        logger.error(f"LSTM prediction error for {req.symbol}: {result.get('detail')}")
        raise HTTPException(status_code=400, detail=result.get('detail', 'prediction failed'))


@router.post("/lstm/batch/improved", response_model=BatchLSTMResponse)
async def predict_lstm_batch_improved(req: BatchLSTMRequest):
    """
    Improved batch LSTM prediction with stock-specific models.
    """
    start_total = time.perf_counter()
    
    sem = asyncio.Semaphore(max(1, req.max_workers))
    
    async def bound_predict(stock: LSTMPredictionRequest):
        async with sem:
            return await asyncio.to_thread(_compute_lstm_prediction_improved, stock, use_stock_specific=True)
    
    tasks = [asyncio.create_task(bound_predict(stock)) for stock in req.stocks]
    gathered = await asyncio.gather(*tasks, return_exceptions=True)
    
    results = []
    success = 0
    failed = 0
    
    for res in gathered:
        if isinstance(res, Exception):
            failed += 1
            results.append(ErrorResponse(error="prediction_failed", detail=str(res)).dict())
        else:
            results.append(res)
            if 'prediction' in res:
                success += 1
            else:
                failed += 1
    
    total_time = time.perf_counter() - start_total
    logger.info(f"LSTM batch improved: {success} success, {failed} failed in {total_time:.2f}s")
    
    return BatchLSTMResponse(
        results=results,
        total=len(req.stocks),
        successful=success,
        failed=failed,
        execution_time=total_time
    )
