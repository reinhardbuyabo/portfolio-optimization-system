from fastapi import APIRouter, HTTPException
from loguru import logger
import pandas as pd
import numpy as np
import time
import asyncio
from typing import List

from pipeline.garch_model import predict_next_day_volatility
from ..models.schemas import (
    GARCHVolatilityRequest,
    GARCHVolatilityResponse,
    BatchGARCHRequest,
    BatchGARCHResponse,
    ErrorResponse,
)

router = APIRouter()


def _compute_garch_prediction(req: GARCHVolatilityRequest) -> dict:
    start = time.perf_counter()
    try:
        # Validation 1: Check if log_returns exists and is not empty
        if not req.log_returns:
            raise ValueError("log_returns cannot be empty")
        
        # Validation 2: Check minimum data points (need at least 30 for GARCH)
        if len(req.log_returns) < 30:
            raise ValueError(f"Insufficient data: need at least 30 returns, got {len(req.log_returns)}")
        
        # Validation 3: Check for invalid values (NaN, Inf)
        invalid_count = sum(1 for r in req.log_returns if not np.isfinite(r))
        if invalid_count > 0:
            raise ValueError(f"Data contains {invalid_count} invalid values (NaN or Infinity)")
        
        # Validation 4: Check for zero variance (constant values)
        returns_array = np.array(req.log_returns)
        if np.std(returns_array) == 0:
            raise ValueError("Data has zero variance - all returns are identical")
        
        # Validation 5: Check for extreme outliers (> 50% daily return)
        max_abs_return = np.max(np.abs(returns_array))
        if max_abs_return > 0.5:
            logger.warning(f"Extreme return detected for {req.symbol}: {max_abs_return:.2%}")
        
        series = pd.Series(req.log_returns)
        
        # Use the new efficient function
        forecasted_variance = predict_next_day_volatility(
            series_original=series, 
            verbose=False
        )
        
        # Validation 6: Check if forecast is valid
        if forecasted_variance is None or not np.isfinite(forecasted_variance):
            raise ValueError("GARCH model produced invalid forecast")
        
        # Validation 7: Check if variance is in reasonable range
        if forecasted_variance < 0:
            raise ValueError(f"Negative variance forecast: {forecasted_variance}")
        
        if forecasted_variance > 1.0:
            logger.warning(f"Unusually high variance for {req.symbol}: {forecasted_variance}")
        
        # Calculate annualized volatility
        volatility_annualized = np.sqrt(forecasted_variance * 252)
        
        # Validation 8: Sanity check on annualized volatility (0-500%)
        if volatility_annualized > 5.0:
            raise ValueError(f"Unrealistic volatility: {volatility_annualized:.1%}")
        
        exec_time = time.perf_counter() - start
        
        logger.info(f"GARCH {req.symbol}: variance={forecasted_variance:.6f}, volatility={volatility_annualized:.2%}")
        
        return GARCHVolatilityResponse(
            symbol=req.symbol,
            forecasted_variance=float(forecasted_variance),
            volatility_annualized=float(volatility_annualized),
            execution_time=exec_time,
        ).dict()
    except Exception as e:
        exec_time = time.perf_counter() - start
        logger.error(f"GARCH error for {req.symbol}: {str(e)}")
        return ErrorResponse(error="volatility_failed", detail=str(e), execution_time=exec_time).dict()


@router.post("/garch", response_model=GARCHVolatilityResponse)
async def predict_garch(req: GARCHVolatilityRequest):
    result = await asyncio.to_thread(_compute_garch_prediction, req)
    if 'forecasted_variance' in result:
        logger.info("GARCH forecast for {} in {:.4f}s", req.symbol, result.get('execution_time', -1))
        return GARCHVolatilityResponse(**result)
    else:
        logger.error("GARCH prediction error for {}: {}", req.symbol, result.get('detail'))
        raise HTTPException(status_code=400, detail=result.get('detail', 'volatility failed'))


@router.post("/garch/batch", response_model=BatchGARCHResponse)
async def predict_garch_batch(req: BatchGARCHRequest):
    start_total = time.perf_counter()

    sem = asyncio.Semaphore(max(1, req.max_workers))

    async def bound_predict(stock: GARCHVolatilityRequest):
        async with sem:
            return await asyncio.to_thread(_compute_garch_prediction, stock)

    tasks = [asyncio.create_task(bound_predict(stock)) for stock in req.stocks]
    gathered = await asyncio.gather(*tasks, return_exceptions=True)

    results: List[dict] = []
    success = 0
    failed = 0
    for res in gathered:
        if isinstance(res, Exception):
            failed += 1
            results.append(ErrorResponse(error="volatility_failed", detail=str(res)).dict())
        else:
            results.append(res)
            if 'forecasted_variance' in res:
                success += 1
            else:
                failed += 1

    total_time = time.perf_counter() - start_total
    logger.info("GARCH batch parallel: {} success, {} failed in {:.2f}s", success, failed, total_time)
    return BatchGARCHResponse(results=results, total=len(req.stocks), successful=success, failed=failed, execution_time=total_time)
