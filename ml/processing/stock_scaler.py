"""
Stock-Specific Scaler
Maintains separate scalers for each stock to handle different price ranges
"""
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler, RobustScaler
import joblib
from pathlib import Path
from typing import Dict, Optional, Literal
from loguru import logger


class StockSpecificScaler:
    """
    Maintains separate scaler for each stock.
    
    Why: Stocks have vastly different price ranges:
        - SCOM: 13-19 KES
        - JUB: 150-600 KES  
        - KUKZ: 67-423 KES
        
    Training a single scaler on all stocks (0.17-999.81 KES) causes
    predictions to be way off for individual stocks.
    
    Solution: Fit one scaler per stock using only that stock's price range.
    """
    
    def __init__(
        self,
        scaler_type: Literal['minmax', 'robust'] = 'minmax',
        feature_range: tuple = (0, 1)
    ):
        """
        Args:
            scaler_type: 'minmax' or 'robust' ('robust' better for outliers)
            feature_range: Output range for MinMaxScaler (default 0-1)
        """
        self.scaler_type = scaler_type
        self.feature_range = feature_range
        self.scalers: Dict[str, any] = {}
        self.stock_stats: Dict[str, dict] = {}
        
    def fit(self, stock_code: str, prices: np.ndarray) -> 'StockSpecificScaler':
        """
        Fit scaler to specific stock's price range.
        
        Args:
            stock_code: Stock ticker/code (e.g., 'SCOM')
            prices: Array of historical prices
            
        Returns:
            self (for chaining)
        """
        prices = prices.reshape(-1, 1)
        
        # Create appropriate scaler
        if self.scaler_type == 'minmax':
            scaler = MinMaxScaler(feature_range=self.feature_range)
        elif self.scaler_type == 'robust':
            scaler = RobustScaler()
        else:
            raise ValueError(f"Unknown scaler_type: {self.scaler_type}")
        
        # Fit to this stock's data
        scaler.fit(prices)
        self.scalers[stock_code] = scaler
        
        # Store statistics
        self.stock_stats[stock_code] = {
            'min': float(np.min(prices)),
            'max': float(np.max(prices)),
            'mean': float(np.mean(prices)),
            'median': float(np.median(prices)),
            'std': float(np.std(prices)),
            'n_samples': len(prices)
        }
        
        logger.info(
            f"Fitted scaler for {stock_code}: "
            f"[{self.stock_stats[stock_code]['min']:.2f}, "
            f"{self.stock_stats[stock_code]['max']:.2f}] KES"
        )
        
        return self
    
    def transform(self, stock_code: str, prices: np.ndarray) -> np.ndarray:
        """
        Transform prices using stock-specific scaler.
        
        Args:
            stock_code: Stock ticker/code
            prices: Array of prices to transform
            
        Returns:
            Scaled prices
        """
        if stock_code not in self.scalers:
            raise ValueError(
                f"No scaler fitted for {stock_code}. "
                f"Call fit() first or use fit_transform()."
            )
        
        prices = prices.reshape(-1, 1)
        return self.scalers[stock_code].transform(prices)
    
    def inverse_transform(self, stock_code: str, scaled_prices: np.ndarray) -> np.ndarray:
        """
        Convert scaled prices back to original price range.
        
        Args:
            stock_code: Stock ticker/code
            scaled_prices: Scaled prices (0-1 range for MinMaxScaler)
            
        Returns:
            Original scale prices
        """
        if stock_code not in self.scalers:
            raise ValueError(f"No scaler fitted for {stock_code}")
        
        scaled_prices = scaled_prices.reshape(-1, 1)
        return self.scalers[stock_code].inverse_transform(scaled_prices)
    
    def fit_transform(self, stock_code: str, prices: np.ndarray) -> np.ndarray:
        """
        Fit scaler and transform in one step.
        
        Args:
            stock_code: Stock ticker/code
            prices: Array of prices
            
        Returns:
            Scaled prices
        """
        self.fit(stock_code, prices)
        return self.transform(stock_code, prices)
    
    def get_scaler(self, stock_code: str) -> Optional[any]:
        """Get the scaler object for a specific stock"""
        return self.scalers.get(stock_code)
    
    def get_stats(self, stock_code: str) -> Optional[dict]:
        """Get statistics for a specific stock"""
        return self.stock_stats.get(stock_code)
    
    def has_stock(self, stock_code: str) -> bool:
        """Check if scaler exists for stock"""
        return stock_code in self.scalers
    
    def list_stocks(self) -> list:
        """Get list of stocks with fitted scalers"""
        return list(self.scalers.keys())
    
    def save(self, filepath: Path) -> None:
        """
        Save all scalers and stats to disk.
        
        Args:
            filepath: Path to save file (will create .joblib file)
        """
        data = {
            'scaler_type': self.scaler_type,
            'feature_range': self.feature_range,
            'scalers': self.scalers,
            'stock_stats': self.stock_stats
        }
        joblib.dump(data, filepath)
        logger.info(f"Saved {len(self.scalers)} stock scalers to {filepath}")
    
    @classmethod
    def load(cls, filepath: Path) -> 'StockSpecificScaler':
        """
        Load scalers from disk.
        
        Args:
            filepath: Path to saved scaler file
            
        Returns:
            StockSpecificScaler instance
        """
        data = joblib.load(filepath)
        
        instance = cls(
            scaler_type=data['scaler_type'],
            feature_range=data['feature_range']
        )
        instance.scalers = data['scalers']
        instance.stock_stats = data['stock_stats']
        
        logger.info(f"Loaded {len(instance.scalers)} stock scalers from {filepath}")
        return instance
    
    def print_summary(self) -> None:
        """Print summary of all fitted scalers"""
        print("\n" + "="*80)
        print("STOCK-SPECIFIC SCALER SUMMARY")
        print("="*80)
        print(f"\nScaler Type: {self.scaler_type}")
        print(f"Total Stocks: {len(self.scalers)}")
        
        if self.stock_stats:
            print(f"\n{'Stock':<10} {'Min':>10} {'Max':>10} {'Mean':>10} {'Range':>10} {'Samples':>10}")
            print("-"*80)
            
            for stock in sorted(self.stock_stats.keys()):
                stats = self.stock_stats[stock]
                price_range = stats['max'] - stats['min']
                print(
                    f"{stock:<10} "
                    f"{stats['min']:>10.2f} "
                    f"{stats['max']:>10.2f} "
                    f"{stats['mean']:>10.2f} "
                    f"{price_range:>10.2f} "
                    f"{stats['n_samples']:>10,}"
                )


def create_stock_scaler(
    data: pd.DataFrame,
    stock_col: str = 'Code',
    price_col: str = 'Day Price',
    scaler_type: Literal['minmax', 'robust'] = 'minmax'
) -> StockSpecificScaler:
    """
    Create and fit stock-specific scalers for all stocks in data.
    
    Args:
        data: DataFrame with stock data
        stock_col: Column name for stock codes
        price_col: Column name for prices
        scaler_type: Type of scaler to use
        
    Returns:
        Fitted StockSpecificScaler
    """
    scaler = StockSpecificScaler(scaler_type=scaler_type)
    
    for stock_code in data[stock_col].unique():
        stock_prices = data[data[stock_col] == stock_code][price_col].dropna().values
        
        if len(stock_prices) > 0:
            scaler.fit(stock_code, stock_prices)
    
    return scaler


if __name__ == "__main__":
    # Test stock-specific scaler
    print("Testing StockSpecificScaler...\n")
    
    # Create sample data for two stocks with different price ranges
    np.random.seed(42)
    
    # SCOM: 13-19 KES
    scom_prices = np.random.uniform(13, 19, 100)
    
    # JUB: 150-600 KES
    jub_prices = np.random.uniform(150, 600, 100)
    
    # Create scaler
    scaler = StockSpecificScaler(scaler_type='minmax', feature_range=(0, 1))
    
    # Fit scalers
    scaler.fit('SCOM', scom_prices)
    scaler.fit('JUB', jub_prices)
    
    # Test transformations
    print("\nTest 1: SCOM transformation")
    scom_test = np.array([15.0, 16.5, 14.0])
    scom_scaled = scaler.transform('SCOM', scom_test)
    scom_back = scaler.inverse_transform('SCOM', scom_scaled)
    
    print(f"Original: {scom_test}")
    print(f"Scaled: {scom_scaled.flatten()}")
    print(f"Back: {scom_back.flatten()}")
    
    print("\nTest 2: JUB transformation")
    jub_test = np.array([200.0, 400.0, 500.0])
    jub_scaled = scaler.transform('JUB', jub_test)
    jub_back = scaler.inverse_transform('JUB', jub_scaled)
    
    print(f"Original: {jub_test}")
    print(f"Scaled: {jub_scaled.flatten()}")
    print(f"Back: {jub_back.flatten()}")
    
    # Print summary
    scaler.print_summary()
    
    # Test save/load
    print("\nTest 3: Save and load")
    from pathlib import Path
    import tempfile
    
    with tempfile.NamedTemporaryFile(suffix='.joblib', delete=False) as f:
        temp_path = Path(f.name)
    
    scaler.save(temp_path)
    loaded_scaler = StockSpecificScaler.load(temp_path)
    
    print(f"Loaded scaler has {len(loaded_scaler.list_stocks())} stocks")
    print(f"Stocks: {loaded_scaler.list_stocks()}")
    
    # Cleanup
    temp_path.unlink()
    
    print("\n✓ All tests passed!")
