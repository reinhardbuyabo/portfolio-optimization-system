"""
Data Analysis Script - Phase 1 of Retraining Plan
Analyzes training data quality and prepares recommendations
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import numpy as np
from processing.data_manager import load_dataset
from config.core import settings
from loguru import logger
import json
from datetime import datetime


def analyze_data_quality():
    """Comprehensive data quality analysis"""
    
    logger.info("="*80)
    logger.info("DATA QUALITY ANALYSIS")
    logger.info("="*80)
    
    # Load all data
    data = load_dataset()
    logger.info(f"\nTotal records: {len(data):,}")
    
    # Identify stock column
    stock_col = 'CODE' if 'CODE' in data.columns else 'Code'
    date_col = 'DATE' if 'DATE' in data.columns else 'Date'
    
    # Per-stock analysis
    stocks = data[stock_col].unique()
    logger.info(f"Unique stocks: {len(stocks)}")
    
    stock_analysis = []
    
    for stock in stocks:
        stock_data = data[data[stock_col] == stock].copy()
        
        # Convert date to datetime
        try:
            stock_data[date_col] = pd.to_datetime(stock_data[date_col])
        except:
            continue
        
        # Sort by date
        stock_data = stock_data.sort_values(date_col)
        
        # Analyze 'Day Price'
        prices = stock_data['Day Price'].dropna()
        
        if len(prices) == 0:
            continue
        
        # Calculate statistics
        analysis = {
            'stock_code': stock,
            'total_records': len(stock_data),
            'valid_prices': len(prices),
            'missing_pct': (1 - len(prices)/len(stock_data)) * 100,
            'min_price': float(prices.min()),
            'max_price': float(prices.max()),
            'mean_price': float(prices.mean()),
            'median_price': float(prices.median()),
            'std_price': float(prices.std()),
            'price_range': float(prices.max() - prices.min()),
            'date_start': stock_data[date_col].min().strftime('%Y-%m-%d'),
            'date_end': stock_data[date_col].max().strftime('%Y-%m-%d'),
            'trading_days': len(prices)
        }
        
        # Check for outliers (>3 std from mean)
        z_scores = np.abs((prices - prices.mean()) / prices.std())
        outliers = np.sum(z_scores > 3)
        analysis['outliers'] = int(outliers)
        analysis['outlier_pct'] = float(outliers / len(prices) * 100)
        
        # Check data density (gaps)
        dates = stock_data[stock_data['Day Price'].notna()][date_col]
        if len(dates) > 1:
            date_diffs = dates.diff().dt.days.dropna()
            analysis['avg_gap_days'] = float(date_diffs.mean())
            analysis['max_gap_days'] = int(date_diffs.max())
        else:
            analysis['avg_gap_days'] = 0
            analysis['max_gap_days'] = 0
        
        stock_analysis.append(analysis)
    
    # Convert to DataFrame for analysis
    df_analysis = pd.DataFrame(stock_analysis)
    
    # Sort by trading days
    df_analysis = df_analysis.sort_values('trading_days', ascending=False)
    
    logger.info("\n" + "="*80)
    logger.info("SUMMARY STATISTICS")
    logger.info("="*80)
    
    logger.info(f"\nStocks with >500 trading days: {len(df_analysis[df_analysis['trading_days'] >= 500])}")
    logger.info(f"Stocks with >1000 trading days: {len(df_analysis[df_analysis['trading_days'] >= 1000])}")
    logger.info(f"Stocks with <100 trading days: {len(df_analysis[df_analysis['trading_days'] < 100])}")
    
    logger.info(f"\nMissing data:")
    logger.info(f"  Stocks with <5% missing: {len(df_analysis[df_analysis['missing_pct'] < 5])}")
    logger.info(f"  Stocks with >20% missing: {len(df_analysis[df_analysis['missing_pct'] > 20])}")
    
    logger.info(f"\nOutliers:")
    logger.info(f"  Stocks with <1% outliers: {len(df_analysis[df_analysis['outlier_pct'] < 1])}")
    logger.info(f"  Stocks with >5% outliers: {len(df_analysis[df_analysis['outlier_pct'] > 5])}")
    
    # Recommendations
    logger.info("\n" + "="*80)
    logger.info("RECOMMENDATIONS FOR TRAINING")
    logger.info("="*80)
    
    # Tier 1: Excellent data quality
    tier1 = df_analysis[
        (df_analysis['trading_days'] >= 1000) &
        (df_analysis['missing_pct'] < 5) &
        (df_analysis['outlier_pct'] < 2)
    ]
    
    # Tier 2: Good data quality
    tier2 = df_analysis[
        (df_analysis['trading_days'] >= 500) &
        (df_analysis['trading_days'] < 1000) &
        (df_analysis['missing_pct'] < 10) &
        (df_analysis['outlier_pct'] < 5)
    ]
    
    # Tier 3: Acceptable
    tier3 = df_analysis[
        (df_analysis['trading_days'] >= 300) &
        (df_analysis['missing_pct'] < 20)
    ]
    
    logger.info(f"\n✓ Tier 1 (Excellent - Train First): {len(tier1)} stocks")
    if len(tier1) > 0:
        logger.info("  Stocks: " + ", ".join(tier1['stock_code'].head(15).tolist()))
    
    logger.info(f"\n✓ Tier 2 (Good - Train Second): {len(tier2)} stocks")
    if len(tier2) > 0:
        logger.info("  Stocks: " + ", ".join(tier2['stock_code'].head(10).tolist()))
    
    logger.info(f"\n△ Tier 3 (Acceptable - Train if needed): {len(tier3)} stocks")
    
    # Top 10 by data availability
    logger.info("\n" + "="*80)
    logger.info("TOP 10 STOCKS BY DATA AVAILABILITY")
    logger.info("="*80)
    logger.info(f"\n{'Stock':<10} {'Days':>8} {'Missing':>10} {'Outliers':>10} {'Price Range':>15}")
    logger.info("-"*80)
    
    for _, row in df_analysis.head(10).iterrows():
        logger.info(
            f"{row['stock_code']:<10} "
            f"{row['trading_days']:>8} "
            f"{row['missing_pct']:>9.1f}% "
            f"{row['outlier_pct']:>9.1f}% "
            f"{row['min_price']:>7.2f}-{row['max_price']:<7.2f}"
        )
    
    # Save results
    output_dir = settings.TRAINED_MODEL_DIR / 'analysis'
    output_dir.mkdir(exist_ok=True)
    
    # Save detailed analysis
    df_analysis.to_csv(output_dir / 'stock_statistics.csv', index=False)
    logger.info(f"\n✓ Saved detailed analysis: {output_dir / 'stock_statistics.csv'}")
    
    # Save recommendations
    recommendations = {
        'analysis_date': datetime.now().isoformat(),
        'total_stocks': len(stocks),
        'tier1_stocks': tier1['stock_code'].tolist(),
        'tier2_stocks': tier2['stock_code'].tolist(),
        'tier3_stocks': tier3['stock_code'].tolist(),
        'recommended_for_training': tier1['stock_code'].head(10).tolist(),
        'summary': {
            'stocks_500plus_days': int(len(df_analysis[df_analysis['trading_days'] >= 500])),
            'stocks_low_missing': int(len(df_analysis[df_analysis['missing_pct'] < 5])),
            'stocks_low_outliers': int(len(df_analysis[df_analysis['outlier_pct'] < 2]))
        }
    }
    
    with open(output_dir / 'training_recommendations.json', 'w') as f:
        json.dump(recommendations, f, indent=2)
    logger.info(f"✓ Saved recommendations: {output_dir / 'training_recommendations.json'}")
    
    # Data quality report
    report = {
        'date': datetime.now().isoformat(),
        'total_records': int(len(data)),
        'unique_stocks': int(len(stocks)),
        'date_range': {
            'start': str(data[date_col].min()),
            'end': str(data[date_col].max())
        },
        'quality_summary': {
            'high_quality_stocks': int(len(tier1)),
            'good_quality_stocks': int(len(tier2)),
            'acceptable_quality_stocks': int(len(tier3)),
            'recommended_for_training': len(tier1['stock_code'].head(10).tolist())
        }
    }
    
    with open(output_dir / 'data_quality_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    logger.info(f"✓ Saved quality report: {output_dir / 'data_quality_report.json'}")
    
    logger.info("\n" + "="*80)
    logger.info("NEXT STEPS")
    logger.info("="*80)
    logger.info("\n1. Review stock_statistics.csv for detailed analysis")
    logger.info("2. Check training_recommendations.json for recommended stocks")
    logger.info("3. Proceed to hyperparameter tuning on Tier 1 stocks")
    logger.info("\nSuggested command:")
    logger.info("  python3 ml/training/hyperparameter_tuning.py --stocks " + 
                ",".join(tier1['stock_code'].head(3).tolist() if len(tier1) > 0 else ['SCOM']))
    
    return df_analysis, recommendations


if __name__ == "__main__":
    logger.info("Starting data quality analysis...\n")
    df_analysis, recommendations = analyze_data_quality()
    logger.info("\n✓ Analysis complete!")
