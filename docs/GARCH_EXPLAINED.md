# Understanding GARCH in the Portfolio Optimization System

## What is GARCH?

**GARCH** stands for **Generalized Autoregressive Conditional Heteroskedasticity**. 

In simple terms: GARCH is a statistical model that predicts **how volatile (risky)** a stock will be in the future.

## Why Do We Need It?

While **LSTM predicts the price** of a stock (e.g., "SCOM will be 16.50 KES tomorrow"), **GARCH predicts the risk** (e.g., "SCOM's volatility will be 25% annually").

### Key Insight
**Stock prices don't move at a constant rate.** Some periods are calm, others are chaotic:
- During calm periods: Small daily price changes (low volatility)
- During crisis periods: Large daily swings (high volatility)

GARCH helps predict which type of period is coming.

## How GARCH Works

### The Core Concept: "Volatility Clustering"

GARCH is based on the observation that **volatility clusters together**:
- If yesterday was volatile, today is likely to be volatile too
- If the market has been calm, it will probably stay calm

**Example:**
```
Calm Period:  ±0.5%, ±0.3%, ±0.4%  (small daily changes)
Volatile:     ±3.2%, ±4.1%, ±2.8%  (large daily changes)
```

### The Model

GARCH models volatility as a function of:

1. **Recent volatility** (autoregressive part)
   - How volatile were the last few days?
   
2. **Recent shocks** (moving average part)
   - Were there any big unexpected price movements?

3. **Long-term average** (baseline volatility)
   - What's the "normal" volatility for this stock?

### Mathematical Formula (Simplified)

```
Tomorrow's Variance = ω + α × (Today's Shock²) + β × (Today's Variance)
```

Where:
- **ω (omega)**: Long-term average volatility
- **α (alpha)**: Weight on recent shocks (news/events)
- **β (beta)**: Weight on past volatility (persistence)

**Typical Values:**
- α ≈ 0.1 (10% weight on recent shocks)
- β ≈ 0.85 (85% weight on past volatility)
- α + β ≈ 0.95 (volatility is highly persistent)

## In Our System

### What Our GARCH Implementation Does

1. **Receives**: Log returns (daily price changes) for a stock
   ```python
   log_returns = [0.012, -0.008, 0.015, ...]  # % daily changes
   ```

2. **Trains**: Fits a GARCH(1,1) model to historical data
   - Finds optimal α, β, ω parameters
   - Learns the stock's volatility patterns

3. **Predicts**: Forecasts the next period's variance
   ```python
   forecasted_variance = 0.0012  # daily variance
   ```

4. **Returns**: Annualized volatility (for easier interpretation)
   ```python
   volatility_annualized = sqrt(variance × 252) = 0.174 = 17.4%
   ```

### Example Output

```json
{
  "symbol": "SCOM",
  "forecasted_variance": 0.00012,
  "volatility_annualized": 0.174,
  "execution_time": 0.023
}
```

**Interpretation:**
- SCOM is expected to have 17.4% annualized volatility
- This means on average, the stock could swing up or down by ~17.4% over a year
- Daily volatility ≈ 17.4% / √252 ≈ 1.1% per day

## Why This Matters for Portfolio Optimization

### Risk Assessment
```
Stock A: Expected Return = 15%, Volatility = 25% (High Risk)
Stock B: Expected Return = 12%, Volatility = 10% (Low Risk)
```

Which is better? It depends on your risk tolerance!

### Sharpe Ratio
GARCH volatility is used to calculate the **Sharpe Ratio**:

```
Sharpe Ratio = (Expected Return - Risk-Free Rate) / Volatility
```

**Example:**
```
Stock with LSTM prediction: +10% return
Stock with GARCH forecast: 20% volatility
Risk-free rate: 3%

Sharpe Ratio = (10% - 3%) / 20% = 0.35
```

**Higher Sharpe Ratio = Better risk-adjusted return**

### Portfolio Diversification

GARCH helps answer:
- "Which stocks are currently most volatile?"
- "Should I reduce my position in high-volatility stocks?"
- "Is now a good time to rebalance?"

## Visual Example: Volatility Over Time

```
High Volatility Period (Crisis):
Price: 15.00 → 18.50 → 14.20 → 17.80 → 13.50
Daily Changes: ±12%, ±15%, ±11%, ±13%
GARCH Forecast: 45% annualized volatility ⚠️

Low Volatility Period (Calm):
Price: 15.00 → 15.20 → 15.10 → 15.30 → 15.25
Daily Changes: ±1.3%, ±0.7%, ±1.5%, ±0.3%
GARCH Forecast: 12% annualized volatility ✅
```

## GARCH vs LSTM: What's the Difference?

| Aspect | LSTM | GARCH |
|--------|------|-------|
| **Predicts** | Price direction & level | Risk & volatility |
| **Output** | "16.50 KES" | "25% volatility" |
| **Answers** | "Where is the price going?" | "How risky is this stock?" |
| **Use Case** | Trading signals | Risk management |
| **Chart** | Price trend line | Volatility cone |
| **Metric** | Expected return | Standard deviation |

### Together They Provide:
- **LSTM**: "SCOM will rise to 17.50 KES (↑6%)"
- **GARCH**: "But volatility is high at 30%, so it's risky"
- **Decision**: "Good return, but too risky for my conservative portfolio"

## Real-World Application

### Example Portfolio Decision

**Scenario:** You have 100,000 KES to invest

**Stock Analysis:**

```
SCOM:
- LSTM Prediction: +8% return (14.50 → 15.66 KES)
- GARCH Volatility: 22% (moderate risk)
- Sharpe Ratio: 0.36

EQTY:
- LSTM Prediction: +5% return (42.00 → 44.10 KES)
- GARCH Volatility: 15% (low risk)
- Sharpe Ratio: 0.47 ← Better risk-adjusted return!

KCB:
- LSTM Prediction: +12% return (28.00 → 31.36 KES)
- GARCH Volatility: 35% (high risk!)
- Sharpe Ratio: 0.34
```

**Optimal Portfolio (based on Sharpe ratios):**
- 60% EQTY (best risk-adjusted return)
- 30% SCOM (balanced)
- 10% KCB (small high-risk position)

## How to Interpret GARCH Results in the UI

### Volatility Levels

**Low Volatility (< 15%)**
- ✅ Stable, predictable
- Good for conservative investors
- Lower potential returns

**Medium Volatility (15-25%)**
- ⚖️ Balanced risk/reward
- Normal for most NSE stocks
- Suitable for moderate portfolios

**High Volatility (> 25%)**
- ⚠️ Risky, unpredictable
- Potential for high returns OR losses
- Only for aggressive investors

### Risk Levels in the UI

The stock analysis page shows:

```tsx
Risk Level: {
  volatility > 0.4 ? "High" (Red)
  volatility > 0.25 ? "Medium" (Yellow)
  : "Low" (Green)
}
```

## Technical Details

### Our GARCH Implementation

Located in: `/ml/api/routes/garch.py`

**Model:** GARCH(1,1) - most common specification
- **1** lag for squared returns (shock term)
- **1** lag for variance (persistence term)

**Process:**
1. Calculate log returns from prices
2. Split data: 80% training, 20% validation
3. Fit GARCH model to training data
4. Forecast next period variance
5. Annualize: `volatility = sqrt(variance × 252)`

**Why 252?** Number of trading days in a year

### Advantages of GARCH

✅ Captures volatility clustering (realistic)
✅ Fast computation
✅ Well-established, proven model
✅ Works well for financial time series
✅ Provides uncertainty estimates

### Limitations

❌ Assumes symmetry (up/down moves treated equally)
❌ Requires stationary returns
❌ Can't predict structural breaks (sudden regime changes)
❌ Sensitive to outliers

## Further Reading

- **ARCH Models**: Original volatility model by Robert Engle (Nobel Prize 2003)
- **GARCH(1,1)**: Most practical extension
- **EGARCH**: Exponential GARCH (captures asymmetry)
- **GJR-GARCH**: Accounts for leverage effect (down moves ≠ up moves)

## Summary

**GARCH answers the question: "How bumpy will the ride be?"**

While LSTM tells you where you're going, GARCH tells you how rough the journey will be. Together, they provide a complete picture:

- 📈 **LSTM**: Expected return (reward)
- 📉 **GARCH**: Expected volatility (risk)
- ⚖️ **Sharpe Ratio**: Risk-adjusted performance
- 💼 **Portfolio**: Optimal asset allocation

**Remember:** 
> "It's not just about maximizing returns—it's about maximizing returns per unit of risk taken."

That's what GARCH helps us measure! 🎯
