"""
Walk-Forward Validation for Top 15 Stocks
Comprehensive validation using expanding window approach
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
import tensorflow as tf
import joblib
from datetime import datetime
from config.core import settings
from processing.data_manager import load_dataset
from processing.walk_forward import WalkForwardValidator
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import json

print("="*80)
print("WALK-FORWARD VALIDATION - TOP 15 STOCKS")
print("="*80)

# Top 15 stocks as specified
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
print(f"\nRunning walk-forward validation on {len(TOP_15_STOCKS)} stocks...")

model_dir = settings.TRAINED_MODEL_DIR / 'stock_specific_v2'
validator = WalkForwardValidator(
    min_train_size=500,
    test_size=60,
    step_size=30,
    n_splits=5
)

all_results = []
successful = 0
failed = 0

for idx, stock in enumerate(TOP_15_STOCKS, 1):
    print(f"\n{'='*80}")
    print(f"[{idx}/{len(TOP_15_STOCKS)}] Walk-Forward Validation: {stock}")
    print(f"{'='*80}")
    
    # Load model
    model_path = model_dir / f"{stock}_best.h5"
    scaler_path = model_dir / f"{stock}_scaler.joblib"
    metadata_path = model_dir / f"{stock}_metadata.json"
    
    if not model_path.exists():
        print(f"❌ Model not found: {model_path}")
        failed += 1
        continue
    
    try:
        # Load model and scaler
        model = tf.keras.models.load_model(model_path)
        scaler_data = joblib.load(scaler_path)
        
        # Handle both old and new scaler formats
        if isinstance(scaler_data, dict):
            scaler = scaler_data['scaler']
        else:
            scaler = scaler_data
        
        # Load metadata
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        # Get stock data
        stock_data = data[data[stock_col] == stock].copy()
        stock_data = stock_data.sort_values(date_col)
        prices = stock_data['Day Price'].dropna().values
        
        if len(prices) < 200:
            print(f"❌ Insufficient data: {len(prices)} samples (need 200+)")
            failed += 1
            continue
        
        print(f"Data: {len(prices)} samples")
        print(f"Price range: [{prices.min():.2f}, {prices.max():.2f}] KES")
        print(f"Training metadata:")
        print(f"  Model version: {metadata.get('model_version', 'N/A')}")
        print(f"  Trained samples: {metadata.get('n_samples', 'N/A')}")
        print(f"  Training R²: {metadata.get('validation_metrics', {}).get('r2', 0):.4f}")
        print(f"  Training MAE: {metadata.get('validation_metrics', {}).get('mae', 0):.2f} KES")
        
        # Prepare data
        scaled_prices = scaler.transform(prices.reshape(-1, 1))
        
        # Create sequences (30 days based on training)
        seq_len = metadata.get('prediction_days', 30)
        X, y = [], []
        for i in range(seq_len, len(scaled_prices)):
            X.append(scaled_prices[i-seq_len:i])
            y.append(scaled_prices[i, 0])
        
        X = np.array(X)
        y = np.array(y)
        
        print(f"\nCreated {len(X)} sequences (length={seq_len})")
        
        # Walk-forward validation
        print(f"Running {validator.n_splits}-fold walk-forward validation...")
        
        splits = validator.split(X)
        fold_results = []
        
        for fold_idx, (train_idx, test_idx) in enumerate(splits, 1):
            X_test_fold = X[test_idx]
            y_test_fold = y[test_idx]
            
            # Predict
            y_pred_fold = model.predict(X_test_fold, verbose=0).flatten()
            
            # Inverse transform
            y_test_actual = scaler.inverse_transform(y_test_fold.reshape(-1, 1)).flatten()
            y_pred_actual = scaler.inverse_transform(y_pred_fold.reshape(-1, 1)).flatten()
            
            # Calculate metrics
            mae = mean_absolute_error(y_test_actual, y_pred_actual)
            mse = mean_squared_error(y_test_actual, y_pred_actual)
            rmse = np.sqrt(mse)
            r2 = r2_score(y_test_actual, y_pred_actual)
            mape = np.mean(np.abs((y_test_actual - y_pred_actual) / (y_test_actual + 1e-8))) * 100
            
            # Directional accuracy
            if len(y_test_actual) > 1:
                actual_dir = np.diff(y_test_actual) > 0
                pred_dir = np.diff(y_pred_actual) > 0
                dir_acc = np.mean(actual_dir == pred_dir)
            else:
                dir_acc = 0.5
            
            # Financial metrics
            financial = validator.financial_metrics(y_test_actual, y_pred_actual)
            
            fold_results.append({
                'fold': fold_idx,
                'samples': len(y_test_fold),
                'mae': mae,
                'rmse': rmse,
                'r2': r2,
                'mape': mape,
                'directional_accuracy': dir_acc,
                'sharpe_ratio': financial.get('sharpe_ratio', 0),
                'win_rate': financial.get('win_rate', 0),
                'total_return': financial.get('total_return', 0),
                'max_drawdown': financial.get('max_drawdown', 0)
            })
            
            print(f"  Fold {fold_idx}: R²={r2:.4f}, MAE={mae:.2f}, MAPE={mape:.2f}%, "
                  f"Sharpe={financial.get('sharpe_ratio', 0):.2f}, Win={financial.get('win_rate', 0)*100:.1f}%")
        
        # Aggregate results
        df_folds = pd.DataFrame(fold_results)
        
        result = {
            'stock': stock,
            'n_samples': len(prices),
            'n_sequences': len(X),
            'price_range': f"[{prices.min():.2f}, {prices.max():.2f}]",
            'mae_mean': df_folds['mae'].mean(),
            'mae_std': df_folds['mae'].std(),
            'rmse_mean': df_folds['rmse'].mean(),
            'rmse_std': df_folds['rmse'].std(),
            'r2_mean': df_folds['r2'].mean(),
            'r2_std': df_folds['r2'].std(),
            'mape_mean': df_folds['mape'].mean(),
            'mape_std': df_folds['mape'].std(),
            'directional_accuracy_mean': df_folds['directional_accuracy'].mean(),
            'directional_accuracy_std': df_folds['directional_accuracy'].std(),
            'sharpe_ratio_mean': df_folds['sharpe_ratio'].mean(),
            'sharpe_ratio_std': df_folds['sharpe_ratio'].std(),
            'win_rate_mean': df_folds['win_rate'].mean(),
            'win_rate_std': df_folds['win_rate'].std(),
            'total_return_mean': df_folds['total_return'].mean(),
            'max_drawdown_mean': df_folds['max_drawdown'].mean()
        }
        
        all_results.append(result)
        successful += 1
        
        print(f"\n{stock} Summary:")
        print(f"  R²: {result['r2_mean']:.4f} ± {result['r2_std']:.4f}")
        print(f"  MAE: {result['mae_mean']:.2f} ± {result['mae_std']:.2f} KES")
        print(f"  MAPE: {result['mape_mean']:.2f} ± {result['mape_std']:.2f}%")
        print(f"  Sharpe: {result['sharpe_ratio_mean']:.2f} ± {result['sharpe_ratio_std']:.2f}")
        print(f"  Win Rate: {result['win_rate_mean']*100:.1f} ± {result['win_rate_std']*100:.1f}%")
        print(f"  Directional Accuracy: {result['directional_accuracy_mean']*100:.1f} ± {result['directional_accuracy_std']*100:.1f}%")
        
    except Exception as e:
        print(f"❌ Error validating {stock}: {e}")
        import traceback
        traceback.print_exc()
        failed += 1

# Summary
print(f"\n{'='*80}")
print("WALK-FORWARD VALIDATION SUMMARY")
print(f"{'='*80}")
print(f"\nSuccessful: {successful}/{len(TOP_15_STOCKS)}")
print(f"Failed: {failed}/{len(TOP_15_STOCKS)}")

if all_results:
    df = pd.DataFrame(all_results)
    
    # Sort by Sharpe ratio
    df = df.sort_values('sharpe_ratio_mean', ascending=False)
    
    print(f"\n{'Stock':<8} {'R²':<8} {'MAE':<10} {'MAPE':<10} {'Sharpe':<10} {'Win%':<8} {'Dir%':<8}")
    print("-" * 80)
    for _, row in df.iterrows():
        print(f"{row['stock']:<8} "
              f"{row['r2_mean']:>7.4f} "
              f"{row['mae_mean']:>9.2f} "
              f"{row['mape_mean']:>9.2f}% "
              f"{row['sharpe_ratio_mean']:>9.2f} "
              f"{row['win_rate_mean']*100:>7.1f}% "
              f"{row['directional_accuracy_mean']*100:>7.1f}%")
    
    # Overall statistics
    print(f"\n{'='*80}")
    print("OVERALL STATISTICS")
    print(f"{'='*80}")
    print(f"Mean R²: {df['r2_mean'].mean():.4f}")
    print(f"Mean MAE: {df['mae_mean'].mean():.2f} KES")
    print(f"Mean MAPE: {df['mape_mean'].mean():.2f}%")
    print(f"Mean Sharpe Ratio: {df['sharpe_ratio_mean'].mean():.2f}")
    print(f"Mean Win Rate: {df['win_rate_mean'].mean()*100:.1f}%")
    print(f"Mean Directional Accuracy: {df['directional_accuracy_mean'].mean()*100:.1f}%")
    
    # Production readiness
    print(f"\n{'='*80}")
    print("PRODUCTION READINESS ASSESSMENT")
    print(f"{'='*80}")
    
    criteria = {
        'Excellent': {'sharpe': 7.0, 'win_rate': 0.65, 'dir_acc': 0.57},
        'Good': {'sharpe': 3.0, 'win_rate': 0.55, 'dir_acc': 0.53},
        'Acceptable': {'sharpe': 1.0, 'win_rate': 0.50, 'dir_acc': 0.52}
    }
    
    for _, row in df.iterrows():
        sharpe = row['sharpe_ratio_mean']
        win_rate = row['win_rate_mean']
        dir_acc = row['directional_accuracy_mean']
        
        if (sharpe >= criteria['Excellent']['sharpe'] and 
            win_rate >= criteria['Excellent']['win_rate'] and 
            dir_acc >= criteria['Excellent']['dir_acc']):
            status = "✅ Excellent"
        elif (sharpe >= criteria['Good']['sharpe'] and 
              win_rate >= criteria['Good']['win_rate'] and 
              dir_acc >= criteria['Good']['dir_acc']):
            status = "✅ Good"
        elif (sharpe >= criteria['Acceptable']['sharpe'] and 
              win_rate >= criteria['Acceptable']['win_rate'] and 
              dir_acc >= criteria['Acceptable']['dir_acc']):
            status = "⚠️  Acceptable"
        else:
            status = "❌ Review Needed"
        
        print(f"{row['stock']:<8} {status:<20} (Sharpe: {sharpe:.2f}, Win: {win_rate*100:.1f}%, Dir: {dir_acc*100:.1f}%)")
    
    # Save results
    output_file = settings.TRAINED_MODEL_DIR / 'walk_forward_validation_top15.json'
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    print(f"\n✓ Results saved to: {output_file}")
    
    # Save CSV
    csv_file = settings.TRAINED_MODEL_DIR / 'walk_forward_validation_top15.csv'
    df.to_csv(csv_file, index=False)
    print(f"✓ CSV saved to: {csv_file}")

else:
    print("\n❌ No results to display")

print(f"\n{'='*80}")
print("✓ WALK-FORWARD VALIDATION COMPLETE")
print(f"{'='*80}")
