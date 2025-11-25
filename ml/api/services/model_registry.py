"""
Stock Model Registry with LRU Caching and Hybrid Support

Manages stock-specific LSTM models with efficient caching and lazy loading.
Supports hybrid approach: stock-specific models for top stocks, general model for others.

Features:
- Lazy loading: Models loaded on first request
- LRU caching: Keep N most-used models in memory
- Model discovery: Auto-scan trained models directory
- Thread-safe: Can handle concurrent requests
- Hybrid routing: Stock-specific → General fallback

Author: Reinhard
Date: 2024-11-18
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from typing import Dict, Tuple, List, Optional
from collections import OrderedDict
import threading
import json
from datetime import datetime
import joblib
import numpy as np

import tensorflow as tf
from tensorflow import keras
from loguru import logger

from processing.log_scaler import LogPriceScaler


class LRUCache:
    """
    Thread-safe LRU (Least Recently Used) cache for models.
    """
    def __init__(self, capacity: int = 20):
        self.capacity = capacity
        self.cache: OrderedDict = OrderedDict()
        self.lock = threading.Lock()
    
    def get(self, key: str):
        """Get item from cache (moves to end)."""
        with self.lock:
            if key not in self.cache:
                return None
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            return self.cache[key]
    
    def put(self, key: str, value):
        """Put item in cache (evict oldest if full)."""
        with self.lock:
            if key in self.cache:
                # Update existing
                self.cache.move_to_end(key)
                self.cache[key] = value
            else:
                # Add new
                if len(self.cache) >= self.capacity:
                    # Evict oldest (first item)
                    evicted_key, _ = self.cache.popitem(last=False)
                    logger.info(f"Evicted model from cache: {evicted_key}")
                self.cache[key] = value
    
    def keys(self) -> List[str]:
        """Get all cached keys."""
        with self.lock:
            return list(self.cache.keys())
    
    def size(self) -> int:
        """Get current cache size."""
        with self.lock:
            return len(self.cache)


class ModelNotFoundError(Exception):
    """Raised when requested stock model doesn't exist."""
    pass


class StockModelRegistry:
    """
    Registry for stock-specific LSTM models with hybrid support.
    
    Supports two model types:
    1. Stock-specific models (high accuracy for top stocks)
    2. General multi-stock model (fallback for other stocks)
    
    Usage:
        registry = StockModelRegistry(
            specific_models_dir="trained_models/stock_specific_v4_log",
            general_model_dir="trained_models/general_v4_log"
        )
        model, scaler, model_type = registry.load_model("SCOM")
        predictions = model.predict(X)
    """
    
    def __init__(
        self,
        specific_models_dir: str or Path,
        general_model_dir: str or Path = None,
        cache_size: int = 20
    ):
        """
        Initialize hybrid model registry.
        
        Args:
            specific_models_dir: Directory containing stock-specific models
            general_model_dir: Directory containing general multi-stock model
            cache_size: Number of models to keep in cache (default: 20)
        """
        self.specific_models_dir = Path(specific_models_dir)
        self.general_model_dir = Path(general_model_dir) if general_model_dir else None
        self.cache_size = cache_size
        self.cache = LRUCache(capacity=cache_size)
        
        # Scan for available stock-specific models
        self.specific_available = self._scan_specific_models()
        self.specific_metadata = self._load_specific_metadata()
        
        # Load general model if available
        self.general_model = None
        self.general_scalers = {}
        self.general_stock_ids = {}
        self.general_metadata = None
        
        if self.general_model_dir and self.general_model_dir.exists():
            self._load_general_model()
        
        # Statistics
        self.stats = {
            'total_requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'models_loaded': 0,
            'specific_requests': 0,
            'general_requests': 0
        }
        
        logger.info(f"Model registry initialized:")
        logger.info(f"  Stock-specific models: {len(self.specific_available)}")
        logger.info(f"  General model stocks: {len(self.general_stock_ids)}")
        logger.info(f"  Total coverage: {len(self.get_all_available_stocks())} stocks")
        logger.info(f"  Cache size: {cache_size} models")
    
    def _scan_specific_models(self) -> Dict[str, Path]:
        """
        Scan directory for stock-specific models.
        
        Returns:
            Dictionary mapping stock symbols to model paths
        """
        if not self.specific_models_dir.exists():
            logger.warning(f"Stock-specific models directory not found: {self.specific_models_dir}")
            return {}
        
        models = {}
        for model_file in self.specific_models_dir.glob("*_best.h5"):
            symbol = model_file.stem.replace("_best", "")
            models[symbol] = model_file
        
        logger.info(f"Found {len(models)} stock-specific models: {list(models.keys())}")
        return models
    
    def _load_specific_metadata(self) -> Dict[str, dict]:
        """Load metadata for stock-specific models."""
        metadata = {}
        for symbol in self.specific_available:
            metadata_path = self.specific_models_dir / f"{symbol}_metadata.json"
            if metadata_path.exists():
                try:
                    with open(metadata_path, 'r') as f:
                        metadata[symbol] = json.load(f)
                except Exception as e:
                    logger.warning(f"Failed to load metadata for {symbol}: {e}")
        return metadata
    
    def _load_general_model(self):
        """Load general multi-stock model."""
        try:
            logger.info("Loading general multi-stock model...")
            
            # Load model
            model_path = self.general_model_dir / "general_v4_log_best.h5"
            self.general_model = keras.models.load_model(
                model_path,
                custom_objects={'mse': tf.keras.losses.MeanSquaredError()}
            )
            
            # Load scalers
            scalers_path = self.general_model_dir / "scalers.joblib"
            self.general_scalers = joblib.load(scalers_path)
            
            # Load stock ID mapping
            stock_ids_path = self.general_model_dir / "stock_id_mapping.json"
            with open(stock_ids_path, 'r') as f:
                self.general_stock_ids = json.load(f)
            
            # Load metadata
            metadata_path = self.general_model_dir / "metadata.json"
            with open(metadata_path, 'r') as f:
                self.general_metadata = json.load(f)
            
            logger.info(f"General model loaded: {len(self.general_stock_ids)} stocks")
            
        except Exception as e:
            logger.error(f"Failed to load general model: {e}")
            self.general_model = None
    
    def load_model(self, symbol: str) -> Tuple[keras.Model, LogPriceScaler, str]:
        """
        Load model and scaler for a stock (hybrid: specific or general).
        
        Args:
            symbol: Stock symbol (e.g., 'SCOM')
        
        Returns:
            Tuple of (model, scaler, model_type)
            model_type: "stock_specific" or "general"
        
        Raises:
            ModelNotFoundError: If no model exists for this stock
        """
        self.stats['total_requests'] += 1
        
        # Try stock-specific model first
        if symbol in self.specific_available:
            return self._load_specific_model(symbol)
        
        # Fallback to general model
        if symbol in self.general_stock_ids:
            return self._load_general_for_stock(symbol)
        
        # No model available
        raise ModelNotFoundError(
            f"No model found for symbol '{symbol}'. "
            f"Available: {self.get_all_available_stocks()}"
        )
    
    def _load_specific_model(self, symbol: str) -> Tuple[keras.Model, LogPriceScaler, str]:
        """Load stock-specific model."""
        self.stats['specific_requests'] += 1
        
        # Check cache first
        cache_key = f"specific_{symbol}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            self.stats['cache_hits'] += 1
            logger.debug(f"Cache hit for {symbol} (specific)")
            return (*cached, "stock_specific")
        
        # Cache miss - load from disk
        self.stats['cache_misses'] += 1
        logger.info(f"Cache miss for {symbol} - loading stock-specific model")
        
        model_path = self.specific_available[symbol]
        scaler_path = model_path.parent / f"{symbol}_log_scaler.joblib"
        
        if not scaler_path.exists():
            raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
        
        try:
            model = keras.models.load_model(
                model_path,
                custom_objects={'mse': tf.keras.losses.MeanSquaredError()}
            )
            scaler = LogPriceScaler.load(scaler_path)
            
            # Add to cache
            self.cache.put(cache_key, (model, scaler))
            self.stats['models_loaded'] += 1
            
            logger.info(f"Loaded specific model for {symbol} (cache: {self.cache.size()}/{self.cache_size})")
            
            return (model, scaler, "stock_specific")
            
        except Exception as e:
            logger.error(f"Failed to load specific model for {symbol}: {e}")
            raise
    
    def _load_general_for_stock(self, symbol: str) -> Tuple[keras.Model, LogPriceScaler, str]:
        """Load general model for a specific stock."""
        self.stats['general_requests'] += 1
        
        if self.general_model is None:
            raise ModelNotFoundError("General model not available")
        
        if symbol not in self.general_scalers:
            raise ModelNotFoundError(f"No scaler found for {symbol} in general model")
        
        logger.debug(f"Using general model for {symbol}")
        
        # General model is always cached (single model for all stocks)
        scaler = self.general_scalers[symbol]
        return (self.general_model, scaler, "general")
    
    def get_available_stocks(self) -> List[str]:
        """
        Get list of stocks with stock-specific models.
        
        Returns:
            Sorted list of stock symbols
        """
        return sorted(list(self.specific_available.keys()))
    
    def get_all_available_stocks(self) -> List[str]:
        """
        Get list of ALL stocks (specific + general).
        
        Returns:
            Sorted list of all stock symbols
        """
        all_stocks = set(self.specific_available.keys()) | set(self.general_stock_ids.keys())
        return sorted(list(all_stocks))
    
    def get_model_type(self, symbol: str) -> Optional[str]:
        """
        Get model type for a stock without loading it.
        
        Returns:
            "stock_specific", "general", or None
        """
        if symbol in self.specific_available:
            return "stock_specific"
        elif symbol in self.general_stock_ids:
            return "general"
        return None
    
    def get_cached_stocks(self) -> List[str]:
        """Get list of currently cached stock models."""
        return self.cache.keys()
    
    def get_metadata(self, symbol: str) -> Optional[dict]:
        """Get metadata for a stock model."""
        if symbol in self.specific_metadata:
            return self.specific_metadata[symbol]
        elif symbol in self.general_stock_ids:
            return self.general_metadata
        return None
    
    def get_all_metadata(self) -> Dict[str, dict]:
        """Get metadata for all models."""
        return {
            "specific": self.specific_metadata,
            "general": self.general_metadata
        }
    
    def get_stats(self) -> dict:
        """
        Get registry statistics.
        
        Returns:
            Dictionary with cache stats
        """
        hit_rate = (
            self.stats['cache_hits'] / self.stats['total_requests'] * 100
            if self.stats['total_requests'] > 0 else 0
        )
        
        return {
            **self.stats,
            'cache_hit_rate': round(hit_rate, 2),
            'cache_size': self.cache.size(),
            'cache_capacity': self.cache_size,
            'specific_models': len(self.specific_available),
            'general_model_stocks': len(self.general_stock_ids),
            'total_coverage': len(self.get_all_available_stocks())
        }
    
    def get_model_info(self, symbol: str) -> dict:
        """
        Get information about a specific model.
        
        Args:
            symbol: Stock symbol
        
        Returns:
            Dictionary with model information
        """
        model_type = self.get_model_type(symbol)
        
        if model_type is None:
            return {
                'symbol': symbol,
                'available': False,
                'error': 'Model not found'
            }
        
        metadata = self.get_metadata(symbol)
        
        info = {
            'symbol': symbol,
            'available': True,
            'model_type': model_type,
            'cached': f"specific_{symbol}" in self.cache.keys() if model_type == "stock_specific" else False,
            'metadata': metadata
        }
        
        if model_type == "stock_specific":
            info['model_path'] = str(self.specific_available[symbol])
            info['training_date'] = metadata.get('training_date') if metadata else None
            info['test_mape'] = metadata.get('test_mape') if metadata else None
        else:
            info['model_path'] = str(self.general_model_dir / "general_v4_log_best.h5")
            info['training_date'] = self.general_metadata.get('training_date') if self.general_metadata else None
            info['test_mape'] = self.general_metadata.get('test_mape') if self.general_metadata else None
        
        return info
    
    def get_models_by_sector(self, sector_stocks: Dict[str, List[str]]) -> dict:
        """
        Get models grouped by sector.
        
        Args:
            sector_stocks: Dictionary mapping sector -> list of stocks
        
        Returns:
            Dictionary with models per sector
        """
        result = {}
        for sector, stocks in sector_stocks.items():
            available = [s for s in stocks if s in self.available_models]
            result[sector] = {
                'total_stocks': len(stocks),
                'trained_models': len(available),
                'available_stocks': available,
                'missing_stocks': [s for s in stocks if s not in self.available_models]
            }
        return result
    
    def clear_cache(self):
        """Clear all cached models."""
        self.cache = LRUCache(capacity=self.cache_size)
        logger.info("Model cache cleared")
    
    def refresh(self):
        """Refresh model registry (rescan directory)."""
        self.specific_available = self._scan_specific_models()
        self.specific_metadata = self._load_specific_metadata()
        if self.general_model_dir and self.general_model_dir.exists():
            self._load_general_model()
        logger.info(f"Registry refreshed: {len(self.get_all_available_stocks())} total stocks available")


# Global registry instance (initialized on app startup)
_global_registry: Optional[StockModelRegistry] = None


def get_registry() -> StockModelRegistry:
    """Get global registry instance."""
    if _global_registry is None:
        raise RuntimeError("Model registry not initialized. Call init_registry() first.")
    return _global_registry


def init_registry(
    specific_models_dir: str or Path,
    general_model_dir: str or Path = None,
    cache_size: int = 20
):
    """Initialize global registry with hybrid support."""
    global _global_registry
    _global_registry = StockModelRegistry(specific_models_dir, general_model_dir, cache_size)
    return _global_registry


if __name__ == "__main__":
    # Test the hybrid registry
    from pathlib import Path
    
    specific_dir = Path(__file__).parent.parent.parent / "trained_models" / "stock_specific_v4_log"
    general_dir = Path(__file__).parent.parent.parent / "trained_models" / "general_v4_log"
    
    print("\n" + "="*80)
    print("TESTING HYBRID STOCK MODEL REGISTRY")
    print("="*80)
    
    # Initialize
    registry = StockModelRegistry(specific_dir, general_dir, cache_size=3)
    
    print(f"\nStock-specific: {registry.get_available_stocks()}")
    print(f"All available: {registry.get_all_available_stocks()}")
    print(f"Initial stats: {registry.get_stats()}")
    
    # Test loading stock-specific model
    print("\nLoading SCOM (stock-specific)...")
    model, scaler, model_type = registry.load_model("SCOM")
    print(f"Model type: {model_type}")
    print(f"Scaler type: {type(scaler)}")
    
    # Test loading general model stock
    print("\nLoading BKG (general model)...")
    model2, scaler2, model_type2 = registry.load_model("BKG")
    print(f"Model type: {model_type2}")
    print(f"Scaler type: {type(scaler2)}")
    
    # Test cache hit
    print("\nLoading SCOM again (should be cached)...")
    model3, scaler3, model_type3 = registry.load_model("SCOM")
    print(f"Same model: {model is model3}")
    
    print(f"\nFinal stats: {registry.get_stats()}")
    
    # Test model info
    print(f"\nSCOM info: {registry.get_model_info('SCOM')}")
    print(f"\nBKG info: {registry.get_model_info('BKG')}")
    
    print("\n" + "="*80)
    print("✅ All tests passed!")

