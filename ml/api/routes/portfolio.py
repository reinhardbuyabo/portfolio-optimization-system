from fastapi import APIRouter, HTTPException
from loguru import logger
import pandas as pd
import numpy as np
import time

from ..models.schema import (
    PortfolioOptimizationRequest,
    PortfolioOptimizationResponse,
    PortfolioPerformance,
    EfficientFrontierPoint,
)

# Import PyPortfolioOpt
from pypfopt import EfficientFrontier, risk_models, expected_returns
from pypfopt.exceptions import OptimizationError

router = APIRouter()

@router.post("/portfolio/optimize", response_model=PortfolioOptimizationResponse)
async def optimize_portfolio(req: PortfolioOptimizationRequest):
    """
    Calculates the Efficient Frontier and finds the Max Sharpe portfolio
    using historical log returns.
    """
    start_time = time.perf_counter()
    
    try:
        if not req.symbols or not req.log_returns_map:
            raise ValueError("Symbols list and log_returns_map are required.")
        
        if len(req.symbols) < 2:
             raise ValueError("Portfolio optimization requires at least 2 assets.")

        # --- 1. Prepare Price/Return Data ---
        returns_df = pd.DataFrame(req.log_returns_map)
        returns_df.dropna(inplace=True)

        if returns_df.shape[0] < 20:
            raise ValueError(f"Insufficient common data points ({returns_df.shape[0]}) for optimization.")

        # --- 2. Calculate Expected Returns and Covariance ---
        mu = expected_returns.mean_historical_return(
            returns_df, returns_data=True, compounding=True, frequency=252
        )
        S = risk_models.sample_cov(
            returns_df, returns_data=True, frequency=252
        )
        
        # --- 3. Find Max Sharpe Portfolio ---
        ef = EfficientFrontier(mu, S)
        
        try:
            max_sharpe_weights = ef.max_sharpe(risk_free_rate=req.risk_free_rate)
        except OptimizationError as e:
            logger.warning(f"Max Sharpe optimization failed: {e}. Falling back to min_volatility.")
            max_sharpe_weights = ef.min_volatility()

        cleaned_weights = ef.clean_weights()
        max_sharpe_performance = ef.portfolio_performance(
            risk_free_rate=req.risk_free_rate, verbose=False
        )
        
        max_sharpe_portfolio = {
            "weights": cleaned_weights,
            "performance": PortfolioPerformance(
                expected_annual_return=max_sharpe_performance[0],
                annual_volatility=max_sharpe_performance[1],
                sharpe_ratio=max_sharpe_performance[2],
                sortino_ratio=0.0,
                max_drawdown=0.0
            )
        }
        
        # --- 4. Generate Efficient Frontier Points for Plotting ---
        ef_plot = EfficientFrontier(mu, S)
        
        # Min volatility point
        ef_plot.min_volatility()
        min_vol_perf = ef_plot.portfolio_performance(verbose=False)
        
        # Max sharpe point
        ef_plot.max_sharpe(risk_free_rate=req.risk_free_rate)
        max_sharpe_perf_plot = ef_plot.portfolio_performance(risk_free_rate=req.risk_free_rate, verbose=False)

        # Max return point (100% in highest return asset)
        max_ret_idx = np.argmax(mu)
        max_ret_symbol = mu.index[max_ret_idx]
        weights_max_ret = {s: 0.0 for s in req.symbols}
        weights_max_ret[max_ret_symbol] = 1.0
        ef_plot.set_weights(weights_max_ret)
        max_ret_perf = ef_plot.portfolio_performance(verbose=False)

        frontier_points = [
            EfficientFrontierPoint(risk=min_vol_perf[1], return_val=min_vol_perf[0]),
            EfficientFrontierPoint(risk=max_sharpe_perf_plot[1], return_val=max_sharpe_perf_plot[0], label="Max Sharpe"),
            EfficientFrontierPoint(risk=max_ret_perf[1], return_val=max_ret_perf[0]),
        ]
        
        total_time = time.perf_counter() - start_time
        logger.info(f"Portfolio optimization for {len(req.symbols)} assets completed in {total_time:.4f}s")
        
        return PortfolioOptimizationResponse(
            max_sharpe_portfolio=max_sharpe_portfolio,
            efficient_frontier_points=frontier_points,
            execution_time=total_time
        )

    except Exception as e:
        logger.error(f"Portfolio optimization failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))