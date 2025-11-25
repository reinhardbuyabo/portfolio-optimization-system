# Training Remaining Top 15 Stock-Specific Models

**Date:** November 19, 2024  
**Status:** 5/15 Complete, 10 Remaining  
**Priority:** High

---

## Current Status

### ✅ Trained (5 stocks)
- **SCOM** (Safaricom) - MAPE: 8.95%, Sharpe: 13.27
- **EQTY** (Equity Group) - MAPE: 4.69%, Sharpe: 12.15
- **KCB** (KCB Group) - MAPE: 4.89%, Sharpe: 7.42
- **BAMB** (Bamburi) - MAPE: 3.45%, Sharpe: 8.01
- **EABL** (East African Breweries) - MAPE: 2.87%, Sharpe: 8.02

### 📋 Need Training (10 stocks)
1. **ABSA** (Absa Bank Kenya)
2. **BRIT** (Britam Holdings)
3. **CIC** (CIC Insurance Group)
4. **COOP** (Co-operative Bank)
5. **DTK** (Diamond Trust Bank Kenya)
6. **KEGN** (Kenya Electricity Generating Company)
7. **KPLC** (Kenya Power & Lighting)
8. **NBK** (National Bank of Kenya)
9. **NCBA** (NCBA Group)
10. **SCBK** (Standard Chartered Bank Kenya)
11. **TOTL** (TotalEnergies Marketing Kenya)

---

## Why Train More Stock-Specific Models?

### Current Situation
- **V4 Stock-Specific**: Only 5 stocks (9% coverage)
- **V4 General Model**: 50 stocks (91% coverage)
- **Total Coverage**: 55 stocks

### Benefits of Training Top 15
- **Better Coverage**: 15/55 = 27% with high-accuracy models
- **Better Accuracy**: Stock-specific models perform 2-4x better than general
- **Higher Trading Value**: Top 15 represent most actively traded NSE stocks
- **User Confidence**: Better predictions for popular stocks

### Performance Comparison

| Model Type | MAPE | Use Case |
|------------|------|----------|
| Stock-Specific (current 5) | 2-9% | Critical trading decisions |
| Stock-Specific (target 15) | 2-10% (est.) | Popular stocks |
| General Model | ~4.5% | Other stocks |
| V1 General | ~15-20% | Fallback only |

---

## Training Instructions

### Quick Start

```bash
# 1. Navigate to ML directory
cd ml

# 2. List stocks that need training
python3 train_remaining_top15.py --list

# 3. Dry run (see what would happen)
python3 train_remaining_top15.py --dry-run

# 4. Train all remaining stocks
python3 train_remaining_top15.py

# 5. Train specific stocks only
python3 train_remaining_top15.py --stocks ABSA COOP TOTL
```

### Using Tox (Recommended)

```bash
# Train all remaining top 15 stocks
cd ml
tox -e train-remaining-top15

# Or directly with Python
python3 train_remaining_top15.py
```

---

## Estimated Training Time

### Per Stock
- **Data Loading**: ~30 seconds
- **Model Training**: ~5-10 minutes (50 epochs with early stopping)
- **Evaluation**: ~1 minute
- **Total per stock**: ~7-12 minutes

### All 10 Stocks
- **Total Time**: ~70-120 minutes (1-2 hours)
- **Sequential**: One stock at a time
- **Recommended**: Run overnight or during off-hours

### Resource Requirements
- **CPU**: Modern multi-core processor
- **RAM**: 4-8 GB
- **Disk**: ~500 MB for models and metadata
- **GPU**: Optional (speeds up training 2-3x)

---

## Training Configuration

### Model Architecture
```python
sequence_length = 60      # Last 60 days
epochs = 50              # Max epochs
batch_size = 32          # Batch size
patience = 10            # Early stopping patience
```

### Data Preprocessing
- **Log transformation**: `log(price + 1)`
- **MinMax scaling**: Per-stock scaling (0-1)
- **Train/Test split**: 80/20
- **Validation**: Walk-forward validation

### Output Files (Per Stock)
```
trained_models/stock_specific_v4_log/
  ├── {STOCK}_best.h5              # Trained model weights
  ├── {STOCK}_log_scaler.joblib    # Scaler for predictions
  └── {STOCK}_metadata.json        # Model metadata (MAPE, Sharpe, etc.)
```

---

## Monitoring Training

### Progress Logs
```bash
# Watch training progress
tail -f logs/training.log

# Or run with verbose output
python3 train_remaining_top15.py
```

### Expected Output
```
Training Stock-Specific V4 Models
==================================================
Total stocks to train: 10
Stocks: ABSA, BRIT, CIC, COOP, DTK, KEGN, KPLC, NBK, NCBA, SCBK, TOTL

--------------------------------------------------
Training 1/10: ABSA
--------------------------------------------------
Loading data for ABSA...
  Loaded 2649 records (2013-2024)
  Price range: [7.15, 18.75] KES

Training model...
Epoch 1/50 - loss: 0.0234 - val_loss: 0.0198
Epoch 2/50 - loss: 0.0187 - val_loss: 0.0165
...
Early stopping at epoch 23

Evaluating model...
  Test MAPE: 3.45%
  Sharpe Ratio: 5.23
  
✓ ABSA training complete!
```

---

## Validation and Testing

### After Training Complete

```bash
# 1. Verify all models exist
ls -lh trained_models/stock_specific_v4_log/*.h5

# 2. Check model metadata
cat trained_models/stock_specific_v4_log/ABSA_metadata.json

# 3. Test predictions
python3 -c "
from api.v4_registry import V4StockRegistry
registry = V4StockRegistry()
registry.refresh()
print(f'Total models: {registry.total_coverage}')
print(f'Specific models: {registry.specific_model_count}')
print(f'Available stocks: {registry.get_available_stocks()[:20]}')
"

# 4. Test single prediction
curl -X POST http://localhost:8000/api/v4/predict \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "ABSA",
    "horizon": "10d",
    "recent_prices": [...]
  }'
```

---

## Troubleshooting

### Issue: Insufficient Data
```
Error: Not enough data for STOCK (need 60+ samples)
```

**Solution:** Check CSV files in `data/nse/{STOCK}/`
```bash
ls -lh data/nse/ABSA/*.csv
```

### Issue: Memory Error
```
MemoryError: Unable to allocate array
```

**Solution:** Reduce batch size or train stocks one at a time
```python
# train_remaining_top15.py, line 80
batch_size=16  # Reduce from 32 to 16
```

### Issue: Training Too Slow
```
Each epoch taking 30+ seconds
```

**Solution:** 
1. Reduce sequence length
2. Use GPU if available
3. Reduce number of epochs

### Issue: Model Not Loading in API
```
No model found for symbol 'ABSA'
```

**Solution:** Refresh model registry
```bash
curl -X POST http://localhost:8000/api/v4/refresh
```

---

## Expected Results

### Model Performance Targets

| Stock | Expected MAPE | Expected Sharpe | Priority |
|-------|---------------|-----------------|----------|
| TOTL  | ~3-5% | High | ⭐⭐⭐ High |
| COOP  | ~4-6% | Medium | ⭐⭐⭐ High |
| KEGN  | ~5-8% | Low | ⭐⭐ Medium |
| KPLC  | ~6-10% | Low | ⭐⭐ Medium |
| NCBA  | ~4-6% | Medium | ⭐⭐ Medium |
| ABSA  | ~4-6% | Medium | ⭐ Low |
| BRIT  | ~5-8% | Medium | ⭐ Low |
| CIC   | ~6-10% | Low | ⭐ Low |
| DTK   | ~8-12% | Low | ⭐ Low |
| NBK   | ~10-15% | Very Low | ⭐ Low |
| SCBK  | ~6-8% | Medium | ⭐ Low |

### Coverage After Training

```
Stock-Specific Models: 15 stocks (27% of portfolio)
General Model: 40 stocks (73% of portfolio)
Total Coverage: 55 stocks (100%)

High-Quality Predictions: 15/55 = 27%
Good Predictions: 40/55 = 73%
Poor Predictions: 0/55 = 0%
```

---

## Post-Training Steps

### 1. Update Documentation
```bash
# Update model count in docs
docs/v4-integration/README.md
docs/v4-integration/SUMMARY.md
docs/v4-integration/MIGRATION_STATUS.md
```

### 2. Refresh API
```bash
# Restart ML service to load new models
cd ml
tox -e serve-dev

# Or refresh registry
curl -X POST http://localhost:8000/api/v4/refresh
```

### 3. Update Frontend
No changes needed! The hybrid V4/V1 system will automatically:
- Use new stock-specific models for the 10 additional stocks
- Fall back to general model for remaining stocks
- Show improved accuracy in predictions

### 4. Test Integration
```bash
# Test batch predictions with new stocks
./test-v4-integration.sh

# Test specific stock
npm run dev
# Navigate to /stock-analysis
# Select ABSA, COOP, or TOTL
# Click "Run LSTM"
```

---

## Priority Recommendations

### High Priority (Train First)
1. **TOTL** - High trading volume, good data quality
2. **COOP** - Major bank, stable performance
3. **NCBA** - Active trading, good liquidity

### Medium Priority
4. **KEGN** - Utility stock, stable
5. **KPLC** - High volume, but volatile
6. **ABSA** - Bank stock, good history

### Lower Priority
7. **BRIT** - Insurance, less critical
8. **CIC** - Insurance, lower volume
9. **DTK** - Bank, moderate activity
10. **NBK** - Lowest priority, less active
11. **SCBK** - International bank, less data

---

## Alternative: Phased Training

If you can't train all 10 at once:

### Phase 1 (30-40 mins)
```bash
python3 train_remaining_top15.py --stocks TOTL COOP NCBA
```

### Phase 2 (30-40 mins)
```bash
python3 train_remaining_top15.py --stocks KEGN KPLC ABSA
```

### Phase 3 (30-40 mins)
```bash
python3 train_remaining_top15.py --stocks BRIT CIC DTK NBK SCBK
```

---

## Success Criteria

✅ All 15 models trained and saved  
✅ Metadata files generated for each model  
✅ Test MAPE < 15% for all models  
✅ Models load successfully in V4 API  
✅ Predictions working in frontend  
✅ Documentation updated  

---

## Next Steps

1. **Run training script**
   ```bash
   cd ml
   python3 train_remaining_top15.py
   ```

2. **Monitor progress** (1-2 hours)

3. **Verify models trained**
   ```bash
   ls trained_models/stock_specific_v4_log/*.h5 | wc -l
   # Should show 15 (currently shows 5)
   ```

4. **Refresh API and test**
   ```bash
   curl -X POST http://localhost:8000/api/v4/refresh
   ```

5. **Update documentation** with new model counts

---

**Ready to start training?**

```bash
cd ml && python3 train_remaining_top15.py
```

---

*Last Updated: November 19, 2024*  
*Status: Ready for Training*  
*Estimated Time: 1-2 hours*
