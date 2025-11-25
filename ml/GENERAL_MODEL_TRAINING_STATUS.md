# General Model Training - Status Update

## ✅ Training in Progress!

**Started**: 2024-11-18 22:36:53  
**Status**: Epoch 26/100 (training...)  
**Expected completion**: ~2 hours

## Training Configuration

### Model Architecture
```
Stock ID → Embedding(10 dim)
           ↓
Price Seq → LSTM(50) → LSTM(50) → Dropout(0.2)
           ↓
Concatenate [embedding + LSTM output]
           ↓
Dense(25) → Dropout(0.2) → Dense(1)
```

### Training Data
- **Stocks**: 50 (excluded top 15)
- **Total samples**: ~15,750
- **Train**: 12,600 (80%)
- **Val**: 1,575 (10%)
- **Test**: 1,575 (10%)
- **Date range**: 2023-01-03 to 2024-10-31
- **Sequence length**: 60 days
- **Batch size**: 32

### Excluded Top 15 Stocks
```
Banking:         SCOM, EQTY, KCB, COOP, ABSA, SCBK
Manufacturing:   EABL, BAT, UNGA
Insurance:       BRIT, JUB, CIC
Construction:    BAMB, ARM
Services:        NMG
```
*These will get dedicated stock-specific models later*

### Included 50 Stocks (General Model)
All other NSE stocks not in top 15 list.

## Current Training Progress

```
Epoch 26/100
Loss:     0.0123
MAE:      0.0781
Val Loss: 0.0088 (improving!)
Val MAE:  0.0574
```

**Best checkpoint**: Epoch 22, val_loss = 0.00844

## Expected Results

Based on validation metrics so far:

| Metric | Target | Current (Epoch 26) |
|--------|--------|-------------------|
| Test MAPE | 8-12% | ~10% (estimated) |
| Test MAE | 0.05-0.08 | 0.0781 |
| Model Type | General (50 stocks) | ✅ |
| Log Transform | Yes | ✅ |

## Output Files (When Complete)

```
ml/trained_models/general_v4_log/
├── general_v4_log_best.h5         # Model weights
├── scalers.joblib                  # LogPriceScaler for each stock
├── stock_id_mapping.json           # Stock symbol → ID mapping
└── metadata.json                   # Training metadata
```

## Next Steps (After Training)

### 1. Validate General Model (~30 min)
```bash
python3 ml/scripts/validate_general_model_v4.py
```

Expected MAPE: 8-12%

### 2. Update Model Registry (~15 min)
- Add general model loading to `model_registry.py`
- Implement fallback logic (specific → general)
- Test hybrid routing

### 3. Update API Endpoints (~15 min)
- Modify `/api/v4/predict` to use hybrid approach
- Return `model_type` in response ("stock_specific" or "general")
- Add confidence levels

### 4. Test Complete System (~30 min)
```bash
# Start API server
cd ml && tox -e serve-dev

# Test predictions for all 66 stocks
python3 test_api_v4.py
python3 test_hybrid_predictions.py
```

### 5. Document Results (~15 min)
- Create performance matrix (all 66 stocks)
- Document MAPE per stock
- Update API integration guide

## Hybrid System Architecture

```
User Request: {"symbol": "XYZ"}
         ↓
    Is XYZ in top 15?
         ↓
    YES → Load stock-specific model
          MAPE: 2-8%
          Status: "high confidence"
         ↓
    NO → Load general model
         MAPE: 8-12%
         Status: "medium confidence"
         ↓
    Return prediction with metadata
```

## Coverage After General Model

| Category | Count | Coverage |
|----------|-------|----------|
| Stock-specific models | 5/15 | 33% of top 15 |
| General model stocks | 50 | 100% |
| **Total coverage** | **55/66** | **83%** |
| Missing (low liquidity) | 11 | 17% |

**After training top 15**: 66/66 = 100% coverage ✅

## Time Estimates

### Today (Remaining)
- General model training: ~2 hours (in progress)
- Validation: 30 min
- Registry update: 15 min
- API update: 15 min
- Testing: 30 min
- **Total**: ~3.5 hours

### This Week
- Train remaining 10 stock-specific models: ~5 hours
- Final validation & documentation: 1 hour
- **Total**: ~6 hours

## Performance Expectations

### General Model (50 stocks)
- **MAPE**: 8-12%
- **Latency**: 25-50ms (always cached)
- **Memory**: ~100MB
- **Confidence**: Medium
- **Use case**: Less-liquid stocks, fallback

### Stock-Specific (Top 15)
- **MAPE**: 2-8%
- **Latency**: 25-100ms (LRU cached)
- **Memory**: ~50MB per model
- **Confidence**: High
- **Use case**: High-volume stocks

## Validation Checklist

When training completes, verify:

- [ ] Model file created (~50-100MB)
- [ ] Scalers saved for all 50 stocks
- [ ] Stock ID mapping JSON exists
- [ ] Metadata contains test MAPE
- [ ] Test MAPE < 15% (target: 8-12%)
- [ ] Model loads successfully
- [ ] Predictions are reasonable (no absurd values)
- [ ] All 50 stocks work with general model

## Questions to Answer (Post-Training)

1. What's the actual test MAPE?
2. Which stocks perform best/worst?
3. Do we need to exclude any stocks?
4. Should we adjust the top 15 list?
5. Is the embedding size (10) sufficient?

## Monitoring

To check training progress:
```bash
tail -f /tmp/general_model_training.log
```

To see if training is complete:
```bash
ls -lh ml/trained_models/general_v4_log/
```

---

**Status**: ⏳ Training in progress (Epoch 26/100)  
**ETA**: ~1.5-2 hours  
**Next action**: Wait for training to complete, then validate

---

## Ready for API Integration

Once training completes and validation passes:

1. Update `model_registry.py` with general model support
2. Update `stock_predict_v4.py` with hybrid routing
3. Test all 66 stocks via API
4. Document final performance matrix
5. Proceed with frontend integration

**Goal**: 100% NSE stock coverage with hybrid approach ✅
