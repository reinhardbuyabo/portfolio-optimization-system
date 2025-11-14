from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone

# --- SHARED ---

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    execution_time: Optional[float] = None

# --- SINGLE STOCK ANALYSIS ---

class StockAnalysisRequest(BaseModel):
    symbol: str
    price_data: List[Dict[str, Any]] = Field(..., description="List of dicts, must contain 'Day Price'")
    log_returns: List[float]
    risk_free_rate: float = Field(default=0.05, description="Annualized risk-free rate")

class LSTMPredictionResult(BaseModel):
    prediction: float
    prediction_scaled: float
    price_range: Dict[str, float]
    execution_time: float

class GARCHForecastResult(BaseModel):
    forecasted_variance_1d: float
    forecasted_volatility_1d: float
    annualized_volatility: float
    execution_time: float

class StockAnalysisResponse(BaseModel):
    symbol: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    lstm_result: LSTMPredictionResult
    garch_result: GARCHForecastResult
    current_price: float
    expected_return_1d: float
    annualized_return: float
    sharpe_ratio: float
    total_execution_time: float

# --- BATCH PORTFOLIO ANALYSIS ---

class PortfolioOptimizationRequest(BaseModel):
    symbols: List[str]
    log_returns_map: Dict[str, List[float]]
    risk_free_rate: float = Field(default=0.05, description="Annualized risk-free rate")

class PortfolioPerformance(BaseModel):
    expected_annual_return: float
    annual_volatility: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float

class EfficientFrontierPoint(BaseModel):
    risk: float
    return_val: float = Field(..., alias="return")
    label: Optional[str] = None
    
    class Config:
        populate_by_name = True

class PortfolioOptimizationResponse(BaseModel):
    max_sharpe_portfolio: Dict[str, Any]
    efficient_frontier_points: List[EfficientFrontierPoint]
    execution_time: float