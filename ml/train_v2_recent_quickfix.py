"""
Quick Fix: Train V2 on Recent Data Only
Should achieve MAE < 1.5 KES immediately
"""
from train_pipeline_v2 import train_stock_model
from processing.data_manager import load_dataset
import pandas as pd
from config.core import settings

# Load SCOM data
data = load_dataset()
stock_col = 'CODE'
date_col = 'DATE'

scom = data[data[stock_col] == 'SCOM'].copy()
scom[date_col] = pd.to_datetime(scom[date_col], format='%d-%b-%y', errors='coerce')
scom = scom.dropna(subset=[date_col])
scom = scom.sort_values(date_col)

# Use only recent 500 samples (~2 years)
scom_recent = scom.tail(500)

print(f'Training on recent data only: {len(scom_recent)} samples')
print(f'Date range: {scom_recent[date_col].min()} to {scom_recent[date_col].max()}')
prices = scom_recent['Day Price'].dropna().values
print(f'Price range: [{prices.min():.2f}, {prices.max():.2f}] KES')
print(f'Price std: {prices.std():.2f} KES')

# Train V2 model on recent data with shorter sequences
result = train_stock_model(
    stock_code='SCOM_recent',
    stock_data=scom_recent,
    prediction_days=30,  # Shorter sequences
    epochs=50,
    batch_size=32,
    early_stopping_patience=15
)

if result:
    print(f"\n{'='*80}")
    print("RESULTS - V2 MODEL ON RECENT DATA")
    print(f"{'='*80}")
    print(f"MAE: {result['val_metrics']['mae']:.2f} KES")
    print(f"MAPE: {result['val_metrics']['mape']:.2f}%")
    print(f"R²: {result['val_metrics']['r2']:.4f}")
    print(f"Negative predictions: {result['val_metrics']['negative_ratio']*100:.2f}%")
    
    wf = result.get('wf_metrics', {})
    if wf:
        print(f"\nWalk-forward metrics:")
        print(f"Sharpe ratio: {wf.get('sharpe_ratio_mean', 0):.2f}")
        print(f"Win rate: {wf.get('win_rate_mean', 0)*100:.1f}%")
