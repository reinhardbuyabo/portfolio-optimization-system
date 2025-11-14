import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np

from fastapi.testclient import TestClient
from ml.api.main import app # Adjust import as needed

client = TestClient(app)

@pytest.fixture
def mock_pypfopt():
    """Mock the pypfopt library"""
    with patch('ml.api.routes.portfolio.EfficientFrontier') as mock_ef_class:
        mock_ef_instance = MagicMock()
        
        # Mock methods used for max_sharpe
        mock_ef_instance.max_sharpe.return_value = {"SCOM": 0.5, "EQTY": 0.5}
        mock_ef_instance.clean_weights.return_value = {"SCOM": 0.5, "EQTY": 0.5}
        
        # Mock portfolio_performance to return different values based on context
        # Default for max_sharpe
        max_sharpe_perf = (0.15, 0.20, 0.7) # return, vol, sharpe
        min_vol_perf = (0.10, 0.15, 0.33)
        max_ret_perf = (0.20, 0.30, 0.5)

        # This complex mock allows portfolio_performance to return different values
        def performance_side_effect(*args, **kwargs):
            # This is a bit of a hack. We infer which portfolio is being calculated
            # based on the weights that would have been set just before.
            # A more robust mock would inspect the internal state of the mock_ef_instance.
            # For this test, we'll assume a sequence of calls.
            if mock_ef_instance.min_volatility.called:
                return min_vol_perf
            if mock_ef_instance.set_weights.called: # Called for max_ret
                return max_ret_perf
            # Default to max_sharpe
            return max_sharpe_perf

        mock_ef_instance.portfolio_performance.side_effect = [max_sharpe_perf, min_vol_perf, max_sharpe_perf, max_ret_perf]

        # Mock methods used for frontier plotting
        mock_ef_instance.min_volatility.return_value = {"SCOM": 0.1, "EQTY": 0.9}
        mock_ef_instance.set_weights.return_value = None # Mock the setter

        mock_ef_class.return_value = mock_ef_instance
        
        # Patch other pypfopt functions
        with patch('ml.api.routes.portfolio.expected_returns') as mock_exp_ret, \
             patch('ml.api.routes.portfolio.risk_models') as mock_risk_models:
            
            mock_exp_ret.mean_historical_return.return_value = pd.Series([0.1, 0.2], index=["SCOM", "EQTY"])
            mock_risk_models.sample_cov.return_value = pd.DataFrame(np.array([[0.04, 0.01], [0.01, 0.09]]), index=["SCOM", "EQTY"], columns=["SCOM", "EQTY"])
            
            yield mock_ef_class, mock_exp_ret, mock_risk_models

def test_optimize_portfolio_success(mock_pypfopt):
    mock_log_returns = [np.random.normal(0.001, 0.02) for _ in range(300)]
    req_data = {
        "symbols": ["SCOM", "EQTY"],
        "log_returns_map": {
            "SCOM": mock_log_returns,
            "EQTY": mock_log_returns
        },
        "risk_free_rate": 0.05
    }
    
    response = client.post("/api/v1/portfolio/optimize", json=req_data)
    
    assert response.status_code == 200
    json_res = response.json()

    # Check performance from the main max_sharpe calculation
    perf = json_res["max_sharpe_portfolio"]["performance"]
    assert perf["expected_annual_return"] == 0.15
    assert perf["annual_volatility"] == 0.20
    assert perf["sharpe_ratio"] == 0.7
    
    # Check weights
    weights = json_res["max_sharpe_portfolio"]["weights"]
    assert weights["SCOM"] == 0.5
    assert weights["EQTY"] == 0.5
    
    # Check frontier points (simplified)
    assert len(json_res["efficient_frontier_points"]) == 3
    labels = [p.get("label") for p in json_res["efficient_frontier_points"]]
    assert "Max Sharpe" in labels

def test_optimize_portfolio_insufficient_assets():
    req_data = {
        "symbols": ["SCOM"], # Only 1 asset
        "log_returns_map": {"SCOM": [0.01, 0.02]},
        "risk_free_rate": 0.05
    }
    response = client.post("/api/v1/portfolio/optimize", json=req_data)
    assert response.status_code == 400
    assert "requires at least 2 assets" in response.json()["detail"]

def test_optimize_portfolio_insufficient_data():
    req_data = {
        "symbols": ["SCOM", "EQTY"],
        "log_returns_map": {
            "SCOM": [0.01, 0.02], # Only 2 data points
            "EQTY": [0.01, 0.02]
        },
        "risk_free_rate": 0.05
    }
    response = client.post("/api/v1/portfolio/optimize", json=req_data)
    assert response.status_code == 400
    assert "Insufficient common data points" in response.json()["detail"]
