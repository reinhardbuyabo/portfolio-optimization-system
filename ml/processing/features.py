import pandas as pd


def calculate_returns(data: pd.DataFrame) -> pd.DataFrame:
    """Calculate daily returns."""
    data['returns'] = data['Day Price'].pct_change()
    return data


def calculate_volatility(data: pd.DataFrame, window: int = 21) -> pd.DataFrame:
    """Calculate rolling volatility."""
    data['volatility'] = data['returns'].rolling(window=window).std()
    return data


def calculate_moving_average(
    data: pd.DataFrame, window: int = 21
) -> pd.DataFrame:
    """Calculate rolling moving average."""
    data['moving_average'] = data['Day Price'].rolling(window=window).mean()
    return data
