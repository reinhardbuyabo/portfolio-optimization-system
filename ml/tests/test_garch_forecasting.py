import pytest
import pandas as pd
import numpy as np
from pipeline.garch_model import forecast_garch_volatility

def test_forecast_garch_volatility_basic():
    """Test basic functionality of GARCH volatility forecasting."""
    # Create a synthetic log returns series
    np.random.seed(42)
    dates = pd.date_range(start='2020-01-01', periods=200, freq='D')
    log_returns = pd.Series(np.random.normal(0, 0.01, 200), index=dates)

    eval_df = forecast_garch_volatility(log_returns, verbose=False)

    assert not eval_df.empty
    assert 'forecasted_variance' in eval_df.columns
    assert 'realized_variance' in eval_df.columns
    assert len(eval_df) > 0
    assert np.all(eval_df['forecasted_variance'] >= 0)
    assert np.all(eval_df['realized_variance'] >= 0)

def test_forecast_garch_volatility_empty_series():
    """Test handling of empty input series."""
    empty_series = pd.Series(dtype=float)
    with pytest.raises(ValueError, match="No log-return data found for the series."):
        forecast_garch_volatility(empty_series, verbose=False)

def test_forecast_garch_volatility_short_series():
    """Test handling of a series too short for training."""
    np.random.seed(42)
    dates = pd.date_range(start='2020-01-01', periods=15, freq='D') # Less than 20 for train_frac=0.8
    log_returns = pd.Series(np.random.normal(0, 0.01, 15), index=dates)

    eval_df = forecast_garch_volatility(log_returns, train_frac=0.5, verbose=False)
    # Expect an empty df or very few valid forecasts due to short history
    assert len(eval_df) <= 5
