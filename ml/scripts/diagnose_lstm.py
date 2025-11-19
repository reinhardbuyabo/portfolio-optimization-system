"""
LSTM Model Diagnostics Script
Analyzes the LSTM model to identify prediction bias and errors
"""
import sys
import numpy as np
import pandas as pd
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from processing.data_manager import load_dataset, load_pipeline, load_preprocessor
from config.core import settings
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score


def create_sequences(data, prediction_days=60):
    """Create sequences for LSTM prediction"""
    x, y = [], []
    for i in range(prediction_days, len(data)):
        x.append(data[i - prediction_days:i, 0])
        y.append(data[i, 0])
    return np.array(x), np.array(y)


def analyze_training_data():
    """Analyze the training data distribution"""
    print("=" * 80)
    print("TRAINING DATA ANALYSIS")
    print("=" * 80)
    
    # Load and preprocess data
    data = load_dataset()
    print(f"\nTotal records: {len(data)}")
    print(f"\nColumns: {data.columns.tolist()}")
    
    # Analyze Day Price distribution
    day_prices = data['Day Price'].dropna()
    print(f"\n'Day Price' Statistics:")
    print(f"  Count: {len(day_prices)}")
    print(f"  Min: {day_prices.min():.2f}")
    print(f"  Max: {day_prices.max():.2f}")
    print(f"  Mean: {day_prices.mean():.2f}")
    print(f"  Median: {day_prices.median():.2f}")
    print(f"  Std: {day_prices.std():.2f}")
    
    # Check for stocks
    if 'Stock' in data.columns:
        print(f"\nUnique stocks: {data['Stock'].nunique()}")
        print(f"Stocks: {sorted(data['Stock'].unique())[:10]}...")
    
    return data


def analyze_preprocessor():
    """Analyze the preprocessor scaler"""
    print("\n" + "=" * 80)
    print("PREPROCESSOR ANALYSIS")
    print("=" * 80)
    
    try:
        preprocessor = load_preprocessor(file_name=f"preprocessor_{settings.MODEL_VERSION}.joblib")
        scaler = preprocessor.scaler
        
        print(f"\nScaler type: {type(scaler).__name__}")
        print(f"Feature range: {scaler.feature_range}")
        
        if hasattr(scaler, 'data_min_') and scaler.data_min_ is not None:
            print(f"Training data min: {scaler.data_min_[0]:.2f}")
            print(f"Training data max: {scaler.data_max_[0]:.2f}")
            print(f"Training data range: {scaler.data_max_[0] - scaler.data_min_[0]:.2f}")
            
            # Test scaling examples
            print("\nScaling Examples:")
            test_values = [10, 20, 50, 100, 200]
            for val in test_values:
                scaled = scaler.transform([[val]])[0][0]
                inverse = scaler.inverse_transform([[scaled]])[0][0]
                print(f"  {val:.2f} -> {scaled:.4f} -> {inverse:.2f}")
        else:
            print("\nWARNING: Scaler not fitted!")
            
        return preprocessor
    except Exception as e:
        print(f"\nERROR loading preprocessor: {e}")
        return None


def evaluate_model_predictions(preprocessor):
    """Evaluate model on training data"""
    print("\n" + "=" * 80)
    print("MODEL PREDICTION ANALYSIS")
    print("=" * 80)
    
    try:
        # Load model
        model = load_pipeline(file_name=f"{settings.MODEL_VERSION}.h5")
        print(f"\nModel loaded: {settings.MODEL_VERSION}.h5")
        print(f"Model input shape: {model.input_shape}")
        print(f"Model output shape: {model.output_shape}")
        
        # Load and preprocess data
        data = load_dataset()
        processed_data = preprocessor.fit_transform(data.copy())
        scaled_data = processed_data['Day Price Scaled'].values.reshape(-1, 1)
        
        # Create sequences
        prediction_days = 60
        x_test, y_test = create_sequences(scaled_data, prediction_days)
        
        # Reshape for LSTM
        x_test = x_test.reshape(x_test.shape[0], x_test.shape[1], 1)
        
        print(f"\nTest sequences: {len(x_test)}")
        
        # Make predictions
        print("\nMaking predictions...")
        y_pred = model.predict(x_test, verbose=0)
        
        # Calculate metrics on scaled data
        mse_scaled = mean_squared_error(y_test, y_pred)
        mae_scaled = mean_absolute_error(y_test, y_pred)
        r2_scaled = r2_score(y_test, y_pred)
        
        print("\nMetrics on SCALED data (0-1 range):")
        print(f"  MSE: {mse_scaled:.6f}")
        print(f"  RMSE: {np.sqrt(mse_scaled):.6f}")
        print(f"  MAE: {mae_scaled:.6f}")
        print(f"  R²: {r2_scaled:.6f}")
        
        # Inverse transform to original prices
        y_test_actual = preprocessor.scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
        y_pred_actual = preprocessor.scaler.inverse_transform(y_pred).flatten()
        
        # Calculate metrics on actual prices
        mse_actual = mean_squared_error(y_test_actual, y_pred_actual)
        mae_actual = mean_absolute_error(y_test_actual, y_pred_actual)
        r2_actual = r2_score(y_test_actual, y_pred_actual)
        
        print("\nMetrics on ACTUAL PRICES:")
        print(f"  MSE: {mse_actual:.2f}")
        print(f"  RMSE: {np.sqrt(mse_actual):.2f}")
        print(f"  MAE: {mae_actual:.2f}")
        print(f"  R²: {r2_actual:.6f}")
        
        # Check for bias
        residuals = y_pred_actual - y_test_actual
        print("\nResidual Analysis:")
        print(f"  Mean residual: {np.mean(residuals):.2f}")
        print(f"  Median residual: {np.median(residuals):.2f}")
        print(f"  Std residual: {np.std(residuals):.2f}")
        
        # Check prediction distribution
        print("\nPrediction Distribution:")
        print(f"  Actual min: {y_test_actual.min():.2f}")
        print(f"  Actual max: {y_test_actual.max():.2f}")
        print(f"  Actual mean: {y_test_actual.mean():.2f}")
        print(f"  Predicted min: {y_pred_actual.min():.2f}")
        print(f"  Predicted max: {y_pred_actual.max():.2f}")
        print(f"  Predicted mean: {y_pred_actual.mean():.2f}")
        
        # Check for negative predictions
        negative_count = np.sum(y_pred_actual < 0)
        print(f"\n⚠️  Negative predictions: {negative_count} / {len(y_pred_actual)} ({100*negative_count/len(y_pred_actual):.2f}%)")
        
        # Sample predictions
        print("\nSample Predictions (first 10):")
        print("  Actual -> Predicted (Scaled Pred)")
        for i in range(min(10, len(y_test))):
            print(f"  {y_test_actual[i]:7.2f} -> {y_pred_actual[i]:7.2f} ({y_pred[i][0]:.4f})")
        
        return {
            'y_test': y_test_actual,
            'y_pred': y_pred_actual,
            'residuals': residuals,
            'metrics': {
                'mse': mse_actual,
                'rmse': np.sqrt(mse_actual),
                'mae': mae_actual,
                'r2': r2_actual
            }
        }
        
    except Exception as e:
        print(f"\nERROR during evaluation: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_stock_specific_prediction(preprocessor):
    """Test prediction with stock-specific scaling"""
    print("\n" + "=" * 80)
    print("STOCK-SPECIFIC SCALING TEST")
    print("=" * 80)
    
    try:
        model = load_pipeline(file_name=f"{settings.MODEL_VERSION}.h5")
        
        # Simulate SCOM stock data (from test script)
        scom_prices = np.array([
            14.50, 14.65, 14.75, 14.70, 14.55, 14.55, 14.60, 14.70, 14.85, 14.95,
            14.90, 15.00, 15.00, 14.80, 14.50, 14.40, 14.40, 14.40, 14.50, 14.50,
            14.50, 14.75, 14.70, 14.70, 14.90, 15.20, 14.90, 15.00, 15.05, 15.20,
            15.10, 15.10, 14.90, 14.95, 14.95, 14.95, 15.00, 14.95, 14.95, 14.95,
            14.90, 14.95, 14.95, 14.90, 14.85, 14.90, 15.00, 15.20, 15.20, 15.40,
            15.40, 15.50, 15.60, 15.90, 15.60, 16.10, 16.50, 16.90, 16.85, 16.50
        ])
        
        print(f"\nSCOM test data:")
        print(f"  Length: {len(scom_prices)}")
        print(f"  Min: {scom_prices.min():.2f}")
        print(f"  Max: {scom_prices.max():.2f}")
        print(f"  Mean: {scom_prices.mean():.2f}")
        print(f"  Last price: {scom_prices[-1]:.2f}")
        
        # Method 1: Using training scaler
        print("\n--- Method 1: Training Scaler ---")
        scaled_training = preprocessor.scaler.transform(scom_prices.reshape(-1, 1))
        sequence_training = scaled_training[-60:].reshape(1, 60, 1)
        pred_scaled_training = model.predict(sequence_training, verbose=0)[0][0]
        pred_actual_training = preprocessor.scaler.inverse_transform([[pred_scaled_training]])[0][0]
        print(f"  Scaled prediction: {pred_scaled_training:.6f}")
        print(f"  Actual prediction: {pred_actual_training:.2f}")
        
        # Method 2: Stock-specific scaler
        print("\n--- Method 2: Stock-Specific Scaler ---")
        stock_scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_stock = stock_scaler.fit_transform(scom_prices.reshape(-1, 1))
        sequence_stock = scaled_stock[-60:].reshape(1, 60, 1)
        pred_scaled_stock = model.predict(sequence_stock, verbose=0)[0][0]
        pred_actual_stock = stock_scaler.inverse_transform([[pred_scaled_stock]])[0][0]
        print(f"  Scaled prediction: {pred_scaled_stock:.6f}")
        print(f"  Actual prediction: {pred_actual_stock:.2f}")
        
        print(f"\n💡 Difference: {abs(pred_actual_training - pred_actual_stock):.2f}")
        print(f"   Training scaler range: [{preprocessor.scaler.data_min_[0]:.2f}, {preprocessor.scaler.data_max_[0]:.2f}]")
        print(f"   Stock scaler range: [{stock_scaler.data_min_[0]:.2f}, {stock_scaler.data_max_[0]:.2f}]")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Run all diagnostics"""
    print("\n" + "=" * 80)
    print("LSTM MODEL DIAGNOSTICS")
    print(f"Model Version: {settings.MODEL_VERSION}")
    print("=" * 80)
    
    # 1. Analyze training data
    analyze_training_data()
    
    # 2. Analyze preprocessor
    preprocessor = analyze_preprocessor()
    
    if preprocessor:
        # 3. Evaluate model
        evaluate_model_predictions(preprocessor)
        
        # 4. Test stock-specific scaling
        test_stock_specific_prediction(preprocessor)
    
    print("\n" + "=" * 80)
    print("DIAGNOSTICS COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()
