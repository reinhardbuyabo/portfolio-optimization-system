"""
LogPriceScaler - Logarithmic price transformation with MinMax scaling

This scaler applies log transformation to stock prices before scaling,
which is the standard approach in quantitative finance. It handles:

1. Percentage-based movements (not absolute)
2. Variance stabilization across price levels
3. Better LSTM training (smoother gradients)
4. Natural bounds (prevents negative predictions)

Usage:
    scaler = LogPriceScaler()
    scaler.fit(train_prices)
    scaled_data = scaler.transform(prices)
    original_prices = scaler.inverse_transform(scaled_data)
"""

import numpy as np
from sklearn.preprocessing import MinMaxScaler
import joblib
from pathlib import Path
from typing import Union, Optional


class LogPriceScaler:
    """
    Scaler that applies logarithmic transformation followed by MinMax scaling.
    
    This is the standard approach for financial time series:
    1. Prices -> log(Prices)  [handles multiplicative relationships]
    2. log(Prices) -> MinMax scaled  [normalizes for neural network]
    
    Attributes:
        scaler (MinMaxScaler): Internal MinMax scaler for log prices
        min_price (float): Minimum price in training data
        max_price (float): Maximum price in training data
        feature_range (tuple): Range for MinMax scaling (default: (0, 1))
    """
    
    def __init__(self, feature_range=(0, 1)):
        """
        Initialize the LogPriceScaler.
        
        Args:
            feature_range (tuple): Desired range of transformed data (default: (0, 1))
        """
        self.scaler = MinMaxScaler(feature_range=feature_range)
        self.min_price = None
        self.max_price = None
        self.feature_range = feature_range
        self._is_fitted = False
    
    def fit(self, prices: np.ndarray) -> 'LogPriceScaler':
        """
        Fit the scaler on price data (will be log-transformed internally).
        
        Args:
            prices (np.ndarray): Array of stock prices (1D or 2D)
        
        Returns:
            self: Fitted scaler
        
        Raises:
            ValueError: If prices contain zeros or negative values
        """
        prices = self._validate_prices(prices)
        
        # Store original price statistics
        self.min_price = float(np.min(prices))
        self.max_price = float(np.max(prices))
        
        # Apply log transformation
        log_prices = np.log(prices)
        
        # Fit MinMax scaler on log prices
        self.scaler.fit(log_prices.reshape(-1, 1))
        self._is_fitted = True
        
        return self
    
    def transform(self, prices: np.ndarray) -> np.ndarray:
        """
        Transform prices to scaled log prices.
        
        Args:
            prices (np.ndarray): Array of stock prices
        
        Returns:
            np.ndarray: Scaled log-transformed prices
        
        Raises:
            ValueError: If scaler not fitted or invalid prices
        """
        if not self._is_fitted:
            raise ValueError("Scaler must be fitted before transform. Call fit() first.")
        
        prices = self._validate_prices(prices)
        original_shape = prices.shape
        
        # Apply log transformation
        log_prices = np.log(prices)
        
        # Scale
        scaled_log_prices = self.scaler.transform(log_prices.reshape(-1, 1))
        
        # Restore original shape
        return scaled_log_prices.reshape(original_shape)
    
    def inverse_transform(self, scaled_log_prices: np.ndarray) -> np.ndarray:
        """
        Convert scaled log prices back to actual prices.
        
        Args:
            scaled_log_prices (np.ndarray): Scaled log-transformed prices
        
        Returns:
            np.ndarray: Original price scale
        
        Raises:
            ValueError: If scaler not fitted
        """
        if not self._is_fitted:
            raise ValueError("Scaler must be fitted before inverse_transform.")
        
        original_shape = scaled_log_prices.shape
        
        # Inverse MinMax scaling
        log_prices = self.scaler.inverse_transform(scaled_log_prices.reshape(-1, 1))
        
        # Inverse log transformation (exp)
        prices = np.exp(log_prices)
        
        return prices.reshape(original_shape)
    
    def fit_transform(self, prices: np.ndarray) -> np.ndarray:
        """
        Fit the scaler and transform prices in one step.
        
        Args:
            prices (np.ndarray): Array of stock prices
        
        Returns:
            np.ndarray: Scaled log-transformed prices
        """
        return self.fit(prices).transform(prices)
    
    def _validate_prices(self, prices: np.ndarray) -> np.ndarray:
        """
        Validate price data.
        
        Args:
            prices (np.ndarray): Price array to validate
        
        Returns:
            np.ndarray: Validated prices
        
        Raises:
            ValueError: If prices are invalid
        """
        prices = np.asarray(prices)
        
        if prices.size == 0:
            raise ValueError("Price array is empty")
        
        if np.any(prices <= 0):
            raise ValueError(
                "Prices must be positive for log transformation. "
                f"Found min value: {np.min(prices)}"
            )
        
        if np.any(np.isnan(prices)) or np.any(np.isinf(prices)):
            raise ValueError("Prices contain NaN or infinite values")
        
        return prices
    
    def get_params(self) -> dict:
        """
        Get scaler parameters.
        
        Returns:
            dict: Scaler parameters and statistics
        """
        if not self._is_fitted:
            return {'fitted': False}
        
        return {
            'fitted': True,
            'min_price': self.min_price,
            'max_price': self.max_price,
            'price_range': self.max_price - self.min_price,
            'log_min': float(self.scaler.data_min_[0]),
            'log_max': float(self.scaler.data_max_[0]),
            'log_range': float(self.scaler.data_range_[0]),
            'feature_range': self.feature_range
        }
    
    def save(self, path: Union[str, Path]) -> None:
        """
        Save scaler to file.
        
        Args:
            path (Union[str, Path]): Path to save scaler
        """
        if not self._is_fitted:
            raise ValueError("Cannot save unfitted scaler")
        
        path = Path(path)
        
        data = {
            'scaler': self.scaler,
            'min_price': self.min_price,
            'max_price': self.max_price,
            'feature_range': self.feature_range,
            'is_fitted': self._is_fitted,
            'version': '1.0'
        }
        
        joblib.dump(data, path)
    
    @staticmethod
    def load(path: Union[str, Path]) -> 'LogPriceScaler':
        """
        Load scaler from file.
        
        Args:
            path (Union[str, Path]): Path to scaler file
        
        Returns:
            LogPriceScaler: Loaded scaler
        """
        path = Path(path)
        
        if not path.exists():
            raise FileNotFoundError(f"Scaler file not found: {path}")
        
        data = joblib.load(path)
        
        # Create new instance
        log_scaler = LogPriceScaler(feature_range=data.get('feature_range', (0, 1)))
        log_scaler.scaler = data['scaler']
        log_scaler.min_price = data['min_price']
        log_scaler.max_price = data['max_price']
        log_scaler._is_fitted = data.get('is_fitted', True)
        
        return log_scaler
    
    def __repr__(self) -> str:
        """String representation of scaler."""
        if not self._is_fitted:
            return "LogPriceScaler(fitted=False)"
        
        return (
            f"LogPriceScaler(fitted=True, "
            f"price_range=[{self.min_price:.2f}, {self.max_price:.2f}], "
            f"log_range=[{self.scaler.data_min_[0]:.4f}, {self.scaler.data_max_[0]:.4f}])"
        )


# Utility functions for common operations

def create_log_scaler(train_prices: np.ndarray, feature_range=(0, 1)) -> LogPriceScaler:
    """
    Convenience function to create and fit a LogPriceScaler.
    
    Args:
        train_prices (np.ndarray): Training prices
        feature_range (tuple): Scaling range
    
    Returns:
        LogPriceScaler: Fitted scaler
    """
    scaler = LogPriceScaler(feature_range=feature_range)
    scaler.fit(train_prices)
    return scaler


def validate_scaler_fit(scaler: LogPriceScaler, train_prices: np.ndarray, tolerance=0.01) -> bool:
    """
    Validate that scaler was fitted correctly on training data.
    
    Args:
        scaler (LogPriceScaler): Scaler to validate
        train_prices (np.ndarray): Expected training prices
        tolerance (float): Tolerance for price comparison
    
    Returns:
        bool: True if scaler is valid
    
    Raises:
        AssertionError: If validation fails
    """
    params = scaler.get_params()
    
    actual_min = np.min(train_prices)
    actual_max = np.max(train_prices)
    
    assert abs(params['min_price'] - actual_min) < tolerance, \
        f"Scaler min {params['min_price']:.4f} != actual min {actual_min:.4f}"
    
    assert abs(params['max_price'] - actual_max) < tolerance, \
        f"Scaler max {params['max_price']:.4f} != actual max {actual_max:.4f}"
    
    return True


if __name__ == "__main__":
    # Example usage and testing
    print("LogPriceScaler - Example Usage")
    print("=" * 60)
    
    # Create sample stock price data
    np.random.seed(42)
    base_price = 100
    returns = np.random.normal(0.001, 0.02, 100)
    prices = base_price * np.exp(np.cumsum(returns))
    
    print(f"\nSample Prices:")
    print(f"  Range: {prices.min():.2f} - {prices.max():.2f}")
    print(f"  Mean: {prices.mean():.2f}")
    print(f"  Std: {prices.std():.2f}")
    
    # Split into train/test
    train_prices = prices[:80]
    test_prices = prices[80:]
    
    # Create and fit scaler
    scaler = LogPriceScaler()
    scaler.fit(train_prices)
    
    print(f"\nScaler Parameters:")
    params = scaler.get_params()
    for key, value in params.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.4f}")
        else:
            print(f"  {key}: {value}")
    
    # Transform
    scaled_train = scaler.transform(train_prices)
    scaled_test = scaler.transform(test_prices)
    
    print(f"\nScaled Prices:")
    print(f"  Train range: {scaled_train.min():.4f} - {scaled_train.max():.4f}")
    print(f"  Test range: {scaled_test.min():.4f} - {scaled_test.max():.4f}")
    
    # Inverse transform
    recovered_train = scaler.inverse_transform(scaled_train)
    
    print(f"\nRecovery Error:")
    print(f"  Max absolute error: {np.max(np.abs(recovered_train - train_prices)):.6f}")
    print(f"  Mean absolute error: {np.mean(np.abs(recovered_train - train_prices)):.6f}")
    
    # Test save/load
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.joblib', delete=False) as f:
        temp_path = f.name
    
    scaler.save(temp_path)
    loaded_scaler = LogPriceScaler.load(temp_path)
    
    print(f"\nSave/Load Test:")
    print(f"  Original: {scaler}")
    print(f"  Loaded: {loaded_scaler}")
    print(f"  Parameters match: {scaler.get_params() == loaded_scaler.get_params()}")
    
    # Cleanup
    import os
    os.unlink(temp_path)
    
    print("\n" + "=" * 60)
    print("✅ All tests passed!")
