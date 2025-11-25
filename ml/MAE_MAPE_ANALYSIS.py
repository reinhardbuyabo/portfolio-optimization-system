"""
Analysis: Why MAE/MAPE Are High and How to Fix Them

Current Issues:
--------------
1. MAE = 7.52 KES on validation (too high)
2. MAPE = 58.71% (extremely high)
3. Data range [5.1, 44.95] KES is much wider than recent prices [13-19 KES]
4. Only 6 epochs with quick test (model undertrained)

Root Causes:
-----------
1. **Wide Historical Range**: SCOM traded 5-45 KES historically, now 13-19 KES
   - Model learns patterns from old high-volatility period
   - Predictions don't match current low-volatility regime
   
2. **Sequence Length**: 60 days may be too long
   - Older patterns less relevant
   - Try 30 or 45 days
   
3. **Training Duration**: Only 6 epochs
   - Model hasn't converged
   - Need 30-50 epochs minimum
   
4. **No Regime Detection**: Model treats all periods equally
   - Different market regimes need different predictions

Solutions:
---------
"""

# Solution 1: Use Recent Data Only (Last 2-3 years)
def filter_recent_data(stock_data, years=2):
    """Use only recent data to match current market regime"""
    stock_data['Date'] = pd.to_datetime(stock_data['Date'])
    cutoff_date = stock_data['Date'].max() - pd.Timedelta(days=365*years)
    recent_data = stock_data[stock_data['Date'] >= cutoff_date]
    return recent_data

# Solution 2: Multiple Sequence Lengths
def create_multi_scale_features(prices, seq_lengths=[30, 45, 60]):
    """Try different sequence lengths, pick best"""
    results = {}
    for seq_len in seq_lengths:
        X, y = create_sequences(prices, seq_len)
        results[seq_len] = (X, y)
    return results

# Solution 3: Detrend Prices (Learn Returns Instead)
def use_returns_instead_of_prices(prices):
    """
    Instead of predicting prices, predict returns
    Returns are more stationary and easier to learn
    """
    returns = np.log(prices[1:] / prices[:-1])
    return returns

# Solution 4: Ensemble of Models
def create_ensemble(n_models=3):
    """Train multiple models, average predictions"""
    models = []
    for i in range(n_models):
        model = create_regularized_lstm(
            input_shape=(60, 1),
            lstm_units=50 + i*10,  # Vary architecture
            dropout_rate=0.3 + i*0.05
        )
        models.append(model)
    return models

# Solution 5: Add Technical Indicators as Features
def add_technical_features(prices):
    """
    Add moving averages, RSI, etc. as additional features
    Helps model understand trends and momentum
    """
    import pandas as pd
    
    df = pd.DataFrame({'price': prices})
    
    # Moving averages
    df['ma_5'] = df['price'].rolling(5).mean()
    df['ma_20'] = df['price'].rolling(20).mean()
    
    # Price changes
    df['returns'] = df['price'].pct_change()
    df['volatility'] = df['returns'].rolling(20).std()
    
    # Relative position in recent range
    df['price_position'] = (df['price'] - df['price'].rolling(60).min()) / \
                           (df['price'].rolling(60).max() - df['price'].rolling(60).min())
    
    return df.dropna()

# Solution 6: Better Loss Function for MAPE
from tensorflow.keras import backend as K

def mape_loss(y_true, y_pred):
    """Custom MAPE loss function"""
    diff = K.abs((y_true - y_pred) / K.clip(K.abs(y_true), K.epsilon(), None))
    return 100. * K.mean(diff)

def combined_loss(y_true, y_pred):
    """Combine MAE and MAPE"""
    mae = K.mean(K.abs(y_true - y_pred))
    mape = K.mean(K.abs((y_true - y_pred) / K.clip(K.abs(y_true), K.epsilon(), None)))
    return mae + 0.5 * mape

# Recommended Quick Fixes:
# -----------------------
# 1. Filter to last 2 years only (current regime)
# 2. Try sequence length = 30 days
# 3. Train for 50-100 epochs (not 6!)
# 4. Use combined loss (MAE + MAPE)
# 5. Add moving average features
