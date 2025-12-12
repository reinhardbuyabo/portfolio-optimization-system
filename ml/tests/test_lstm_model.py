import pytest
from pipeline.lstm_model import create_lstm_model
from tensorflow.keras.models import Sequential

def test_create_lstm_model():
    """Test that the LSTM model is created correctly."""
    input_shape = (60, 1) # Example input shape
    model = create_lstm_model(input_shape)

    assert isinstance(model, Sequential)
    assert model.input_shape == (None, input_shape[0], input_shape[1])
    assert model.output_shape == (None, 1)
