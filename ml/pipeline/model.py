from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from arch import arch_model
import pandas as pd


def create_lstm_model(input_shape: tuple) -> Sequential:
    """Create the LSTM model."""
    model = Sequential([
        LSTM(units=50, return_sequences=True, input_shape=input_shape),
        Dropout(0.2),
        LSTM(units=50, return_sequences=False),
        Dropout(0.2),
        Dense(units=25),
        Dense(units=1)
    ])
    model.compile(optimizer='adam', loss='mean_squared_error')
    return model


def create_garch_model(data: pd.Series):
    """Create the GARCH model."""
    model = arch_model(data, vol='GARCH', p=1, q=1)
    return model
