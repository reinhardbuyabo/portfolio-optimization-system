import pytest
from pipeline.garch_model import create_garch_model
import pandas as pd
import numpy as np
from arch import arch_model

def test_create_garch_model():
    """Test that the GARCH model is created correctly."""
    # Create some dummy data for testing
    np.random.seed(42)
    data = pd.Series(np.random.randn(100))

    model = create_garch_model(data)

    # Check that the model is an ARCH model object by checking attributes
    assert hasattr(model, 'fit')
    assert hasattr(model, 'forecast')
    assert model.volatility.name == 'GARCH'
    assert model.distribution.name == "Standardized Student's t"
