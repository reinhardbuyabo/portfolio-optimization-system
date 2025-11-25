from fastapi import APIRouter, HTTPException, Request
from loguru import logger
import numpy as np
import pandas as pd
import time
import asyncio
import math

from ..models.schema import (
    StockAnalysisRequest,
    StockAnalysisResponse,
    LSTMPredictionResult,
    GARCHForecastResult,
    ErrorResponse,
)
from pipeline.garch_model import predict_next_day_volatility

# THIS IS THE FIXED SEQUENCE LENGTH YOUR MODEL WAS TRAINED ON
MODEL_INPUT_SEQUENCE_LENGTH = 60

router = APIRouter()

def _compute_lstm_prediction(preprocessor, pipeline, price_data_list: list) -> dict:
    """
    Computes LSTM prediction with the *CORRECT* scaler.
    """
    start = time.perf_counter()
    
    # 1. Get the single, trained scaler from the preprocessor
    if not hasattr(preprocessor, 'scaler'):
         raise ValueError("Preprocessor is missing 'scaler' attribute.")
    scaler = preprocessor.scaler

    # 2. Format input data
    input_df = pd.DataFrame(price_data_list)
    if 'Day Price' not in input_df.columns:
        raise ValueError("Input must include 'Day Price' column")
    
    original_prices = input_df['Day Price'].values
    if len(original_prices) < MODEL_INPUT_SEQUENCE_LENGTH:
         raise ValueError(f"Require at least {MODEL_INPUT_SEQUENCE_LENGTH} price samples.")

    # 3. Transform using the *correct* scaler
    # We only need to transform the last {N} days for the sequence
    prices_to_scale = original_prices[-MODEL_INPUT_SEQUENCE_LENGTH:]
    scaled = scaler.transform(prices_to_scale.reshape(-1, 1))

    # 4. Create sequence and predict
    seq = scaled.reshape(1, MODEL_INPUT_SEQUENCE_LENGTH, 1)
    pred = pipeline.predict(seq, verbose=0)
    prediction_scaled = float(pred.ravel()[0])
    
    # 5. Inverse transform using the *correct* scaler
    prediction_actual = scaler.inverse_transform([[prediction_scaled]])[0][0]
    
    # Get scaler range for context
    price_min = float(scaler.data_min_[0])
    price_max = float(scaler.data_max_[0])

    exec_time = time.perf_counter() - start
    
    return LSTMPredictionResult(
        prediction=float(prediction_actual),
        prediction_scaled=prediction_scaled,
        price_range={'min': price_min, 'max': price_max},
        execution_time=exec_time
    ).model_dump()

def _compute_garch_forecast(log_returns: list) -> dict:
    """
    Computes GARCH forecast using the new efficient function.
    """
    start = time.perf_counter()
    
    series = pd.Series(log_returns)
    forecasted_var_1d = predict_next_day_volatility(series_original=series)
    
    # Calculate other volatility metrics
    volatility_1d = math.sqrt(forecasted_var_1d)
    # 252 trading days in a year
    annualized_vol = volatility_1d * math.sqrt(252) 
    
    exec_time = time.perf_counter() - start
    
    return GARCHForecastResult(
        forecasted_variance_1d=forecasted_var_1d,
        forecasted_volatility_1d=volatility_1d,
        annualized_volatility=annualized_vol,
        execution_time=exec_time
    ).model_dump()

@router.post("/stock/analyze", response_model=StockAnalysisResponse)
async def analyze_stock(req: StockAnalysisRequest, request: Request):
    """
    Runs a combined analysis:
    1. LSTM 1-Day Price Forecast
    2. GARCH 1-Day Volatility Forecast
    3. Calculates Sharpe Ratio
    """
    total_start = time.perf_counter()
    
    # Get models from app state
    preprocessor = request.app.state.preprocessor
    pipeline = request.app.state.pipeline

    try:
        # Run computations in parallel
        lstm_task = asyncio.to_thread(
            _compute_lstm_prediction, 
            preprocessor, 
            pipeline, 
            req.price_data
        )
        garch_task = asyncio.to_thread(
            _compute_garch_forecast, 
            req.log_returns
        )
        
        results = await asyncio.gather(lstm_task, garch_task)
        
        lstm_result_dict = results[0]
        garch_result_dict = results[1]

        # Convert dicts back to Pydantic models for validation & access
        lstm_result = LSTMPredictionResult(**lstm_result_dict)
        garch_result = GARCHForecastResult(**garch_result_dict)

        # --- Calculate Combined Metrics ---
        current_price = float(req.price_data[-1]['Day Price'])
        predicted_price = lstm_result.prediction

        if current_price == 0:
            raise ValueError("Current price is zero, cannot calculate return.")
            
        # 1. Expected Return
        expected_return_1d = (predicted_price - current_price) / current_price
        # (1 + 0.001)^252 - 1
        annualized_return = (1 + expected_return_1d) ** 252 - 1

        # 2. Volatility (already calculated)
        annualized_vol = garch_result.annualized_volatility
        if annualized_vol == 0:
             raise ValueError("Annualized volatility is zero, cannot calculate Sharpe Ratio.")

        # 3. Sharpe Ratio
        sharpe_ratio = (annualized_return - req.risk_free_rate) / annualized_vol

        total_exec_time = time.perf_counter() - total_start
        
        logger.info(f"Analysis for {req.symbol} completed in {total_exec_time:.4f}s")
        
        return StockAnalysisResponse(
            symbol=req.symbol,
            lstm_result=lstm_result,
            garch_result=garch_result,
            current_price=current_price,
            expected_return_1d=expected_return_1d,
            annualized_return=annualized_return,
            sharpe_ratio=sharpe_ratio,
            total_execution_time=total_exec_time
        )

    except Exception as e:
        total_exec_time = time.perf_counter() - total_start
        logger.error(f"Analysis for {req.symbol} failed after {total_exec_time:.4f}s: {e}")
        raise HTTPException(status_code=400, detail=str(e))
