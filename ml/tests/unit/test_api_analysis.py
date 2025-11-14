import pytest
from unittest.mock import MagicMock, patch
import numpy as np
import math

from fastapi.testclient import TestClient
from ml.api.main import app # Adjust this import to your app entrypoint

# THIS IS THE FIXED SEQUENCE LENGTH YOUR MODEL WAS TRAINED ON
MODEL_INPUT_SEQUENCE_LENGTH = 60

client = TestClient(app)

@pytest.fixture
def mock_preprocessor():
    """Mock the preprocessor and its internal scaler."""
    mock_scaler = MagicMock()
    # Mock scaler to transform 60 inputs
    mock_scaler.transform.return_value = np.array([[0.5]] * 60)
    # Mock scaler to inverse-transform one output
    mock_scaler.inverse_transform.return_value = np.array([[150.0]]) # Predicted price
    mock_scaler.data_min_ = np.array([100.0])
    mock_scaler.data_max_ = np.array([200.0])

    mock_proc = MagicMock()
    mock_proc.scaler = mock_scaler
    return mock_proc

@pytest.fixture
def mock_pipeline():
    """Mock the ML pipeline (model)."""
    mock_pipe = MagicMock()
    mock_pipe.predict.return_value = np.array([[0.75]]) # Model's scaled prediction
    return mock_pipe

@patch('ml.api.routes.analysis.get_garch_forecast') # Mock the GARCH function
def test_analyze_stock_success(mock_get_garch_forecast, mock_preprocessor, mock_pipeline):
    # Setup mocks
    mock_get_garch_forecast.return_value = 0.0001 # 1-day variance
    app.state.preprocessor = mock_preprocessor
    app.state.pipeline = mock_pipeline

    # --- Prepare Request ---
    # 1. 60 days of mock price data for LSTM
    mock_price_data = [{"Day Price": 120 + i * 0.1, "Date": f"2025-01-{i+1:02d}"} for i in range(59)]
    mock_price_data.append({"Day Price": 145.0, "Date": "2025-03-01"}) # Current price is 145.0
    
    # 2. 252+ days of mock log returns for GARCH
    mock_log_returns = [np.random.normal(0.001, 0.02) for _ in range(300)]
    
    # --- Send Request ---
    response = client.post(
        "/api/v1/stock/analyze",
        json={
            "symbol": "SCOM",
            "price_data": mock_price_data,
            "log_returns": mock_log_returns,
            "risk_free_rate": 0.05
        }
    )
    
    # --- Assert ---
    assert response.status_code == 200
    json_res = response.json()
    
    # 1. Check LSTM was called correctly
    mock_preprocessor.scaler.transform.assert_called_once()
    mock_pipeline.predict.assert_called_once()
    assert json_res["lstm_result"]["prediction"] == 150.0 # From mock_scaler.inverse_transform
    assert json_res["current_price"] == 145.0 # From mock_price_data[-1]

    # 2. Check GARCH was called correctly
    mock_get_garch_forecast.assert_called_once()
    assert json_res["garch_result"]["forecasted_variance_1d"] == 0.0001
    assert json_res["garch_result"]["annualized_volatility"] == pytest.approx(math.sqrt(0.0001) * math.sqrt(252))

    # 3. Check combined metrics
    # expected_return_1d = (150 - 145) / 145 = 0.03448...
    assert json_res["expected_return_1d"] == pytest.approx((150.0 - 145.0) / 145.0)
    # annualized_return = (1 + 0.03448)^252 - 1 = ...
    annualized_return = (1 + ((150.0 - 145.0) / 145.0)) ** 252 - 1
    assert json_res["annualized_return"] == pytest.approx(annualized_return)
    
    annualized_vol = math.sqrt(0.0001) * math.sqrt(252)
    # sharpe_ratio = (annualized_return - 0.05) / annualized_vol
    assert json_res["sharpe_ratio"] == pytest.approx((annualized_return - 0.05) / annualized_vol)

def test_analyze_stock_lstm_insufficient_data(mock_preprocessor, mock_pipeline):
    app.state.preprocessor = mock_preprocessor
    app.state.pipeline = mock_pipeline
    # Only 30 days of price data
    mock_price_data = [{"Day Price": 120} for i in range(30)]
    mock_log_returns = [0.01] * 100
    
    response = client.post(
        "/api/v1/stock/analyze",
        json={
            "symbol": "SCOM",
            "price_data": mock_price_data,
            "log_returns": mock_log_returns
        }
    )
    assert response.status_code == 400
    assert f"Require at least {MODEL_INPUT_SEQUENCE_LENGTH} price samples" in response.json()["detail"]

@patch('ml.api.routes.analysis.get_garch_forecast')
def test_analyze_stock_garch_insufficient_data(mock_get_garch_forecast, mock_preprocessor, mock_pipeline):
    app.state.preprocessor = mock_preprocessor
    app.state.pipeline = mock_pipeline
    mock_get_garch_forecast.side_effect = ValueError("Insufficient data for GARCH forecast. Need at least 20 data points.")

    mock_price_data = [{"Day Price": 120} for i in range(60)]
    # Only 10 days of log returns
    mock_log_returns = [0.01] * 10 
    
    response = client.post(
        "/api/v1/stock/analyze",
        json={
            "symbol": "SCOM",
            "price_data": mock_price_data,
            "log_returns": mock_log_returns
        }
    )
    assert response.status_code == 400
    assert "Insufficient data for GARCH forecast" in response.json()["detail"]
