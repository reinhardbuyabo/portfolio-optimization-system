import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from processing.features import (
    calculate_returns, calculate_volatility, calculate_moving_average
)


class DataPreprocessor:
    """Encapsulates data preprocessing steps."""

    def __init__(self):
        self.scaler = MinMaxScaler(feature_range=(0, 1))

    def fit_transform(self, data: pd.DataFrame) -> pd.DataFrame:
        """Fit the scaler and transform the data."""
        data = self._apply_feature_engineering(data)
        data.fillna(0, inplace=True)
        data['Day Price Scaled'] = self.scaler.fit_transform(
            data['Day Price'].values.reshape(-1, 1)
        )
        return data

    def transform(self, data: pd.DataFrame) -> pd.DataFrame:
        """Transform the data using the fitted scaler."""
        data = self._apply_feature_engineering(data)
        data.fillna(0, inplace=True)
        data['Day Price Scaled'] = self.scaler.transform(
            data['Day Price'].values.reshape(-1, 1)
        )
        return data

    def _apply_feature_engineering(self, data: pd.DataFrame) -> pd.DataFrame:
        """Apply feature engineering steps."""
        data = calculate_returns(data)
        data = calculate_volatility(data)
        data = calculate_moving_average(data)
        return data
