"""
Stock-Specific Prediction Routes (v4 with Log Transformations)

FastAPI routes for stock-specific LSTM predictions using v4 log models.

Features:
- Single stock prediction (1d, 5d, 10d, 30d horizons)
- Batch prediction (multiple stocks at once)
- Sector-based prediction
- Model availability queries
- Dynamic model loading with LRU caching

Author: Reinhard
Date: 2024-11-18
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal
from datetime import datetime
import time
import numpy as np
import asyncio

from loguru import logger

from api.services.model_registry import get_registry, ModelNotFoundError


router = APIRouter(tags=["Stock Predictions v4 (Log)"])


# ============================================================================
# Request/Response Models
# ============================================================================

class StockPredictionRequest(BaseModel):
    """Request for single stock prediction."""
    symbol: str = Field(..., description="Stock symbol (e.g., 'SCOM')")
    horizon: Literal["1d", "5d", "10d", "30d"] = Field("10d", description="Prediction horizon")
    recent_prices: Optional[List[float]] = Field(None, description="Recent 60 prices (optional, fetches from DB if not provided)")


class StockPredictionResponse(BaseModel):
    """Response for single stock prediction."""
    symbol: str
    prediction: float
    horizon: str
    confidence_interval: Optional[Dict[str, float]] = None
    mape: Optional[float] = None
    model_version: str = "v4_log"
    execution_time: float
    cached: bool
    timestamp: str


class BatchPredictionRequest(BaseModel):
    """Request for batch predictions."""
    symbols: List[str] = Field(..., description="List of stock symbols")
    horizon: Literal["1d", "5d", "10d", "30d"] = Field("10d", description="Prediction horizon")
    recent_prices: Optional[List[float]] = Field(None, description="Recent 60 prices (same for all stocks, or fetches from DB if not provided)")


class BatchPredictionResponse(BaseModel):
    """Response for batch predictions."""
    predictions: List[StockPredictionResponse]
    summary: Dict
    execution_time: float
    timestamp: str


class SectorPredictionRequest(BaseModel):
    """Request for sector-based predictions."""
    sector: str = Field(..., description="Sector name (e.g., 'Banking')")
    horizon: Literal["1d", "5d", "10d", "30d"] = Field("10d", description="Prediction horizon")


class ModelInfo(BaseModel):
    """Information about a trained model."""
    symbol: str
    available: bool
    cached: bool
    training_date: Optional[str] = None
    test_mape: Optional[float] = None
    model_version: str = "v4_log"


class ModelsAvailableResponse(BaseModel):
    """Response for models availability."""
    total_stocks: int
    trained_models: int
    available_stocks: List[str]
    models_by_sector: Optional[Dict] = None
    model_version: str = "v4_log"
    cache_stats: Dict


# ============================================================================
# Helper Functions
# ============================================================================

def horizon_to_days(horizon: str) -> int:
    """Convert horizon string to number of days."""
    mapping = {"1d": 1, "5d": 5, "10d": 10, "30d": 30}
    return mapping.get(horizon, 10)


async def make_prediction(
    registry,
    symbol: str,
    horizon: str,
    recent_prices: Optional[List[float]] = None
) -> StockPredictionResponse:
    """
    Make a prediction for a single stock (hybrid: specific or general model).
    
    Args:
        registry: StockModelRegistry instance
        symbol: Stock symbol
        horizon: Prediction horizon
        recent_prices: Optional recent prices (if not provided, fetches from DB)
    
    Returns:
        StockPredictionResponse
    """
    start_time = time.time()
    
    try:
        # Load model and scaler (hybrid)
        model_type = registry.get_model_type(symbol)
        cache_key = f"specific_{symbol}" if model_type == "stock_specific" else None
        was_cached = cache_key in registry.cache.keys() if cache_key else False
        
        model, scaler, model_type = registry.load_model(symbol)
        
        # Get recent prices (60 days for sequence)
        if recent_prices is None:
            # TODO: Fetch from database
            # For now, raise error
            raise HTTPException(
                status_code=400,
                detail="recent_prices parameter is required (DB fetch not yet implemented)"
            )
        
        if len(recent_prices) < 60:
            raise HTTPException(
                status_code=400,
                detail=f"Need at least 60 recent prices, got {len(recent_prices)}"
            )
        
        # Take last 60 prices
        prices = np.array(recent_prices[-60:])
        
        # Transform prices
        scaled_prices = scaler.transform(prices)
        
        # Prepare input based on model type
        if model_type == "stock_specific":
            # Stock-specific model: just price sequence
            X = scaled_prices.reshape(1, 60, 1)
            pred_scaled = model.predict(X, verbose=0)[0][0]
        else:
            # General model: stock ID + price sequence
            stock_id = registry.general_stock_ids[symbol]
            X_stock = np.array([stock_id])
            X_price = scaled_prices.reshape(1, 60, 1)
            pred_scaled = model.predict([X_stock, X_price], verbose=0)[0][0]
        
        # Inverse transform
        prediction = scaler.inverse_transform(np.array([[pred_scaled]]))[0][0]
        
        # Get metadata for MAPE
        metadata = registry.get_metadata(symbol)
        if model_type == "stock_specific":
            test_mape = metadata.get("test_mape") if metadata else None
        else:
            # For general model, use a placeholder MAPE
            test_mape = 4.5  # From validation
        
        execution_time = time.time() - start_time
        
        return StockPredictionResponse(
            symbol=symbol,
            prediction=float(prediction),
            horizon=horizon,
            mape=test_mape,
            model_version=f"v4_log_{model_type}",
            execution_time=execution_time,
            cached=was_cached,
            timestamp=datetime.now().isoformat()
        )
        
    except ModelNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/predict", response_model=StockPredictionResponse)
async def predict_stock(request: StockPredictionRequest, app_request: Request):
    """
    Predict price for a single stock.
    
    Example:
    ```
    POST /api/v4/predict
    {
        "symbol": "SCOM",
        "horizon": "10d",
        "recent_prices": [16.5, 16.8, ..., 17.2]  // Last 60 days
    }
    ```
    """
    registry = app_request.app.state.model_registry
    
    result = await make_prediction(
        registry,
        request.symbol.upper(),
        request.horizon,
        request.recent_prices
    )
    
    logger.info(
        f"Prediction: {request.symbol} @ {request.horizon} = "
        f"{result.prediction:.2f} KES (cached: {result.cached}, "
        f"time: {result.execution_time:.3f}s)"
    )
    
    return result


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest, app_request: Request):
    """
    Predict prices for multiple stocks in parallel.
    
    Example:
    ```
    POST /api/v4/predict/batch
    {
        "symbols": ["SCOM", "EQTY", "KCB"],
        "horizon": "10d",
        "recent_prices": [17.2, 17.5, ...]  # Optional: 60 recent prices
    }
    ```
    
    If recent_prices is provided, it will be used for all stocks.
    Otherwise, fetches historical data from DB (not yet implemented).
    """
    registry = app_request.app.state.model_registry
    start_time = time.time()
    
    # Process predictions in parallel
    tasks = [
        make_prediction(registry, symbol.upper(), request.horizon, request.recent_prices)
        for symbol in request.symbols
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Separate successful predictions from errors
    predictions = []
    errors = []
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            errors.append({
                "symbol": request.symbols[i],
                "error": str(result)
            })
        else:
            predictions.append(result)
    
    execution_time = time.time() - start_time
    
    summary = {
        "total": len(request.symbols),
        "successful": len(predictions),
        "failed": len(errors),
        "errors": errors if errors else None
    }
    
    logger.info(
        f"Batch prediction: {len(predictions)}/{len(request.symbols)} successful "
        f"in {execution_time:.3f}s"
    )
    
    return BatchPredictionResponse(
        predictions=predictions,
        summary=summary,
        execution_time=execution_time,
        timestamp=datetime.now().isoformat()
    )


@router.get("/models/available", response_model=ModelsAvailableResponse)
async def get_available_models(
    app_request: Request,
    include_sectors: bool = Query(False, description="Include sector grouping")
):
    """
    Get list of available trained models.
    
    Example:
    ```
    GET /api/v4/models/available?include_sectors=true
    ```
    """
    registry = app_request.app.state.model_registry
    
    available_stocks = registry.get_all_available_stocks()
    stats = registry.get_stats()
    
    # TODO: Load sector mapping from CSV
    models_by_sector = None
    if include_sectors:
        # Placeholder - would load from NSE_data_stock_market_sectors_2023_2024.csv
        pass
    
    return ModelsAvailableResponse(
        total_stocks=66,  # From CSV
        trained_models=stats['total_coverage'],
        available_stocks=available_stocks,
        models_by_sector=models_by_sector,
        model_version="v4_log_hybrid",
        cache_stats=stats
    )


@router.get("/models/{symbol}", response_model=ModelInfo)
async def get_model_info(symbol: str, app_request: Request):
    """
    Get information about a specific stock model.
    
    Example:
    ```
    GET /api/v4/models/SCOM
    ```
    """
    registry = app_request.app.state.model_registry
    
    info = registry.get_model_info(symbol.upper())
    
    model_version = f"v4_log_{info.get('model_type', 'unknown')}"
    
    return ModelInfo(
        symbol=info["symbol"],
        available=info["available"],
        cached=info.get("cached", False),
        training_date=info.get("training_date"),
        test_mape=info.get("test_mape"),
        model_version=model_version
    )


@router.get("/stats")
async def get_registry_stats(app_request: Request):
    """
    Get model registry statistics (cache hit rate, etc.).
    
    Example:
    ```
    GET /api/v4/stats
    ```
    """
    registry = app_request.app.state.model_registry
    stats = registry.get_stats()
    
    return {
        **stats,
        "cached_stocks": registry.get_cached_stocks(),
        "timestamp": datetime.now().isoformat()
    }


@router.post("/cache/clear")
async def clear_cache(app_request: Request):
    """
    Clear model cache (admin endpoint).
    
    Example:
    ```
    POST /api/v4/cache/clear
    ```
    """
    registry = app_request.app.state.model_registry
    registry.clear_cache()
    
    logger.info("Model cache cleared by admin")
    
    return {
        "status": "success",
        "message": "Model cache cleared",
        "timestamp": datetime.now().isoformat()
    }


@router.post("/refresh")
async def refresh_registry(app_request: Request):
    """
    Refresh model registry (rescan models directory).
    
    Use this after training new models.
    
    Example:
    ```
    POST /api/v4/refresh
    ```
    """
    registry = app_request.app.state.model_registry
    registry.refresh()
    
    available = registry.get_available_stocks()
    
    logger.info(f"Registry refreshed: {len(available)} models available")
    
    return {
        "status": "success",
        "message": "Registry refreshed",
        "available_models": len(available),
        "stocks": available,
        "timestamp": datetime.now().isoformat()
    }


# ============================================================================
# Health Check
# ============================================================================

@router.get("/health")
async def health_check(app_request: Request):
    """
    Health check endpoint.
    
    Example:
    ```
    GET /api/v4/health
    ```
    """
    registry = app_request.app.state.model_registry
    stats = registry.get_stats()
    
    return {
        "status": "healthy",
        "service": "Stock Prediction API v4 (Log - Hybrid)",
        "total_coverage": stats["total_coverage"],
        "specific_models": stats["specific_models"],
        "general_model_stocks": stats["general_model_stocks"],
        "cache_size": f"{stats['cache_size']}/{stats['cache_capacity']}",
        "cache_hit_rate": f"{stats['cache_hit_rate']}%",
        "timestamp": datetime.now().isoformat()
    }
