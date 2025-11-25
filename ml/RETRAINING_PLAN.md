# LSTM Model Retraining Plan
## Comprehensive Strategy to Fix Overfitting, Scaling, and Generalization Issues

**Date**: November 18, 2024  
**Current Model Version**: 0.0.1  
**Target**: Achieve financially useful predictions with proper generalization

---

## Executive Summary

**Current Issues**:
- ❌ R² = -70.10 (worse than random baseline)
- ❌ Sharpe Ratio = -4.05 (losing money)
- ❌ Win Rate = 34.21% (more losses than wins)
- ❌ Systematic underestimation by 2-3 KES

**Root Causes**:
1. **Scaling mismatch**: Training on 0.17-999.81 KES range, predicting on 13-19 KES
2. **No stock-specific learning**: Model can't learn individual stock patterns
3. **Potential overfitting**: Model trained on all data without proper validation
4. **No regularization**: Current model may be memorizing noise

**Solution**: Multi-phase retraining with proper validation, scaling, and regularization

---

## Phase 1: Data Preparation and Analysis (Week 1)

### 1.1 Data Quality Assessment

**Script**: `ml/scripts/analyze_training_data.py`

```python
"""
Analyze training data quality and prepare for retraining
"""

Tasks:
1. Check for missing data, outliers, and anomalies
2. Analyze price distributions per stock
3. Identify stocks with sufficient data (>500 samples)
4. Calculate statistics for scaling decisions
5. Split data into train/validation/test sets

Output:
- data_quality_report.json
- stock_statistics.csv
- recommended_stocks.txt
```

**Action Items**:
- [ ] Identify stocks with >500 trading days
- [ ] Remove stocks with excessive missing data (>20%)
- [ ] Flag outliers (prices >3 std from mean)
- [ ] Document data cleaning decisions

### 1.2 Train/Validation/Test Split Strategy

```
Historical Data Timeline:
├── Training Set (70%):    2013-2020 (7 years)
├── Validation Set (15%):  2021-2022 (2 years)  
└── Test Set (15%):        2023-2024 (2 years)

Why this split?
- Respects time order (no future leakage)
- Validation set for hyperparameter tuning
- Test set never seen during training
- Walk-forward validation within each set
```

**Implementation**:
```python
def split_by_time(data, train_ratio=0.7, val_ratio=0.15, test_ratio=0.15):
    """Split data respecting temporal order"""
    n = len(data)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    
    train = data[:train_end]
    val = data[train_end:val_end]
    test = data[val_end:]
    
    return train, val, test
```

---

## Phase 2: Model Architecture Review (Week 1-2)

### 2.1 Current Architecture Analysis

**Current Model** (`ml/pipeline/lstm_model.py`):
```python
Sequential([
    LSTM(50, return_sequences=True),
    Dropout(0.2),
    LSTM(50, return_sequences=False),
    Dropout(0.2),
    Dense(25),
    Dense(1)
])
```

**Issues**:
- ❌ No regularization (L1/L2)
- ❌ Dropout may be insufficient
- ❌ No batch normalization
- ❌ Fixed architecture for all stocks

### 2.2 Improved Architecture Options

**Option A: Enhanced LSTM with Regularization**
```python
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.regularizers import l2

def create_regularized_lstm(input_shape, l2_reg=0.01):
    """LSTM with proper regularization to prevent overfitting"""
    model = Sequential([
        LSTM(50, return_sequences=True, input_shape=input_shape,
             kernel_regularizer=l2(l2_reg),
             recurrent_regularizer=l2(l2_reg)),
        BatchNormalization(),
        Dropout(0.3),
        
        LSTM(50, return_sequences=False,
             kernel_regularizer=l2(l2_reg),
             recurrent_regularizer=l2(l2_reg)),
        BatchNormalization(),
        Dropout(0.3),
        
        Dense(25, activation='relu', kernel_regularizer=l2(l2_reg)),
        Dropout(0.2),
        Dense(1, activation='linear')  # Linear for price prediction
    ])
    
    model.compile(
        optimizer='adam',
        loss='huber',  # More robust to outliers than MSE
        metrics=['mae', 'mse']
    )
    
    return model
```

**Option B: Bidirectional LSTM** (Better for capturing patterns)
```python
from tensorflow.keras.layers import Bidirectional

def create_bidirectional_lstm(input_shape):
    """Bidirectional LSTM for better pattern recognition"""
    model = Sequential([
        Bidirectional(LSTM(32, return_sequences=True), input_shape=input_shape),
        BatchNormalization(),
        Dropout(0.3),
        
        Bidirectional(LSTM(32, return_sequences=False)),
        BatchNormalization(),
        Dropout(0.3),
        
        Dense(16, activation='relu'),
        Dense(1, activation='linear')
    ])
    
    return model
```

**Option C: Ensemble of Simpler Models**
```python
def create_simple_lstm_ensemble(input_shape, n_models=3):
    """Ensemble of simpler models often generalizes better"""
    models = []
    for i in range(n_models):
        model = Sequential([
            LSTM(32, input_shape=input_shape),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1)
        ])
        models.append(model)
    return models
```

**Recommendation**: Start with **Option A** (Enhanced LSTM) as it addresses overfitting directly.

---

## Phase 3: Scaling Strategy (Week 2)

### 3.1 Stock-Specific Scaling (Recommended)

**Why**: Each stock has unique price range and volatility

**Implementation**:
```python
class StockSpecificScaler:
    """Maintains separate scaler for each stock"""
    
    def __init__(self):
        self.scalers = {}
        self.stock_stats = {}
    
    def fit(self, stock_code, prices):
        """Fit scaler to specific stock's price range"""
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaler.fit(prices.reshape(-1, 1))
        
        self.scalers[stock_code] = scaler
        self.stock_stats[stock_code] = {
            'min': float(prices.min()),
            'max': float(prices.max()),
            'mean': float(prices.mean()),
            'std': float(prices.std())
        }
        
        return self
    
    def transform(self, stock_code, prices):
        """Transform using stock-specific scaler"""
        if stock_code not in self.scalers:
            raise ValueError(f"No scaler fitted for {stock_code}")
        return self.scalers[stock_code].transform(prices.reshape(-1, 1))
    
    def inverse_transform(self, stock_code, scaled_prices):
        """Inverse transform to original price range"""
        if stock_code not in self.scalers:
            raise ValueError(f"No scaler fitted for {stock_code}")
        return self.scalers[stock_code].inverse_transform(scaled_prices)
```

### 3.2 Alternative: Robust Scaling

**For stocks with outliers**:
```python
from sklearn.preprocessing import RobustScaler

# Uses median and IQR instead of min/max
# More robust to outliers
scaler = RobustScaler()
```

### 3.3 Normalization Strategy

**Option 1: MinMax (0-1)** - Current approach
- Pros: Bounded output, works well with sigmoid/tanh
- Cons: Sensitive to outliers

**Option 2: StandardScaler (z-score)**
- Pros: Not sensitive to outliers
- Cons: Unbounded, may not work well with default LSTM

**Option 3: Log-Return Scaling** - For high volatility stocks
```python
# Convert prices to log returns
returns = np.log(prices[1:] / prices[:-1])
scaled_returns = scaler.fit_transform(returns.reshape(-1, 1))
```

**Recommendation**: **MinMax (0-1) with stock-specific fitting**

---

## Phase 4: Training Strategy (Week 2-3)

### 4.1 Per-Stock Training Pipeline

**File**: `ml/train_pipeline_v2.py`

```python
"""
Version 2: Stock-specific training with proper validation
"""

def train_single_stock_model(
    stock_code: str,
    stock_data: pd.DataFrame,
    prediction_days: int = 60,
    validation_split: float = 0.15
):
    """
    Train model for specific stock with validation
    """
    
    # 1. Prepare data
    prices = stock_data['Day Price'].values
    
    # 2. Stock-specific scaling
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_prices = scaler.fit_transform(prices.reshape(-1, 1))
    
    # 3. Create sequences
    X, y = create_sequences(scaled_prices, prediction_days)
    
    # 4. Split into train/val (temporal order preserved)
    split_idx = int(len(X) * (1 - validation_split))
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    
    # 5. Create model with regularization
    model = create_regularized_lstm(
        input_shape=(prediction_days, 1),
        l2_reg=0.01
    )
    
    # 6. Early stopping and model checkpointing
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
    
    callbacks = [
        EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),
        ModelCheckpoint(
            f'models/{stock_code}_best.h5',
            monitor='val_loss',
            save_best_only=True,
            verbose=1
        )
    ]
    
    # 7. Train with validation
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=100,  # Early stopping will stop before
        batch_size=32,
        callbacks=callbacks,
        verbose=1
    )
    
    # 8. Evaluate on validation set
    val_metrics = evaluate_predictions(model, X_val, y_val, scaler)
    
    # 9. Walk-forward validation on training set
    wf_metrics = walk_forward_validate(model, X_train, y_train, scaler)
    
    return {
        'model': model,
        'scaler': scaler,
        'history': history.history,
        'val_metrics': val_metrics,
        'wf_metrics': wf_metrics
    }
```

### 4.2 Hyperparameter Tuning

**Parameters to tune**:
```python
hyperparams = {
    'prediction_days': [30, 60, 90],          # Sequence length
    'lstm_units': [32, 50, 64],               # LSTM hidden units
    'dropout_rate': [0.2, 0.3, 0.4],          # Dropout rate
    'l2_reg': [0.001, 0.01, 0.1],            # L2 regularization
    'learning_rate': [0.001, 0.0001],         # Adam learning rate
    'batch_size': [16, 32, 64]                # Batch size
}
```

**Tuning Strategy**:
```python
from sklearn.model_selection import ParameterGrid

def tune_hyperparameters(stock_code, stock_data):
    """Grid search for best hyperparameters"""
    
    best_score = float('inf')
    best_params = None
    
    # Reduced grid for faster tuning
    param_grid = {
        'prediction_days': [60],
        'lstm_units': [32, 50],
        'dropout_rate': [0.2, 0.3],
        'l2_reg': [0.01, 0.05]
    }
    
    for params in ParameterGrid(param_grid):
        # Train with these params
        result = train_with_params(stock_code, stock_data, params)
        
        # Evaluate on validation set
        val_loss = result['val_metrics']['mae']
        
        if val_loss < best_score:
            best_score = val_loss
            best_params = params
            logger.info(f"New best: {params} -> MAE={val_loss:.4f}")
    
    return best_params
```

### 4.3 Training Monitoring

**Track during training**:
```python
class TrainingMonitor(tf.keras.callbacks.Callback):
    """Monitor overfitting during training"""
    
    def on_epoch_end(self, epoch, logs=None):
        train_loss = logs['loss']
        val_loss = logs['val_loss']
        
        # Check for overfitting
        if val_loss > train_loss * 1.5:
            logger.warning(f"Epoch {epoch}: Possible overfitting detected")
            logger.warning(f"  Train loss: {train_loss:.4f}")
            logger.warning(f"  Val loss: {val_loss:.4f}")
```

---

## Phase 5: Preventing Overfitting (Week 3)

### 5.1 Regularization Techniques

**1. Dropout**
```python
# Increase dropout during training
Dropout(0.3)  # 30% of neurons randomly disabled

# Can also use SpatialDropout1D for sequences
from tensorflow.keras.layers import SpatialDropout1D
SpatialDropout1D(0.3)
```

**2. L2 Regularization**
```python
# Penalize large weights
LSTM(50, kernel_regularizer=l2(0.01), recurrent_regularizer=l2(0.01))
```

**3. Batch Normalization**
```python
# Normalize activations
BatchNormalization()
```

**4. Early Stopping**
```python
# Stop when validation loss stops improving
EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
```

**5. Data Augmentation**
```python
def augment_sequences(X, y, noise_level=0.01):
    """Add small noise to prevent memorization"""
    noise = np.random.normal(0, noise_level, X.shape)
    X_augmented = X + noise
    return X_augmented, y
```

### 5.2 Model Complexity Control

**Start simple, add complexity if needed**:

```python
# Phase 1: Simple baseline
model_v1 = Sequential([
    LSTM(32),
    Dense(1)
])

# Phase 2: Add dropout if overfitting
model_v2 = Sequential([
    LSTM(32),
    Dropout(0.2),
    Dense(1)
])

# Phase 3: Add more layers if underfitting
model_v3 = Sequential([
    LSTM(32, return_sequences=True),
    Dropout(0.2),
    LSTM(32),
    Dropout(0.2),
    Dense(1)
])
```

### 5.3 Cross-Validation Strategy

**Walk-Forward Cross-Validation**:
```python
def walk_forward_cv(data, n_splits=5):
    """
    Expanding window walk-forward validation
    """
    results = []
    min_train_size = len(data) // (n_splits + 1)
    
    for i in range(n_splits):
        # Expanding training window
        train_end = min_train_size * (i + 2)
        test_end = min(train_end + min_train_size, len(data))
        
        train_data = data[:train_end]
        test_data = data[train_end:test_end]
        
        # Train and evaluate
        model = train_model(train_data)
        metrics = evaluate_model(model, test_data)
        results.append(metrics)
    
    return aggregate_results(results)
```

---

## Phase 6: Validation and Testing (Week 3-4)

### 6.1 Validation Metrics

**Track multiple metrics**:
```python
def comprehensive_evaluation(y_true, y_pred):
    """Evaluate model comprehensively"""
    
    # Regression metrics
    mse = mean_squared_error(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_true, y_pred)
    mape = mean_absolute_percentage_error(y_true, y_pred)
    
    # Financial metrics
    sharpe = calculate_sharpe_ratio(y_true, y_pred)
    win_rate = calculate_win_rate(y_true, y_pred)
    dir_acc = directional_accuracy(y_true, y_pred)
    
    # Bias check
    residuals = y_pred - y_true
    bias = np.mean(residuals)
    
    return {
        'mse': mse, 'mae': mae, 'rmse': rmse, 'r2': r2, 'mape': mape,
        'sharpe': sharpe, 'win_rate': win_rate, 'dir_acc': dir_acc,
        'bias': bias
    }
```

### 6.2 Success Criteria

**Minimum requirements for deployment**:

| Metric | Minimum | Good | Excellent |
|--------|---------|------|-----------|
| R² | > 0.3 | > 0.5 | > 0.7 |
| MAPE | < 10% | < 5% | < 3% |
| Sharpe Ratio | > 0 | > 1.0 | > 2.0 |
| Win Rate | > 50% | > 55% | > 60% |
| Dir. Accuracy | > 52% | > 55% | > 60% |
| Bias | < 0.5 KES | < 0.2 KES | < 0.1 KES |

### 6.3 Out-of-Sample Testing

**Final test on 2024 data**:
```python
def final_test_on_2024_data(model, scaler, stock_code):
    """
    Test on completely unseen 2024 data
    Never used during training or validation
    """
    
    # Load 2024 data
    data_2024 = load_2024_data(stock_code)
    
    # Make predictions
    predictions = predict_with_model(model, scaler, data_2024)
    
    # Evaluate
    metrics = comprehensive_evaluation(
        data_2024['actual_prices'],
        predictions
    )
    
    # Check if financially useful
    is_useful = (
        metrics['sharpe'] > 1.0 and
        metrics['win_rate'] > 0.5 and
        metrics['r2'] > 0.5
    )
    
    return metrics, is_useful
```

---

## Phase 7: Implementation Plan (Week 4)

### 7.1 File Structure

```
ml/
├── pipeline/
│   ├── lstm_model.py              # Updated with regularization
│   └── lstm_model_v2.py           # New enhanced architecture
├── processing/
│   ├── stock_scaler.py            # New: Stock-specific scaling
│   ├── data_splitter.py           # New: Temporal data splitting
│   └── augmentation.py            # New: Data augmentation
├── training/
│   ├── train_stock_specific.py    # Main training script
│   ├── hyperparameter_tuning.py   # Grid search
│   └── training_monitor.py        # Training callbacks
├── validation/
│   ├── walk_forward.py            # Existing
│   ├── cross_validation.py        # New: CV strategies
│   └── metrics.py                 # Comprehensive metrics
├── scripts/
│   ├── analyze_training_data.py   # Data quality check
│   ├── train_all_stocks.py        # Batch training
│   └── evaluate_models.py         # Model comparison
└── configs/
    ├── model_config.yaml           # Model hyperparameters
    └── training_config.yaml        # Training settings
```

### 7.2 Training Workflow

```bash
# Step 1: Analyze data quality
python3 ml/scripts/analyze_training_data.py

# Step 2: Tune hyperparameters (on sample stock)
python3 ml/training/hyperparameter_tuning.py --stock SCOM

# Step 3: Train stock-specific models
python3 ml/scripts/train_all_stocks.py --config configs/training_config.yaml

# Step 4: Evaluate and compare
python3 ml/scripts/evaluate_models.py --test-year 2024

# Step 5: Select best models for deployment
python3 ml/scripts/select_production_models.py
```

### 7.3 Configuration Files

**model_config.yaml**:
```yaml
model:
  architecture: regularized_lstm
  prediction_days: 60
  
  layers:
    lstm1:
      units: 50
      return_sequences: true
      l2_reg: 0.01
    dropout1:
      rate: 0.3
    lstm2:
      units: 50
      return_sequences: false
      l2_reg: 0.01
    dropout2:
      rate: 0.3
    dense1:
      units: 25
      activation: relu
      l2_reg: 0.01
    dropout3:
      rate: 0.2
    output:
      units: 1
      activation: linear
  
  optimizer:
    type: adam
    learning_rate: 0.001
  
  loss: huber
  metrics: [mae, mse]
```

**training_config.yaml**:
```yaml
training:
  epochs: 100
  batch_size: 32
  validation_split: 0.15
  
  callbacks:
    early_stopping:
      monitor: val_loss
      patience: 10
      restore_best_weights: true
    
    model_checkpoint:
      monitor: val_loss
      save_best_only: true
    
    reduce_lr:
      monitor: val_loss
      factor: 0.5
      patience: 5
      min_lr: 0.00001

data:
  min_samples: 500
  outlier_threshold: 3.0
  test_split: 0.15
  
stocks:
  # Train on liquid stocks
  target_stocks:
    - SCOM
    - EQTY
    - KCB
    - BAMB
    - EABL
    - COOP
    - SCBK
    - ABSA
    - SBIC
    - NCBA
```

---

## Phase 8: Deployment Strategy (Week 4-5)

### 8.1 Model Selection Criteria

**Per-stock model selection**:
```python
def select_best_model(stock_code, candidates):
    """
    Select best model based on multiple criteria
    """
    scores = []
    
    for model_id, metrics in candidates.items():
        # Weighted score
        score = (
            0.3 * normalize(metrics['r2'], 0, 1) +
            0.3 * normalize(metrics['sharpe'], 0, 2) +
            0.2 * normalize(metrics['win_rate'], 0.5, 0.7) +
            0.2 * (1 - normalize(metrics['mape'], 0, 0.1))
        )
        scores.append((model_id, score))
    
    best_model_id = max(scores, key=lambda x: x[1])[0]
    return best_model_id
```

### 8.2 A/B Testing

**Gradual rollout**:
```python
# Week 1: Test on 10% of requests
if random.random() < 0.1:
    prediction = new_model.predict(data)
else:
    prediction = old_model.predict(data)

# Week 2: Increase to 50%
# Week 3: Increase to 100% if metrics good
```

### 8.3 Monitoring

**Track in production**:
```python
class PredictionMonitor:
    """Monitor predictions vs actuals in production"""
    
    def log_prediction(self, stock_code, predicted, actual, timestamp):
        """Log prediction for monitoring"""
        error = abs(predicted - actual)
        pct_error = error / actual * 100
        
        metrics = {
            'stock': stock_code,
            'predicted': predicted,
            'actual': actual,
            'error': error,
            'pct_error': pct_error,
            'timestamp': timestamp
        }
        
        # Alert if error too high
        if pct_error > 10:
            self.alert(f"High error for {stock_code}: {pct_error:.2f}%")
        
        return metrics
```

---

## Timeline and Resource Allocation

### Week 1: Data Preparation & Architecture
- [ ] Data quality analysis (2 days)
- [ ] Train/val/test split (1 day)
- [ ] Architecture review and implementation (2 days)

### Week 2: Training Infrastructure
- [ ] Implement stock-specific scaling (1 day)
- [ ] Build training pipeline v2 (2 days)
- [ ] Hyperparameter tuning (2 days)

### Week 3: Training & Validation
- [ ] Train models for top 10 stocks (2 days)
- [ ] Walk-forward validation (1 day)
- [ ] Overfitting analysis and fixes (2 days)

### Week 4: Testing & Selection
- [ ] Out-of-sample testing on 2024 data (1 day)
- [ ] Model comparison and selection (1 day)
- [ ] Documentation and handoff (1 day)
- [ ] Production deployment prep (2 days)

### Week 5: Deployment & Monitoring
- [ ] Deploy to staging (1 day)
- [ ] A/B testing setup (1 day)
- [ ] Gradual rollout (3 days)

**Total**: ~5 weeks

---

## Expected Outcomes

### Before (Current Model)
- R²: -70.10
- Sharpe: -4.05
- Win Rate: 34.21%
- Status: ❌ Not financially useful

### After (Target with Stock-Specific Training)
- R²: 0.50 - 0.75
- Sharpe: 0.8 - 1.5
- Win Rate: 52% - 58%
- Status: ✓ Financially useful

### Best Case (With Full Pipeline)
- R²: 0.70 - 0.85
- Sharpe: 1.2 - 2.0
- Win Rate: 55% - 62%
- Status: ✓✓ Excellent for trading

---

## Risk Mitigation

### Risk 1: Insufficient Data for Some Stocks
**Mitigation**: Focus on 10 most liquid stocks first, expand later

### Risk 2: Still Overfits After Regularization
**Mitigation**: 
- Use simpler model (fewer layers)
- Increase dropout to 0.4-0.5
- Add more data augmentation
- Consider ensemble methods

### Risk 3: Poor Performance Persists
**Mitigation**:
- Try different architectures (GRU, Transformer)
- Use different features (technical indicators)
- Consider hybrid model (LSTM + GARCH)

### Risk 4: Long Training Time
**Mitigation**:
- Use GPU acceleration
- Parallelize training across stocks
- Reduce hyperparameter search space

---

## Success Metrics

### Technical Success
- [ ] R² > 0.5 on validation set
- [ ] MAPE < 5% on test set
- [ ] No overfitting (train/val loss ratio < 1.5)
- [ ] Passes walk-forward validation

### Financial Success
- [ ] Sharpe ratio > 1.0
- [ ] Win rate > 50%
- [ ] Positive returns on test period
- [ ] Max drawdown < 15%

### Operational Success
- [ ] Training completes in < 2 hours per stock
- [ ] Prediction latency < 100ms
- [ ] Model size < 50MB per stock
- [ ] Easy to retrain and update

---

## Next Steps

1. **Review and Approve Plan** (This document)
2. **Set Up Development Environment**
   ```bash
   cd /Users/reinhard/portfolio-optimization-system/ml
   git checkout -b lstm-retraining-v2
   ```

3. **Start Phase 1** (Data Preparation)
   ```bash
   python3 scripts/analyze_training_data.py
   ```

4. **Weekly Progress Reviews**
   - End of Week 1: Data ready, architecture finalized
   - End of Week 2: Training pipeline working
   - End of Week 3: Models trained and validated
   - End of Week 4: Best models selected
   - End of Week 5: Deployed to production

---

**Document Version**: 1.0  
**Last Updated**: November 18, 2024  
**Next Review**: Start of each week during implementation
