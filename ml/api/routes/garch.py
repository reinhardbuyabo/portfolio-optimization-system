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
        if not req.log_returns:
            raise ValueError("log_returns cannot be empty")
        series = pd.Series(req.log_returns)
        
        # Use the new efficient function
        forecasted_variance = predict_next_day_volatility(
            series_original=series, 
            verbose=False
        )
        
        exec_time = time.perf_counter() - start
        return GARCHVolatilityResponse(
            symbol=req.symbol,
            forecasted_variance=forecasted_variance,
            realized_variance=None,  # This is no longer calculated
            execution_time=exec_time,
        ).dict()
    except Exception as e:
        exec_time = time.perf_counter() - start
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
