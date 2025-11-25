"""
Walk-Forward Validation Test on 2024 NSE Data
Tests the walk-forward validation implementation on actual 2024 stock data
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import numpy as np
from processing.walk_forward import WalkForwardValidator
from processing.data_manager import load_pipeline, load_preprocessor
from config.core import settings
from sklearn.preprocessing import MinMaxScaler
from loguru import logger


def load_2024_data():
    """Load 2024 NSE data"""
    data_path = settings.DATA_DIR / 'NSE_data_all_stocks_2024_jan_to_oct.csv'
    
    if not data_path.exists():
        raise FileNotFoundError(f"2024 data not found at {data_path}")
    
    # Read CSV - column names start with 'Date' (no number prefix in actual data)
    df = pd.read_csv(data_path)
    
    # Clean column names if they have numeric prefixes
    df.columns = [col.split('.')[-1] if '.' in col else col for col in df.columns]
    
    logger.info(f"Loaded {len(df)} rows from 2024 data")
    logger.info(f"Columns: {df.columns.tolist()}")
    logger.info(f"Date range: {df['Date'].min()} to {df['Date'].max()}")
    
    return df


def test_walk_forward_single_stock(stock_code: str = 'SCOM'):
    """
    Test walk-forward validation on a single stock from 2024 data.
    Uses SCOM (Safaricom) by default as it has good liquidity.
    """
    logger.info("=" * 80)
    logger.info(f"WALK-FORWARD VALIDATION TEST: {stock_code}")
    logger.info("=" * 80)
    
    # Load data
    data = load_2024_data()
    
    # Filter for specific stock
    stock_data = data[data['Code'] == stock_code].copy()
    
    if len(stock_data) == 0:
        logger.error(f"No data found for {stock_code}")
        return None
    
    # Sort by date
    stock_data['Date'] = pd.to_datetime(stock_data['Date'], format='%d-%b-%Y')
    stock_data = stock_data.sort_values('Date')
    
    # Clean price data
    stock_data['Day Price'] = pd.to_numeric(stock_data['Day Price'], errors='coerce')
    stock_data = stock_data.dropna(subset=['Day Price'])
    
    logger.info(f"\n{stock_code} Data Summary:")
    logger.info(f"  Records: {len(stock_data)}")
    logger.info(f"  Date range: {stock_data['Date'].min()} to {stock_data['Date'].max()}")
    logger.info(f"  Price range: {stock_data['Day Price'].min():.2f} - {stock_data['Day Price'].max():.2f} KES")
    logger.info(f"  Mean price: {stock_data['Day Price'].mean():.2f} KES")
    
    prices = stock_data['Day Price'].values
    
    if len(prices) < 200:
        logger.warning(f"Insufficient data: {len(prices)} samples (need >200)")
        return None
    
    # Load existing model
    try:
        model = load_pipeline(file_name=f"{settings.MODEL_VERSION}.h5")
        logger.info(f"Loaded model: {settings.MODEL_VERSION}")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return None
    
    # Create stock-specific scaler
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_prices = scaler.fit_transform(prices.reshape(-1, 1))
    
    logger.info(f"\nScaler fitted to {stock_code}:")
    logger.info(f"  Min: {scaler.data_min_[0]:.2f} KES")
    logger.info(f"  Max: {scaler.data_max_[0]:.2f} KES")
    logger.info(f"  Range: {scaler.data_max_[0] - scaler.data_min_[0]:.2f} KES")
    
    # Create sequences
    prediction_days = 60
    X, y = [], []
    
    for i in range(prediction_days, len(scaled_prices)):
        X.append(scaled_prices[i - prediction_days:i, 0])
        y.append(scaled_prices[i, 0])
    
    X = np.array(X).reshape(-1, prediction_days, 1)
    y = np.array(y)
    
    logger.info(f"\nSequences created: {len(X)}")
    
    # Initialize walk-forward validator
    validator = WalkForwardValidator(
        min_train_size=100,  # Min 100 samples for training
        test_size=20,        # Test on 20 days
        step_size=20,        # Move forward 20 days each time
        n_splits=3           # 3 validation windows
    )
    
    # Get splits
    splits = validator.split(X)
    
    logger.info(f"\nWalk-Forward Splits: {len(splits)}")
    
    # Run validation
    all_results = []
    
    for i, (train_idx, test_idx) in enumerate(splits):
        logger.info(f"\n--- Split {i+1}/{len(splits)} ---")
        logger.info(f"Train: {len(train_idx)} samples (indices {train_idx[0]}-{train_idx[-1]})")
        logger.info(f"Test: {len(test_idx)} samples (indices {test_idx[0]}-{test_idx[-1]})")
        
        # Get test data
        X_test = X[test_idx]
        y_test = y[test_idx]
        
        # Make predictions
        y_pred_scaled = model.predict(X_test, verbose=0).flatten()
        
        # Inverse transform to actual prices
        y_test_actual = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
        y_pred_actual = scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()
        
        # Calculate metrics
        metrics = validator.evaluate_predictions(y_test_actual, y_pred_actual, prices=True)
        financial = validator.financial_metrics(y_test_actual, y_pred_actual)
        
        # Log results
        logger.info(f"Regression Metrics:")
        logger.info(f"  R²: {metrics['r2']:.4f}")
        logger.info(f"  MAE: {metrics['mae']:.2f} KES")
        logger.info(f"  RMSE: {metrics['rmse']:.2f} KES")
        logger.info(f"  MAPE: {metrics['mape']*100:.2f}%")
        
        logger.info(f"Financial Metrics:")
        logger.info(f"  Sharpe Ratio: {financial['sharpe_ratio']:.4f}")
        logger.info(f"  Win Rate: {financial['win_rate']*100:.2f}%")
        logger.info(f"  Total Return: {financial['total_return']*100:.2f}%")
        logger.info(f"  Max Drawdown: {financial['max_drawdown']*100:.2f}%")
        
        logger.info(f"Other:")
        logger.info(f"  Negative predictions: {metrics['negative_predictions']}/{len(y_pred_actual)}")
        logger.info(f"  Directional accuracy: {metrics.get('directional_accuracy', 0)*100:.2f}%")
        
        # Sample predictions
        logger.info(f"\nSample Predictions (first 5):")
        logger.info(f"  {'Date':<12} {'Actual':>8} {'Predicted':>8} {'Error':>8} {'% Error':>8}")
        test_dates = stock_data['Date'].values[prediction_days:][test_idx]
        for j in range(min(5, len(y_test_actual))):
            date_str = pd.Timestamp(test_dates[j]).strftime('%Y-%m-%d')
            error = y_pred_actual[j] - y_test_actual[j]
            pct_error = (error / y_test_actual[j]) * 100 if y_test_actual[j] != 0 else 0
            logger.info(f"  {date_str:<12} {y_test_actual[j]:8.2f} {y_pred_actual[j]:8.2f} {error:8.2f} {pct_error:7.2f}%")
        
        # Store results
        all_results.append({
            'split': i + 1,
            'train_size': len(train_idx),
            'test_size': len(test_idx),
            'metrics': metrics,
            'financial': financial
        })
    
    # Aggregate results
    logger.info("\n" + "=" * 80)
    logger.info("AGGREGATED RESULTS ACROSS ALL SPLITS")
    logger.info("=" * 80)
    
    # Calculate averages
    avg_r2 = np.mean([r['metrics']['r2'] for r in all_results])
    avg_mae = np.mean([r['metrics']['mae'] for r in all_results])
    avg_rmse = np.mean([r['metrics']['rmse'] for r in all_results])
    avg_mape = np.mean([r['metrics']['mape'] for r in all_results])
    avg_sharpe = np.mean([r['financial']['sharpe_ratio'] for r in all_results])
    avg_win_rate = np.mean([r['financial']['win_rate'] for r in all_results])
    
    logger.info(f"\nAverage Regression Metrics:")
    logger.info(f"  R²: {avg_r2:.4f}")
    logger.info(f"  MAE: {avg_mae:.2f} KES")
    logger.info(f"  RMSE: {avg_rmse:.2f} KES")
    logger.info(f"  MAPE: {avg_mape*100:.2f}%")
    
    logger.info(f"\nAverage Financial Metrics:")
    logger.info(f"  Sharpe Ratio: {avg_sharpe:.4f}")
    logger.info(f"  Win Rate: {avg_win_rate*100:.2f}%")
    
    # Financial usefulness assessment
    logger.info("\n" + "=" * 80)
    logger.info("FINANCIAL USEFULNESS ASSESSMENT")
    logger.info("=" * 80)
    
    is_useful = True
    reasons = []
    
    if avg_sharpe > 1.0:
        logger.info(f"✓ Sharpe Ratio ({avg_sharpe:.2f}) > 1.0 - Good risk-adjusted returns")
    else:
        logger.warning(f"✗ Sharpe Ratio ({avg_sharpe:.2f}) < 1.0 - Poor risk-adjusted returns")
        is_useful = False
        reasons.append("Low Sharpe ratio")
    
    if avg_win_rate > 0.5:
        logger.info(f"✓ Win Rate ({avg_win_rate*100:.1f}%) > 50% - More wins than losses")
    else:
        logger.warning(f"✗ Win Rate ({avg_win_rate*100:.1f}%) < 50% - More losses than wins")
        is_useful = False
        reasons.append("Low win rate")
    
    if avg_r2 > 0.5:
        logger.info(f"✓ R² ({avg_r2:.2f}) > 0.5 - Explains >50% of variance")
    else:
        logger.warning(f"✗ R² ({avg_r2:.2f}) < 0.5 - Explains <50% of variance")
        is_useful = False
        reasons.append("Low R²")
    
    logger.info("\n" + "=" * 80)
    if is_useful:
        logger.info(f"✓ Model is FINANCIALLY USEFUL for {stock_code}")
    else:
        logger.warning(f"✗ Model is NOT financially useful for {stock_code}")
        logger.warning(f"Reasons: {', '.join(reasons)}")
    logger.info("=" * 80)
    
    return all_results


def test_multiple_stocks():
    """Test walk-forward validation on multiple stocks"""
    logger.info("=" * 80)
    logger.info("MULTI-STOCK WALK-FORWARD VALIDATION TEST")
    logger.info("=" * 80)
    
    # Test on liquid stocks from 2024
    test_stocks = ['SCOM', 'EQTY', 'KCB', 'BAMB', 'EABL']
    
    results_summary = []
    
    for stock in test_stocks:
        logger.info(f"\n\nTesting {stock}...")
        try:
            results = test_walk_forward_single_stock(stock)
            if results:
                # Calculate summary metrics
                avg_sharpe = np.mean([r['financial']['sharpe_ratio'] for r in results])
                avg_win_rate = np.mean([r['financial']['win_rate'] for r in results])
                avg_r2 = np.mean([r['metrics']['r2'] for r in results])
                
                results_summary.append({
                    'stock': stock,
                    'sharpe_ratio': avg_sharpe,
                    'win_rate': avg_win_rate,
                    'r2': avg_r2,
                    'useful': avg_sharpe > 1.0 and avg_win_rate > 0.5
                })
        except Exception as e:
            logger.error(f"Error testing {stock}: {e}")
    
    # Print summary table
    logger.info("\n\n" + "=" * 80)
    logger.info("SUMMARY: ALL STOCKS")
    logger.info("=" * 80)
    logger.info(f"\n{'Stock':<10} {'Sharpe':>10} {'Win Rate':>10} {'R²':>10} {'Useful?':>10}")
    logger.info("-" * 60)
    
    for result in results_summary:
        useful_str = "✓ Yes" if result['useful'] else "✗ No"
        logger.info(
            f"{result['stock']:<10} "
            f"{result['sharpe_ratio']:>10.2f} "
            f"{result['win_rate']*100:>9.1f}% "
            f"{result['r2']:>10.2f} "
            f"{useful_str:>10}"
        )
    
    # Overall assessment
    useful_count = sum(1 for r in results_summary if r['useful'])
    logger.info("\n" + "=" * 80)
    logger.info(f"Financially Useful Models: {useful_count}/{len(results_summary)}")
    logger.info("=" * 80)


if __name__ == "__main__":
    # Test single stock first
    logger.info("Starting walk-forward validation test on 2024 data...\n")
    
    # Test SCOM (Safaricom) - most liquid stock
    test_walk_forward_single_stock('SCOM')
    
    # Uncomment to test multiple stocks
    # test_multiple_stocks()
