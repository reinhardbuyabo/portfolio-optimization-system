"""
ARIMA Benchmark for LSTM Comparison
Trains ARIMA models on same 15 stocks and compares with LSTM performance
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from config.core import settings
from processing.data_manager import load_dataset
from processing.walk_forward import WalkForwardValidator
import json

print("="*80)
print("ARIMA BENCHMARK - TOP 15 STOCKS")
print("="*80)

# Top 15 stocks
TOP_15_STOCKS = [
    'ABSA', 'SCOM', 'COOP', 'DTK', 'KCB', 
    'NBK', 'NCBA', 'KEGN', 'KPLC', 'BAMB',
    'TOTL', 'BRIT', 'CIC', 'EABL', 'SCBK'
]

# Load data
data = load_dataset()
stock_col = 'CODE' if 'CODE' in data.columns else 'Code'
date_col = 'DATE' if 'DATE' in data.columns else 'Date'

# Parse dates
data[date_col] = pd.to_datetime(data[date_col], format='%d-%b-%y', errors='coerce')
data = data.dropna(subset=[date_col])
data = data.sort_values(date_col)

print(f"\nDataset: {len(data)} records")
print(f"Date range: {data[date_col].min()} to {data[date_col].max()}")

validator = WalkForwardValidator(
    min_train_size=500,
    test_size=60,
    step_size=30,
    n_splits=5
)

all_results = []
successful = 0
failed = 0

def find_best_arima_order(train_data, max_p=5, max_d=2, max_q=5):
    """Find best ARIMA order using AIC"""
    best_aic = np.inf
    best_order = (1, 1, 1)
    
    for p in range(max_p + 1):
        for d in range(max_d + 1):
            for q in range(max_q + 1):
                try:
                    model = ARIMA(train_data, order=(p, d, q))
                    fitted = model.fit()
                    if fitted.aic < best_aic:
                        best_aic = fitted.aic
                        best_order = (p, d, q)
                except:
                    continue
    
    return best_order

for idx, stock in enumerate(TOP_15_STOCKS, 1):
    print(f"\n{'='*80}")
    print(f"[{idx}/{len(TOP_15_STOCKS)}] ARIMA Benchmark: {stock}")
    print(f"{'='*80}")
    
    try:
        # Get stock data
        stock_data = data[data[stock_col] == stock].copy()
        stock_data = stock_data.sort_values(date_col)
        prices = stock_data['Day Price'].dropna().values
        
        if len(prices) < 200:
            print(f"❌ Insufficient data: {len(prices)} samples")
            failed += 1
            continue
        
        print(f"Data: {len(prices)} samples")
        print(f"Price range: [{prices.min():.2f}, {prices.max():.2f}] KES")
        
        # Walk-forward validation
        splits = validator.split(prices)
        fold_results = []
        
        for fold_idx, (train_idx, test_idx) in enumerate(splits, 1):
            train_prices = prices[train_idx]
            test_prices = prices[test_idx]
            
            # Find best ARIMA order on training data
            if fold_idx == 1:  # Only do this once to save time
                print(f"\nFinding optimal ARIMA order...")
                best_order = find_best_arima_order(train_prices[-500:], max_p=3, max_d=2, max_q=3)
                print(f"Best ARIMA order: {best_order}")
            
            # Train ARIMA
            model = ARIMA(train_prices, order=best_order)
            fitted_model = model.fit()
            
            # Predict
            predictions = []
            for i in range(len(test_idx)):
                # One-step ahead forecast
                if i == 0:
                    forecast = fitted_model.forecast(steps=1)
                else:
                    # Re-fit with new data point (walk-forward)
                    history = np.concatenate([train_prices, test_prices[:i]])
                    temp_model = ARIMA(history, order=best_order)
                    temp_fitted = temp_model.fit()
                    forecast = temp_fitted.forecast(steps=1)
                
                predictions.append(forecast.values[0] if hasattr(forecast, 'values') else forecast[0])
            
            predictions = np.array(predictions)
            actuals = test_prices
            
            # Calculate metrics
            mae = mean_absolute_error(actuals, predictions)
            mse = mean_squared_error(actuals, predictions)
            rmse = np.sqrt(mse)
            r2 = r2_score(actuals, predictions)
            mape = np.mean(np.abs((actuals - predictions) / (actuals + 1e-8))) * 100
            
            # Directional accuracy
            if len(actuals) > 1:
                actual_dir = np.diff(actuals) > 0
                pred_dir = np.diff(predictions) > 0
                dir_acc = np.mean(actual_dir == pred_dir)
            else:
                dir_acc = 0.5
            
            # Financial metrics
            financial = validator.financial_metrics(actuals, predictions)
            
            fold_results.append({
                'fold': fold_idx,
                'mae': mae,
                'rmse': rmse,
                'r2': r2,
                'mape': mape,
                'directional_accuracy': dir_acc,
                'sharpe_ratio': financial.get('sharpe_ratio', 0),
                'win_rate': financial.get('win_rate', 0)
            })
            
            print(f"  Fold {fold_idx}: R²={r2:.4f}, MAE={mae:.2f}, MAPE={mape:.2f}%, "
                  f"Sharpe={financial.get('sharpe_ratio', 0):.2f}, Win={financial.get('win_rate', 0)*100:.1f}%")
        
        # Aggregate results
        df_folds = pd.DataFrame(fold_results)
        
        result = {
            'stock': stock,
            'n_samples': len(prices),
            'arima_order': str(best_order),
            'mae_mean': df_folds['mae'].mean(),
            'mae_std': df_folds['mae'].std(),
            'rmse_mean': df_folds['rmse'].mean(),
            'r2_mean': df_folds['r2'].mean(),
            'r2_std': df_folds['r2'].std(),
            'mape_mean': df_folds['mape'].mean(),
            'mape_std': df_folds['mape'].std(),
            'directional_accuracy_mean': df_folds['directional_accuracy'].mean(),
            'sharpe_ratio_mean': df_folds['sharpe_ratio'].mean(),
            'sharpe_ratio_std': df_folds['sharpe_ratio'].std(),
            'win_rate_mean': df_folds['win_rate'].mean(),
            'win_rate_std': df_folds['win_rate'].std()
        }
        
        all_results.append(result)
        successful += 1
        
        print(f"\n{stock} ARIMA Summary:")
        print(f"  Order: {best_order}")
        print(f"  R²: {result['r2_mean']:.4f} ± {result['r2_std']:.4f}")
        print(f"  MAE: {result['mae_mean']:.2f} ± {result['mae_std']:.2f} KES")
        print(f"  MAPE: {result['mape_mean']:.2f} ± {result['mape_std']:.2f}%")
        print(f"  Sharpe: {result['sharpe_ratio_mean']:.2f} ± {result['sharpe_ratio_std']:.2f}")
        print(f"  Win Rate: {result['win_rate_mean']*100:.1f} ± {result['win_rate_std']*100:.1f}%")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        failed += 1

# Summary
print(f"\n{'='*80}")
print("ARIMA BENCHMARK SUMMARY")
print(f"{'='*80}")
print(f"\nSuccessful: {successful}/{len(TOP_15_STOCKS)}")
print(f"Failed: {failed}/{len(TOP_15_STOCKS)}")

if all_results:
    df = pd.DataFrame(all_results)
    df = df.sort_values('sharpe_ratio_mean', ascending=False)
    
    print(f"\n{'Stock':<8} {'Order':<12} {'R²':<8} {'MAE':<10} {'MAPE':<10} {'Sharpe':<10} {'Win%':<8}")
    print("-" * 80)
    for _, row in df.iterrows():
        print(f"{row['stock']:<8} "
              f"{row['arima_order']:<12} "
              f"{row['r2_mean']:>7.4f} "
              f"{row['mae_mean']:>9.2f} "
              f"{row['mape_mean']:>9.2f}% "
              f"{row['sharpe_ratio_mean']:>9.2f} "
              f"{row['win_rate_mean']*100:>7.1f}%")
    
    print(f"\n{'='*80}")
    print("ARIMA OVERALL STATISTICS")
    print(f"{'='*80}")
    print(f"Mean R²: {df['r2_mean'].mean():.4f}")
    print(f"Mean MAE: {df['mae_mean'].mean():.2f} KES")
    print(f"Mean MAPE: {df['mape_mean'].mean():.2f}%")
    print(f"Mean Sharpe: {df['sharpe_ratio_mean'].mean():.2f}")
    print(f"Mean Win Rate: {df['win_rate_mean'].mean()*100:.1f}%")
    print(f"Mean Directional Accuracy: {df['directional_accuracy_mean'].mean()*100:.1f}%")
    
    # Save results
    output_file = settings.TRAINED_MODEL_DIR / 'arima_benchmark_top15.json'
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    print(f"\n✓ Results saved to: {output_file}")
    
    csv_file = settings.TRAINED_MODEL_DIR / 'arima_benchmark_top15.csv'
    df.to_csv(csv_file, index=False)
    print(f"✓ CSV saved to: {csv_file}")
    
    # Load LSTM results for comparison
    lstm_file = settings.TRAINED_MODEL_DIR / 'walk_forward_validation_top15.csv'
    if lstm_file.exists():
        print(f"\n{'='*80}")
        print("ARIMA vs LSTM COMPARISON")
        print(f"{'='*80}")
        
        lstm_df = pd.read_csv(lstm_file)
        
        comparison = []
        for stock in TOP_15_STOCKS:
            arima_row = df[df['stock'] == stock]
            lstm_row = lstm_df[lstm_df['stock'] == stock]
            
            if len(arima_row) > 0 and len(lstm_row) > 0:
                arima_sharpe = arima_row.iloc[0]['sharpe_ratio_mean']
                lstm_sharpe = lstm_row.iloc[0]['sharpe_ratio_mean']
                arima_mae = arima_row.iloc[0]['mae_mean']
                lstm_mae = lstm_row.iloc[0]['mae_mean']
                
                winner_sharpe = 'ARIMA' if arima_sharpe > lstm_sharpe else 'LSTM'
                winner_mae = 'ARIMA' if arima_mae < lstm_mae else 'LSTM'
                
                comparison.append({
                    'stock': stock,
                    'arima_sharpe': arima_sharpe,
                    'lstm_sharpe': lstm_sharpe,
                    'sharpe_winner': winner_sharpe,
                    'sharpe_diff': arima_sharpe - lstm_sharpe,
                    'arima_mae': arima_mae,
                    'lstm_mae': lstm_mae,
                    'mae_winner': winner_mae
                })
        
        comp_df = pd.DataFrame(comparison)
        
        print(f"\n{'Stock':<8} {'ARIMA Sharpe':<14} {'LSTM Sharpe':<14} {'Winner':<10} {'Diff':<10}")
        print("-" * 80)
        for _, row in comp_df.iterrows():
            diff_str = f"{row['sharpe_diff']:+.2f}"
            print(f"{row['stock']:<8} "
                  f"{row['arima_sharpe']:>13.2f} "
                  f"{row['lstm_sharpe']:>13.2f} "
                  f"{row['sharpe_winner']:<10} "
                  f"{diff_str:>10}")
        
        arima_wins = (comp_df['sharpe_winner'] == 'ARIMA').sum()
        lstm_wins = (comp_df['sharpe_winner'] == 'LSTM').sum()
        
        print(f"\n{'='*80}")
        print("WINNER SUMMARY")
        print(f"{'='*80}")
        print(f"ARIMA wins (Sharpe): {arima_wins}/{len(comparison)}")
        print(f"LSTM wins (Sharpe): {lstm_wins}/{len(comparison)}")
        print(f"Average Sharpe - ARIMA: {comp_df['arima_sharpe'].mean():.2f}")
        print(f"Average Sharpe - LSTM: {comp_df['lstm_sharpe'].mean():.2f}")
        print(f"Average improvement: {comp_df['sharpe_diff'].mean():+.2f}")
        
        if comp_df['sharpe_diff'].mean() > 0:
            print(f"\n✅ ARIMA outperforms LSTM by {comp_df['sharpe_diff'].mean():.2f} Sharpe points on average")
        else:
            print(f"\n✅ LSTM outperforms ARIMA by {-comp_df['sharpe_diff'].mean():.2f} Sharpe points on average")
        
        # Save comparison
        comp_file = settings.TRAINED_MODEL_DIR / 'arima_vs_lstm_comparison.csv'
        comp_df.to_csv(comp_file, index=False)
        print(f"\n✓ Comparison saved to: {comp_file}")

print(f"\n{'='*80}")
print("✓ ARIMA BENCHMARK COMPLETE")
print(f"{'='*80}")
