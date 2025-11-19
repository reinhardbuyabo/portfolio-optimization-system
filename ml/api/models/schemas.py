from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    execution_time: Optional[float] = None


class LSTMPredictionRequest(BaseModel):
    symbol: str
    data: List[Dict[str, Any]]
    prediction_days: int = 60


class LSTMPredictionResponse(BaseModel):
    symbol: str
    prediction: float  # Actual price (inverse-transformed)
    prediction_scaled: float  # Scaled value (0-1)
    price_range: Dict[str, float]  # {'min': ..., 'max': ...}
    horizon: int  # Number of days ahead for this prediction
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    execution_time: float
    model_type: Optional[str] = None  # 'stock_specific' or 'general_with_stock_scaling'
    current_price: Optional[float] = None  # Current price from input data
    predicted_change: Optional[float] = None  # Absolute change
    predicted_change_pct: Optional[float] = None  # Percentage change


class BatchLSTMRequest(BaseModel):
    stocks: List[LSTMPredictionRequest]
    max_workers: int = 4


class BatchLSTMResponse(BaseModel):
    results: List[Dict[str, Any]]
    total: int
    successful: int
    failed: int
    execution_time: float


class GARCHVolatilityRequest(BaseModel):
    symbol: str
    log_returns: List[float]
    train_frac: float = 0.8


class GARCHVolatilityResponse(BaseModel):
    symbol: str
    forecasted_variance: float
    volatility_annualized: float  # sqrt(variance * 252)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    execution_time: float


class BatchGARCHRequest(BaseModel):
    stocks: List[GARCHVolatilityRequest]
    max_workers: int = 4


class BatchGARCHResponse(BaseModel):
    results: List[Dict[str, Any]]
    total: int
    successful: int
    failed: int
    execution_time: float