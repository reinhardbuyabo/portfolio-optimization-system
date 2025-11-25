"""
GARCH forecast calibration service.

Tracks historical forecast accuracy and applies dynamic corrections.
"""

import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Optional
import numpy as np


class GARCHCalibrator:
    """Manages GARCH forecast calibration based on historical accuracy."""
    
    def __init__(self, storage_path: Optional[Path] = None):
        self.storage_path = storage_path or Path(__file__).parent.parent.parent / "data" / "garch_calibration.json"
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.forecasts = self._load_forecasts()
    
    def _load_forecasts(self) -> Dict:
        """Load historical forecast data."""
        if self.storage_path.exists():
            with open(self.storage_path, 'r') as f:
                return json.load(f)
        return {}
    
    def _save_forecasts(self):
        """Save forecast data to disk."""
        with open(self.storage_path, 'w') as f:
            json.dump(self.forecasts, f, indent=2)
    
    def record_forecast(self, symbol: str, forecasted_var: float, realized_var: float, date: str):
        """Record a forecast and its realized value."""
        if symbol not in self.forecasts:
            self.forecasts[symbol] = []
        
        self.forecasts[symbol].append({
            "date": date,
            "forecasted": forecasted_var,
            "realized": realized_var,
            "ratio": realized_var / forecasted_var if forecasted_var > 0 else 1.0
        })
        
        # Keep only last 100 records per symbol
        if len(self.forecasts[symbol]) > 100:
            self.forecasts[symbol] = self.forecasts[symbol][-100:]
        
        self._save_forecasts()
    
    def get_calibration_factor(self, symbol: str, lookback_days: int = 30) -> float:
        """
        Calculate calibration factor based on recent forecast accuracy.
        
        Returns multiplier to apply to raw forecasts.
        """
        if symbol not in self.forecasts or not self.forecasts[symbol]:
            return 1.5  # Default conservative correction
        
        # Get recent forecasts
        recent = self.forecasts[symbol][-lookback_days:]
        
        if len(recent) < 5:
            return 1.5  # Need minimum data
        
        # Calculate median ratio (realized / forecasted)
        ratios = [f['ratio'] for f in recent if f['ratio'] > 0]
        
        if not ratios:
            return 1.5
        
        # Use median (more robust than mean)
        median_ratio = np.median(ratios)
        
        # Cap at reasonable bounds
        return max(0.8, min(2.5, median_ratio))
    
    def get_forecast_stats(self, symbol: str) -> Dict:
        """Get accuracy statistics for a symbol."""
        if symbol not in self.forecasts or not self.forecasts[symbol]:
            return {"error": "No historical data"}
        
        data = self.forecasts[symbol]
        ratios = [f['ratio'] for f in data]
        
        return {
            "count": len(data),
            "mean_ratio": np.mean(ratios),
            "median_ratio": np.median(ratios),
            "std_ratio": np.std(ratios),
            "current_calibration": self.get_calibration_factor(symbol),
            "accuracy": {
                "underestimation_pct": (np.mean(ratios) - 1.0) * 100,
                "typical_error": np.std(ratios) * 100
            }
        }
    
    def get_confidence_interval(self, symbol: str, forecasted_var: float) -> Dict[str, float]:
        """
        Calculate confidence interval for forecast.
        
        Returns 95% CI based on historical forecast errors.
        """
        if symbol not in self.forecasts or len(self.forecasts[symbol]) < 10:
            # Not enough data, use wide interval
            return {
                "lower": forecasted_var * 0.5,
                "upper": forecasted_var * 2.5
            }
        
        ratios = [f['ratio'] for f in self.forecasts[symbol]]
        
        # 95% confidence interval
        lower_pct = np.percentile(ratios, 2.5)
        upper_pct = np.percentile(ratios, 97.5)
        
        return {
            "lower": forecasted_var * lower_pct,
            "upper": forecasted_var * upper_pct
        }


# Global instance
calibrator = GARCHCalibrator()
