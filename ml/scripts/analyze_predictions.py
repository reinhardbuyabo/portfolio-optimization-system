#!/usr/bin/env python3
"""
Model Inference Analysis and Refinement Recommendations

Analyzes prediction results from stock-specific models and provides
recommendations for model improvements.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import json
import numpy as np
import pandas as pd
from typing import Dict, List
from loguru import logger

MODELS_DIR = Path(__file__).parent.parent / "trained_models" / "stock_specific_v2"
DATASETS_DIR = Path(__file__).parent.parent / "datasets"


def load_historical_data(stock_code: str, end_date: str = "2024-10-31") -> pd.DataFrame:
    """Load historical stock data."""
    all_files = sorted(DATASETS_DIR.glob("NSE_data_all_stocks_*.csv"))
    all_files = [f for f in all_files if "sector" not in f.name.lower()]
    
    dfs = []
    for file in all_files:
        try:
            df = pd.read_csv(file)
            df.columns = df.columns.str.strip()
            if 'CODE' in df.columns:
                df.rename(columns={'CODE': 'Code', 'DATE': 'Date'}, inplace=True)
            
            if 'Code' not in df.columns:
                continue
            
            stock_df = df[df['Code'] == stock_code].copy()
            if not stock_df.empty:
                dfs.append(stock_df)
        except Exception:
            continue
    
    if not dfs:
        return pd.DataFrame()
    
    combined = pd.concat(dfs, ignore_index=True)
    combined['Date'] = pd.to_datetime(combined['Date'], format='%d-%b-%Y', errors='coerce')
    combined = combined.dropna(subset=['Date'])
    combined = combined.sort_values('Date')
    combined = combined[combined['Date'] <= end_date]
    
    # Clean price data
    combined['Day Price'] = combined['Day Price'].astype(str).str.replace(',', '')
    combined['Day Price'] = pd.to_numeric(combined['Day Price'], errors='coerce')
    combined = combined.dropna(subset=['Day Price'])
    
    return combined


def calculate_price_statistics(df: pd.DataFrame, periods: List[int] = [10, 30, 60]) -> Dict:
    """Calculate price statistics for different periods."""
    stats = {}
    
    for period in periods:
        recent = df.tail(period)
        prices = recent['Day Price'].values
        
        if len(prices) > 1:
            returns = np.diff(prices) / prices[:-1]
            
            stats[f'last_{period}d'] = {
                'mean': float(prices.mean()),
                'std': float(prices.std()),
                'min': float(prices.min()),
                'max': float(prices.max()),
                'last': float(prices[-1]),
                'first': float(prices[0]),
                'change': float(prices[-1] - prices[0]),
                'change_pct': float((prices[-1] - prices[0]) / prices[0] * 100),
                'volatility': float(prices.std() / prices.mean() * 100),
                'avg_daily_return': float(returns.mean() * 100),
                'return_volatility': float(returns.std() * 100)
            }
    
    return stats


def analyze_prediction_quality(stock_code: str, prediction: float, last_price: float) -> Dict:
    """Analyze the quality of a prediction."""
    # Load historical data
    df = load_historical_data(stock_code)
    
    if df.empty:
        return {'error': 'No historical data'}
    
    # Calculate statistics
    stats = calculate_price_statistics(df)
    
    # Prediction analysis
    change = prediction - last_price
    change_pct = (change / last_price) * 100
    
    # Get recent price range
    recent_60d = df.tail(60)
    price_range_60d = recent_60d['Day Price'].max() - recent_60d['Day Price'].min()
    
    # Check if prediction is within reasonable bounds
    max_60d = recent_60d['Day Price'].max()
    min_60d = recent_60d['Day Price'].min()
    
    analysis = {
        'stock_code': stock_code,
        'prediction': prediction,
        'last_price': last_price,
        'change': change,
        'change_pct': change_pct,
        'within_60d_range': min_60d <= prediction <= max_60d,
        'exceeds_max_by': max(0, prediction - max_60d),
        'below_min_by': max(0, min_60d - prediction),
        'prediction_vs_60d_avg': prediction - stats['last_60d']['mean'],
        'prediction_vs_60d_avg_pct': (prediction - stats['last_60d']['mean']) / stats['last_60d']['mean'] * 100,
        'historical_stats': stats,
        'flags': []
    }
    
    # Flag unusual predictions
    if abs(change_pct) > 50:
        analysis['flags'].append(f'EXTREME_CHANGE: {change_pct:.1f}% change is very large')
    
    if prediction > max_60d * 1.2:
        analysis['flags'].append(f'ABOVE_RANGE: Prediction {((prediction/max_60d - 1)*100):.1f}% above 60-day max')
    
    if prediction < min_60d * 0.8:
        analysis['flags'].append(f'BELOW_RANGE: Prediction {((1 - prediction/min_60d)*100):.1f}% below 60-day min')
    
    if abs(change_pct) > abs(stats['last_60d']['change_pct']) * 3:
        analysis['flags'].append(f'VOLATILITY_MISMATCH: Predicted change much larger than 60-day trend')
    
    return analysis


def generate_recommendations(analysis: Dict) -> List[str]:
    """Generate recommendations based on analysis."""
    recommendations = []
    
    if analysis.get('error'):
        return ['ERROR: Unable to analyze - no historical data']
    
    # Check prediction quality
    if analysis['flags']:
        recommendations.append("⚠️  PREDICTION QUALITY CONCERNS:")
        for flag in analysis['flags']:
            recommendations.append(f"   - {flag}")
        recommendations.append("")
    
    # Model improvement recommendations
    change_pct = abs(analysis['change_pct'])
    
    if change_pct > 100:
        recommendations.append("🔧 CRITICAL: Model may be overfitting or data scaling issue")
        recommendations.append("   Recommendations:")
        recommendations.append("   1. Check scaler - ensure it was fit on training data only")
        recommendations.append("   2. Review training data for outliers")
        recommendations.append("   3. Add regularization (dropout, L2)")
        recommendations.append("   4. Retrain with more conservative architecture")
        recommendations.append("")
    
    elif change_pct > 30:
        recommendations.append("⚠️  Model shows high volatility in predictions")
        recommendations.append("   Recommendations:")
        recommendations.append("   1. Increase training data if possible")
        recommendations.append("   2. Add ensemble methods (average multiple models)")
        recommendations.append("   3. Review sequence length (currently 60 days)")
        recommendations.append("   4. Consider adding technical indicators as features")
        recommendations.append("")
    
    # Trend analysis
    hist_trend = analysis['historical_stats']['last_60d']['change_pct']
    pred_trend = analysis['change_pct']
    
    if hist_trend > 0 and pred_trend < 0:
        recommendations.append("📊 Prediction reverses recent uptrend")
        recommendations.append("   - May indicate model sees resistance or correction")
    elif hist_trend < 0 and pred_trend > 0:
        recommendations.append("📊 Prediction reverses recent downtrend")
        recommendations.append("   - May indicate model sees support or recovery")
    
    return recommendations


def main():
    """Main analysis function."""
    logger.remove()
    logger.add(lambda msg: print(msg, end=""), level="INFO", colorize=True)
    
    # Test predictions from earlier
    predictions = [
        {'stock': 'SCOM', 'prediction': 20.0196, 'last_price': 16.75},
        {'stock': 'EQTY', 'prediction': 38.4189, 'last_price': 47.30},
        {'stock': 'KCB', 'prediction': 44.2187, 'last_price': 38.50},
        {'stock': 'BAMB', 'prediction': 194.4356, 'last_price': 65.75},
        {'stock': 'EABL', 'prediction': 256.1938, 'last_price': 183.00},
    ]
    
    logger.info("="*80)
    logger.info("STOCK-SPECIFIC MODEL INFERENCE ANALYSIS")
    logger.info("="*80)
    logger.info("")
    
    all_analyses = []
    
    for pred in predictions:
        logger.info(f"\n{'='*80}")
        logger.info(f"ANALYZING: {pred['stock']}")
        logger.info(f"{'='*80}")
        
        analysis = analyze_prediction_quality(
            pred['stock'],
            pred['prediction'],
            pred['last_price']
        )
        
        all_analyses.append(analysis)
        
        # Display analysis
        logger.info(f"\nPrediction Summary:")
        logger.info(f"  Current Price:    {analysis['last_price']:.2f} KES")
        logger.info(f"  Predicted Price:  {analysis['prediction']:.2f} KES")
        logger.info(f"  Change:           {analysis['change']:+.2f} KES ({analysis['change_pct']:+.1f}%)")
        logger.info(f"  Within 60d Range: {analysis['within_60d_range']}")
        
        logger.info(f"\n60-Day Historical Context:")
        hist = analysis['historical_stats']['last_60d']
        logger.info(f"  Range:            {hist['min']:.2f} - {hist['max']:.2f} KES")
        logger.info(f"  Average:          {hist['mean']:.2f} KES")
        logger.info(f"  60d Change:       {hist['change']:+.2f} KES ({hist['change_pct']:+.1f}%)")
        logger.info(f"  Volatility:       {hist['volatility']:.2f}%")
        logger.info(f"  Avg Daily Return: {hist['avg_daily_return']:+.3f}%")
        
        # Generate and display recommendations
        recommendations = generate_recommendations(analysis)
        
        if recommendations:
            logger.info(f"\n{'-'*80}")
            logger.info("RECOMMENDATIONS:")
            logger.info(f"{'-'*80}")
            for rec in recommendations:
                logger.info(rec)
    
    # Summary
    logger.info(f"\n{'='*80}")
    logger.info("OVERALL ANALYSIS SUMMARY")
    logger.info(f"{'='*80}\n")
    
    extreme_changes = [a for a in all_analyses if abs(a['change_pct']) > 50]
    out_of_range = [a for a in all_analyses if not a['within_60d_range']]
    
    logger.info(f"Total Stocks Analyzed: {len(all_analyses)}")
    logger.info(f"Extreme Predictions (>50% change): {len(extreme_changes)}")
    logger.info(f"Out of 60-day Range: {len(out_of_range)}")
    
    if extreme_changes:
        logger.info(f"\n⚠️  Stocks with Extreme Predictions:")
        for a in extreme_changes:
            logger.info(f"  - {a['stock_code']}: {a['change_pct']:+.1f}% change")
    
    logger.info(f"\n{'='*80}")
    logger.info("KEY RECOMMENDATIONS FOR MODEL REFINEMENT")
    logger.info(f"{'='*80}\n")
    
    logger.info("1. 🎯 CHECK SCALERS:")
    logger.info("   - Verify each stock's scaler was fit ONLY on training data")
    logger.info("   - Ensure no data leakage from test/validation sets")
    logger.info("   - Review scaler.data_min_ and scaler.data_max_ values")
    
    logger.info("\n2. 📊 REVIEW TRAINING PROCESS:")
    logger.info("   - Models trained for 50 epochs without early stopping")
    logger.info("   - No MAE/MAPE metrics recorded in metadata")
    logger.info("   - Add validation metrics tracking")
    logger.info("   - Implement early stopping with patience=10-15")
    
    logger.info("\n3. 🔧 MODEL ARCHITECTURE:")
    logger.info("   - Consider adding dropout layers (0.2-0.3)")
    logger.info("   - Add L2 regularization to prevent overfitting")
    logger.info("   - Try ensemble of multiple models")
    logger.info("   - Experiment with sequence length (30, 45, 60, 90 days)")
    
    logger.info("\n4. 📈 FEATURE ENGINEERING:")
    logger.info("   - Add technical indicators (RSI, MACD, Moving Averages)")
    logger.info("   - Include volume data if available")
    logger.info("   - Add market sentiment features")
    logger.info("   - Consider volatility features (rolling std, ATR)")
    
    logger.info("\n5. ✅ VALIDATION STRATEGY:")
    logger.info("   - Implement walk-forward validation")
    logger.info("   - Test on out-of-sample data (Nov 2024 onwards)")
    logger.info("   - Calculate actual MAE, MAPE, Sharpe ratio")
    logger.info("   - Compare against baseline (naive, ARIMA)")
    
    logger.info(f"\n{'='*80}\n")


if __name__ == "__main__":
    main()
