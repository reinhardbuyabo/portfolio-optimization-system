"""
Validate Stock-Specific Models on 2024 Data
Tests all trained models to confirm production readiness
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

print("="*80)
print("STOCK-SPECIFIC MODEL VALIDATION ON 2024 DATA")
print("="*80)

# Load 2024 data
data = load_dataset()
stock_col = 'CODE' if 'CODE' in data.columns else 'Code'
date_col = 'DATE' if 'DATE' in data.columns else 'Date'

# Parse dates
data[date_col] = pd.to_datetime(data[date_col], format='%d-%b-%y', errors='coerce')
data = data.dropna(subset=[date_col])

# Filter to 2024 only
data_2024 = data[data[date_col] >= '2024-01-01'].copy()

print(f"\n2024 Data: {len(data_2024)} records")
print(f"Date range: {data_2024[date_col].min()} to {data_2024[date_col].max()}")

# Models to test
stocks = ['SCOM', 'EQTY', 'KCB', 'BAMB', 'EABL']
model_dir = settings.TRAINED_MODEL_DIR / 'stock_specific_v2'

results = []

for stock in stocks:
    print(f"\n{'='*80}")
    print(f"Testing {stock} Model on 2024 Data")
    print(f"{'='*80}")
    
    # Load model and scaler
    model_path = model_dir / f"{stock}_best.h5"
    scaler_path = model_dir / f"{stock}_scaler.joblib"
    
    if not model_path.exists():
        print(f"❌ Model not found: {model_path}")
        continue
    
    try:
        model = tf.keras.models.load_model(model_path)
        scaler = joblib.load(scaler_path)
        
        # Get 2024 data for this stock
        stock_data_2024 = data_2024[data_2024[stock_col] == stock].copy()
        stock_data_2024 = stock_data_2024.sort_values(date_col)
        prices_2024 = stock_data_2024['Day Price'].dropna().values
        
        if len(prices_2024) < 60:
            print(f"❌ Insufficient 2024 data: {len(prices_2024)} samples")
            continue
        
        print(f"2024 Data: {len(prices_2024)} samples")
        print(f"Price range: [{prices_2024.min():.2f}, {prices_2024.max():.2f}] KES")
        
        # Get all historical data for scaling
        stock_data_all = data[data[stock_col] == stock].copy()
        stock_data_all = stock_data_all.sort_values(date_col)
        prices_all = stock_data_all['Day Price'].dropna().values
        
        # Fit scaler on ALL historical data (including 2024)
        scaler_test = joblib.load(scaler_path)  # Use saved scaler range
        
        # Make predictions on 2024 data
        predictions = []
        actuals = []
        
        # Use last 500 days before 2024 for initial sequence
        prices_pre_2024 = prices_all[prices_all.shape[0] - len(prices_2024) - 500:prices_all.shape[0] - len(prices_2024)]
        combined = np.concatenate([prices_pre_2024, prices_2024])
        
        # Scale
        scaled_combined = scaler_test.transform(combined.reshape(-1, 1))
        
        # Sequence length (30 days based on training)
        seq_len = 30
        
        # Walk forward through 2024
        for i in range(seq_len, len(scaled_combined)):
            # Get sequence
            seq = scaled_combined[i-seq_len:i].reshape(1, seq_len, 1)
            
            # Predict
            pred_scaled = model.predict(seq, verbose=0)[0, 0]
            
            # Inverse transform
            pred = scaler_test.inverse_transform([[pred_scaled]])[0, 0]
            actual = combined[i]
            
            if i >= len(prices_pre_2024):  # Only count 2024 predictions
                predictions.append(pred)
                actuals.append(actual)
        
        predictions = np.array(predictions)
        actuals = np.array(actuals)
        
        # Calculate metrics
        mae = mean_absolute_error(actuals, predictions)
        mse = mean_squared_error(actuals, predictions)
        rmse = np.sqrt(mse)
        r2 = r2_score(actuals, predictions)
        mape = np.mean(np.abs((actuals - predictions) / (actuals + 1e-8))) * 100
        
        # Negative predictions
        neg_count = np.sum(predictions < 0)
        neg_ratio = neg_count / len(predictions)
        
        # Bias
        bias = np.mean(predictions - actuals)
        
        # Directional accuracy
        actual_direction = np.diff(actuals) > 0
        pred_direction = np.diff(predictions) > 0
        directional_acc = np.mean(actual_direction == pred_direction)
        
        # Financial metrics
        validator = WalkForwardValidator()
        financial = validator.financial_metrics(actuals[1:], predictions[1:])
        
        print(f"\n2024 Validation Metrics:")
        print(f"  Predictions: {len(predictions)}")
        print(f"  R²: {r2:.4f}")
        print(f"  MAE: {mae:.2f} KES")
        print(f"  RMSE: {rmse:.2f} KES")
        print(f"  MAPE: {mape:.2f}%")
        print(f"  Bias: {bias:.2f} KES")
        print(f"  Negative predictions: {neg_count}/{len(predictions)} ({neg_ratio*100:.2f}%)")
        print(f"  Directional accuracy: {directional_acc*100:.2f}%")
        print(f"\nFinancial Metrics:")
        print(f"  Sharpe ratio: {financial.get('sharpe_ratio', 0):.2f}")
        print(f"  Win rate: {financial.get('win_rate', 0)*100:.1f}%")
        print(f"  Total return: {financial.get('total_return', 0)*100:.2f}%")
        print(f"  Max drawdown: {financial.get('max_drawdown', 0)*100:.2f}%")
        
        # Store results
        results.append({
            'stock': stock,
            'n_predictions': len(predictions),
            'r2': r2,
            'mae': mae,
            'rmse': rmse,
            'mape': mape,
            'bias': bias,
            'negative_ratio': neg_ratio,
            'directional_accuracy': directional_acc,
            'sharpe_ratio': financial.get('sharpe_ratio', 0),
            'win_rate': financial.get('win_rate', 0),
            'total_return': financial.get('total_return', 0),
            'max_drawdown': financial.get('max_drawdown', 0)
        })
        
    except Exception as e:
        print(f"❌ Error testing {stock}: {e}")
        import traceback
        traceback.print_exc()

# Summary
print(f"\n{'='*80}")
print("2024 VALIDATION SUMMARY")
print(f"{'='*80}")

if results:
    df = pd.DataFrame(results)
    print(f"\n{df.to_string(index=False)}")
    
    # Averages
    print(f"\n{'='*80}")
    print("AVERAGES")
    print(f"{'='*80}")
    print(f"Mean R²: {df['r2'].mean():.4f}")
    print(f"Mean MAE: {df['mae'].mean():.2f} KES")
    print(f"Mean MAPE: {df['mape'].mean():.2f}%")
    print(f"Mean Sharpe: {df['sharpe_ratio'].mean():.2f}")
    print(f"Mean Win Rate: {df['win_rate'].mean()*100:.1f}%")
    print(f"Mean Directional Accuracy: {df['directional_accuracy'].mean()*100:.1f}%")
    print(f"Negative Predictions: {df['negative_ratio'].mean()*100:.2f}%")
    
    # Production readiness
    print(f"\n{'='*80}")
    print("PRODUCTION READINESS")
    print(f"{'='*80}")
    
    ready_count = 0
    for _, row in df.iterrows():
        is_ready = (
            row['sharpe_ratio'] > 1.0 and
            row['win_rate'] > 0.5 and
            row['negative_ratio'] < 0.01 and
            row['directional_accuracy'] > 0.52
        )
        status = "✅ READY" if is_ready else "⚠️  REVIEW"
        print(f"{row['stock']:<10} {status}")
        if is_ready:
            ready_count += 1
    
    print(f"\nProduction Ready: {ready_count}/{len(results)} models")
    
    if ready_count == len(results):
        print("\n🎉 ALL MODELS ARE PRODUCTION READY!")
    elif ready_count > 0:
        print(f"\n✅ {ready_count} models ready for deployment")
    else:
        print("\n⚠️  No models meet production criteria")

else:
    print("\n❌ No results to display")

print(f"\n{'='*80}")
print("✓ VALIDATION COMPLETE")
print(f"{'='*80}")
