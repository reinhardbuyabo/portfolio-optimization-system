"""
Walk-Forward Validation for LSTM Model
Implements proper time-series cross-validation and backtesting
"""
import numpy as np
import pandas as pd
from typing import Tuple, List, Dict
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, mean_absolute_percentage_error
from loguru import logger


class WalkForwardValidator:
    """
    Implements walk-forward validation for time series models.
    Splits data into multiple train/test windows and evaluates model performance.
    """
    
    def __init__(
        self,
        min_train_size: int = 500,
        test_size: int = 60,
        step_size: int = 30,
        n_splits: int = 5
    ):
        """
        Args:
            min_train_size: Minimum number of samples in training set
            test_size: Number of samples in each test set
            step_size: Number of samples to move forward between splits
            n_splits: Maximum number of splits to create
        """
        self.min_train_size = min_train_size
        self.test_size = test_size
        self.step_size = step_size
        self.n_splits = n_splits
    
    def split(self, data: np.ndarray) -> List[Tuple[np.ndarray, np.ndarray]]:
        """
        Generate train/test indices for walk-forward validation.
        
        Args:
            data: Input data array
            
        Returns:
            List of (train_indices, test_indices) tuples
        """
        n_samples = len(data)
        splits = []
        
        for i in range(self.n_splits):
            test_end = n_samples - i * self.step_size
            test_start = test_end - self.test_size
            train_end = test_start
            train_start = 0
            
            if train_end - train_start < self.min_train_size:
                break
                
            if test_start < self.min_train_size:
                break
            
            train_idx = np.arange(train_start, train_end)
            test_idx = np.arange(test_start, test_end)
            
            splits.append((train_idx, test_idx))
        
        # Reverse so we go forward in time
        splits.reverse()
        logger.info(f"Created {len(splits)} walk-forward splits")
        return splits
    
    def evaluate_predictions(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        prices: bool = True
    ) -> Dict[str, float]:
        """
        Calculate comprehensive metrics for predictions.
        
        Args:
            y_true: Actual values
            y_pred: Predicted values
            prices: Whether values represent prices (enables additional metrics)
            
        Returns:
            Dictionary of metric names and values
        """
        metrics = {}
        
        # Basic regression metrics
        metrics['mse'] = mean_squared_error(y_true, y_pred)
        metrics['rmse'] = np.sqrt(metrics['mse'])
        metrics['mae'] = mean_absolute_error(y_true, y_pred)
        metrics['r2'] = r2_score(y_true, y_pred)
        
        # MAPE (avoid division by zero)
        mask = y_true != 0
        if np.any(mask):
            metrics['mape'] = mean_absolute_percentage_error(y_true[mask], y_pred[mask])
        else:
            metrics['mape'] = np.nan
        
        # Directional accuracy (for price movements)
        if prices and len(y_true) > 1:
            true_direction = np.sign(np.diff(y_true))
            pred_direction = np.sign(np.diff(y_pred))
            metrics['directional_accuracy'] = np.mean(true_direction == pred_direction)
        
        # Residual statistics
        residuals = y_pred - y_true
        metrics['mean_residual'] = np.mean(residuals)
        metrics['std_residual'] = np.std(residuals)
        metrics['median_residual'] = np.median(residuals)
        
        # Check for impossible values (negative prices)
        if prices:
            metrics['negative_predictions'] = np.sum(y_pred < 0)
            metrics['negative_ratio'] = metrics['negative_predictions'] / len(y_pred)
        
        return metrics
    
    def financial_metrics(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        transaction_cost: float = 0.001
    ) -> Dict[str, float]:
        """
        Calculate financial/trading metrics.
        
        Args:
            y_true: Actual prices
            y_pred: Predicted prices
            transaction_cost: Transaction cost as fraction (e.g., 0.001 = 0.1%)
            
        Returns:
            Dictionary of financial metrics
        """
        metrics = {}
        
        # Simple trading strategy: buy if prediction > current, sell otherwise
        returns = []
        current_position = 0  # -1 = short, 0 = neutral, 1 = long
        
        for i in range(len(y_pred) - 1):
            signal = 1 if y_pred[i] > y_true[i] else -1
            actual_return = (y_true[i+1] - y_true[i]) / y_true[i]
            
            # Apply signal
            strategy_return = signal * actual_return
            
            # Apply transaction cost if position changes
            if signal != current_position:
                strategy_return -= transaction_cost
                current_position = signal
            
            returns.append(strategy_return)
        
        returns = np.array(returns)
        
        # Calculate metrics
        metrics['total_return'] = np.sum(returns)
        metrics['mean_return'] = np.mean(returns)
        metrics['std_return'] = np.std(returns)
        
        if metrics['std_return'] > 0:
            metrics['sharpe_ratio'] = metrics['mean_return'] / metrics['std_return'] * np.sqrt(252)
        else:
            metrics['sharpe_ratio'] = 0.0
        
        # Win rate
        metrics['win_rate'] = np.sum(returns > 0) / len(returns) if len(returns) > 0 else 0.0
        
        # Maximum drawdown
        cumulative = np.cumsum(returns)
        running_max = np.maximum.accumulate(cumulative)
        drawdown = running_max - cumulative
        metrics['max_drawdown'] = np.max(drawdown) if len(drawdown) > 0 else 0.0
        
        return metrics


def validate_stock_predictions(
    stock_data: pd.DataFrame,
    model,
    scaler,
    prediction_days: int = 60,
    min_samples: int = 100
) -> Dict[str, any]:
    """
    Validate predictions for a single stock using walk-forward validation.
    
    Args:
        stock_data: DataFrame with 'Day Price' column for a single stock
        model: Trained LSTM model
        scaler: Fitted scaler (optional, will create stock-specific if None)
        prediction_days: Sequence length for LSTM
        min_samples: Minimum samples required
        
    Returns:
        Dictionary containing validation results and metrics
    """
    prices = stock_data['Day Price'].values
    
    if len(prices) < min_samples:
        logger.warning(f"Insufficient data: {len(prices)} < {min_samples}")
        return None
    
    # Use stock-specific scaling
    from sklearn.preprocessing import MinMaxScaler
    stock_scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_prices = stock_scaler.fit_transform(prices.reshape(-1, 1))
    
    # Create sequences
    X, y = [], []
    for i in range(prediction_days, len(scaled_prices)):
        X.append(scaled_prices[i - prediction_days:i, 0])
        y.append(scaled_prices[i, 0])
    
    X = np.array(X).reshape(-1, prediction_days, 1)
    y = np.array(y)
    
    # Walk-forward validation
    validator = WalkForwardValidator(
        min_train_size=200,
        test_size=30,
        step_size=30,
        n_splits=3
    )
    
    all_metrics = []
    all_predictions = []
    
    for train_idx, test_idx in validator.split(X):
        X_test = X[test_idx]
        y_test = y[test_idx]
        
        # Predict
        y_pred = model.predict(X_test, verbose=0).flatten()
        
        # Inverse transform
        y_test_actual = stock_scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
        y_pred_actual = stock_scaler.inverse_transform(y_pred.reshape(-1, 1)).flatten()
        
        # Calculate metrics
        metrics = validator.evaluate_predictions(y_test_actual, y_pred_actual, prices=True)
        financial = validator.financial_metrics(y_test_actual, y_pred_actual)
        metrics.update(financial)
        
        all_metrics.append(metrics)
        all_predictions.extend(list(zip(y_test_actual, y_pred_actual)))
    
    # Aggregate metrics
    avg_metrics = {}
    for key in all_metrics[0].keys():
        values = [m[key] for m in all_metrics if not np.isnan(m[key])]
        if values:
            avg_metrics[f'{key}_mean'] = np.mean(values)
            avg_metrics[f'{key}_std'] = np.std(values)
    
    return {
        'metrics': avg_metrics,
        'predictions': all_predictions,
        'n_splits': len(all_metrics)
    }
