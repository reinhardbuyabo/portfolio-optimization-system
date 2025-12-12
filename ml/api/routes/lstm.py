from fastapi import APIRouter, HTTPException, Request
from loguru import logger
import numpy as np
import pandas as pd
import time
import asyncio
from sklearn.preprocessing import MinMaxScaler

from ..models.schemas import (
    LSTMPredictionRequest,
    LSTMPredictionResponse,
    BatchLSTMRequest,
    BatchLSTMResponse,
    ErrorResponse,
)

router = APIRouter()


def _compute_lstm_prediction(preprocessor, pipeline, req: LSTMPredictionRequest) -> dict:
    """
    Computes a single LSTM prediction.

    Args:
        preprocessor: The fitted DataPreprocessor object.
        pipeline: The trained Keras pipeline.
        req: The prediction request.

    Returns:
        A dictionary containing the prediction response or an error.
    """
    start = time.perf_counter()
    try:
        input_df = pd.DataFrame(req.data)
        if 'Day Price' not in input_df.columns:
            raise ValueError("Input must include 'Day Price' column")

        original_prices = input_df['Day Price'].values
        
        # Create a per-request scaler fitted to THIS stock's price range
        # This ensures predictions are in the correct price range for the stock
        request_scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_prices = request_scaler.fit_transform(original_prices.reshape(-1, 1))
        
        prediction_days = req.prediction_days
        if len(scaled_prices) < prediction_days:
            raise ValueError(f"Require at least {prediction_days} samples for prediction")

        # Create sequence from the end of the data
        sequence = scaled_prices[-prediction_days:].reshape(1, prediction_days, 1)
        
        # Make prediction
        prediction_scaled = pipeline.predict(sequence, verbose=0).ravel()[0]
        
        # Inverse transform using the request scaler (not the global training scaler)
        prediction_actual = request_scaler.inverse_transform([[prediction_scaled]])[0][0]
        
        exec_time = time.perf_counter() - start
        
        # Get price range from the original, unscaled data for context
        price_min = float(np.min(original_prices))
        price_max = float(np.max(original_prices))

        return LSTMPredictionResponse(
            symbol=req.symbol,
            prediction=float(prediction_actual),
            prediction_scaled=float(prediction_scaled),
            price_range={'min': price_min, 'max': price_max},
            horizon=prediction_days,
            execution_time=exec_time
        ).dict()
    except Exception as e:
        exec_time = time.perf_counter() - start
        logger.error(f"Error during prediction for {req.symbol}: {e}")
        return ErrorResponse(error="prediction_failed", detail=str(e), execution_time=exec_time).dict()


@router.post("/lstm", response_model=LSTMPredictionResponse)
async def predict_lstm(req: LSTMPredictionRequest, request: Request):
    preprocessor = request.app.state.preprocessor
    pipeline = request.app.state.pipeline
    result = await asyncio.to_thread(_compute_lstm_prediction, preprocessor, pipeline, req)
    if 'prediction' in result:
        logger.info("LSTM prediction for {} in {:.4f}s", req.symbol, result.get('execution_time', -1))
        return LSTMPredictionResponse(**result)
    else:
        logger.error("LSTM prediction error for {}: {}", req.symbol, result.get('detail'))
        raise HTTPException(status_code=400, detail=result.get('detail', 'prediction failed'))


@router.post("/lstm/batch", response_model=BatchLSTMResponse)
async def predict_lstm_batch(req: BatchLSTMRequest, request: Request):
    start_total = time.perf_counter()
    preprocessor = request.app.state.preprocessor
    pipeline = request.app.state.pipeline

    sem = asyncio.Semaphore(max(1, req.max_workers))

    async def bound_predict(stock: LSTMPredictionRequest):
        async with sem:
            return await asyncio.to_thread(_compute_lstm_prediction, preprocessor, pipeline, stock)

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
    logger.info("LSTM batch parallel: {} success, {} failed in {:.2f}s", success, failed, total_time)
    return BatchLSTMResponse(results=results, total=len(req.stocks), successful=success, failed=failed, execution_time=total_time)
