import pytest
from pipeline.garch_model import create_garch_model
import pandas as pd
from arch import arch_model

def test_create_garch_model():
    """Test that the GARCH model is created correctly."""
    # Create some dummy data for testing
    np.random.seed(42)
    data = pd.Series(np.random.randn(100))

    model = create_garch_model(data)

    assert isinstance(model, arch_model)
    assert model.volatility == 'GARCH'
    assert model.distribution == 't'
