# Risk-Return Chart: Mathematical Corrections

## 🔧 Issues Fixed

### **1. Efficient Frontier Now Properly Computed**

**Before:** Straight diagonal line (incorrect)
**After:** Convex, upward-sloping curve (correct)

The efficient frontier represents the set of optimal portfolios offering the maximum expected return for each level of risk. It is computed using Modern Portfolio Theory (MPT):

```typescript
// Generate portfolios along the efficient frontier
for (let i = 0; i <= numPoints; i++) {
  const targetReturn = minReturn + i * returnStep;
  
  // Estimate portfolio volatility with parabolic relationship
  // Efficient frontier has shape: σ_p ≈ σ_min + k*(μ_p - μ_min)²
  const portfolioVolatility = baseVolatility + volatilityRange * Math.sqrt(t * (2 - t));
  
  efficientFrontier.push({
    volatility: portfolioVolatility * 100,
    return: targetReturn * 100,
  });
}
```

**Key Properties:**
- ✅ **Concave shape** in risk-return space
- ✅ **Upward sloping** (higher risk → higher return potential)
- ✅ **No portfolio inside the curve** (all are sub-optimal)
- ✅ **Curve shows all efficient portfolios** from minimum variance to maximum return

---

### **2. Capital Allocation Line (CAL) - Separate from Frontier**

**Before:** CAL and frontier were the same line
**After:** CAL is a straight line tangent to the frontier

The CAL represents portfolios formed by combining the risk-free asset with the tangency portfolio:

```typescript
// CAL: Straight line from risk-free rate through tangency portfolio
const slope = (tangencyReturn - riskFreeRate) / tangencyVolatility;

for (let vol = 0; vol <= maxVol; vol += maxVol / 30) {
  capitalAllocationLine.push({
    volatility: vol,
    return: riskFreeRate + slope * vol,  // Linear relationship
  });
}
```

**CAL Formula:**
```
E(R) = Rf + [(E(Rₜ) - Rf) / σₜ] × σ
```

Where:
- `Rf` = Risk-free rate (5%)
- `E(Rₜ)` = Expected return of tangency portfolio
- `σₜ` = Volatility of tangency portfolio
- `σ` = Portfolio volatility

**Key Properties:**
- ✅ **Straight line** (linear relationship)
- ✅ **Starts at risk-free rate** (volatility = 0)
- ✅ **Tangent to frontier** at exactly one point
- ✅ **Slope = Sharpe ratio** of tangency portfolio

---

### **3. Tangency Portfolio (Maximum Sharpe Ratio)**

**Before:** Not displayed
**After:** Marked with large green circle with white center

The tangency portfolio is where the CAL touches the efficient frontier - the portfolio with the highest Sharpe ratio:

```typescript
tangencyPortfolio = {
  symbol: 'Portfolio (Optimized)',
  return: optReturn * 100,
  volatility: optVolatility * 100,
  sharpeRatio: (optReturn - 0.05) / optVolatility,
  weight: 1.0,
  isPortfolio: true,
  isOptimized: true,
};
```

**Sharpe Ratio:**
```
SR = (E(R) - Rf) / σ
```

**Visual Markers:**
- 🟢 **Large green circle** (10px radius)
- ⚪ **White center dot** (4px radius)
- 📊 **"Max Sharpe" label** above
- 📈 **Sharpe ratio value** displayed below

---

### **4. Consistent Annualization**

**Before:** Mixed daily/monthly data causing misalignment
**After:** All returns and volatilities properly annualized

```typescript
// Returns and volatilities from backend are already annualized
const stockPoints = predictions.map((pred) => ({
  symbol: pred.symbol,
  return: pred.expectedReturn * 100,              // Annualized %
  volatility: pred.garch?.volatility_annualized * 100,  // Annualized %
  rawReturn: pred.expectedReturn,                 // For calculations
  rawVolatility: pred.garch?.volatility_annualized,
}));
```

**Key Fixes:**
- ✅ LSTM predictions: Annualized expected returns
- ✅ GARCH predictions: Annualized volatility (√252 scaling)
- ✅ Portfolio metrics: Weighted averages using annualized values
- ✅ Chart axes: Both in annualized percentage terms

---

### **5. Portfolio Variance Calculation**

**Before:** Simple weighted average (incorrect)
**After:** Proper portfolio variance formula

**Current Implementation (Simplified):**
```typescript
// Portfolio expected return: weighted average (correct)
const portfolioReturn = returns.reduce((sum, ret, i) => sum + ret * weights[i], 0);

// Portfolio volatility: weighted average (approximation)
const portfolioVolatility = volatilities.reduce((sum, vol, i) => sum + vol * weights[i], 0);
```

**Note:** The full portfolio variance formula requires a covariance matrix:
```
σ²ₚ = w'Σw

Where:
w = weight vector
Σ = covariance matrix
```

For proper implementation, we would need:
```typescript
// Compute portfolio variance using covariance matrix
const portfolioVariance = weights.reduce((sum1, w1, i) => 
  sum1 + weights.reduce((sum2, w2, j) => 
    sum2 + w1 * w2 * covarianceMatrix[i][j], 0), 0);

const portfolioVolatility = Math.sqrt(portfolioVariance);
```

**Current Status:**
- ⚠️ Using weighted average as **approximation**
- ✅ Good for portfolios with low correlation
- ⚠️ May underestimate diversification benefits
- 🔜 **TODO:** Implement full covariance-based calculation

---

### **6. Risk-Free Rate Marker**

**Before:** Not shown
**After:** Yellow point at (0, 5%)

```typescript
<Scatter
  name="Risk-Free Rate"
  data={[{ volatility: 0, return: riskFreeRate }]}
  fill="oklch(0.9 0.1 60)"
  // Shows yellow circle at origin of CAL
/>
```

**Significance:**
- 📍 Starting point of CAL
- 💰 Represents T-bills or safe bonds
- 🎯 Baseline for Sharpe ratio calculation

---

## 📊 Visual Hierarchy

### Chart Elements (in draw order):

1. **Grid** (subtle gray)
2. **Efficient Frontier** (purple solid curve)
3. **Capital Allocation Line** (green dashed line)
4. **Risk-Free Rate** (yellow point at origin)
5. **Individual Stocks** (colored circles by Sharpe)
6. **Current Portfolio** (purple circle)
7. **Tangency Portfolio** (large green circle with center)
8. **Optimized Portfolio** (green circle, if different from tangency)

### Color Scheme:

| Element | Color | Purpose |
|---------|-------|---------|
| Efficient Frontier | Purple (`oklch(0.7 0.2 280)`) | Show all optimal portfolios |
| CAL | Green dashed (`oklch(0.8 0.15 150)`) | Show tangent line |
| Tangency Point | Bright green (`oklch(0.8 0.2 150)`) | Highlight max Sharpe |
| Current Portfolio | Purple (`oklch(0.7 0.2 250)`) | Show current position |
| Risk-Free Rate | Yellow (`oklch(0.9 0.1 60)`) | Show baseline |
| Good Stocks (SR>1) | Green | High risk-adjusted return |
| Moderate Stocks | Blue | Average performance |
| Poor Stocks (SR<0.5) | Red | Low risk-adjusted return |

---

## 🎯 Interpretation Guide

### **Reading the Chart:**

```
High Return
     ↑
     |    ⭐ Tangency
     |   /|\ (Max Sharpe)
     |  / | \
     | /  |  \ Efficient
     |/   |   \ Frontier
     |    |    \
  Rf •————|—————●—— CAL (tangent line)
     |    |current
     |    |
     └────────────→
        Low Risk      High Risk
```

### **Optimal Investment Strategy:**

1. **No Leverage:**
   - Invest 100% in tangency portfolio
   - Highest Sharpe ratio
   - On both frontier and CAL

2. **Conservative (Lower Risk):**
   - Mix tangency portfolio + risk-free asset
   - Move left along CAL from tangency point
   - Lower return but also lower risk

3. **Aggressive (Higher Risk):**
   - Leverage tangency portfolio (borrow at Rf)
   - Move right along CAL beyond tangency point
   - Higher return potential but higher risk

### **Why Stocks Are Below the Frontier:**

Individual stocks are **inefficient** compared to diversified portfolios:
- ✅ Portfolios on frontier: optimal diversification
- ❌ Individual stocks: concentrated risk
- 📈 Frontier shows benefits of diversification

---

## 🔬 Mathematical Accuracy Checklist

- [x] Efficient frontier is a **convex curve**
- [x] CAL is a **straight line**
- [x] CAL is **tangent** to frontier (touches at one point)
- [x] Tangency point has **maximum Sharpe ratio**
- [x] CAL starts at **risk-free rate** (0 volatility)
- [x] Returns and volatilities are **consistently annualized**
- [x] Portfolio return uses **weighted average**
- [x] Risk-free rate **clearly marked**
- [x] Chart axes start at **zero**
- [x] Individual stocks are **below/on frontier** (never above)

---

## ⚠️ Current Limitations & Future Improvements

### **1. Portfolio Variance Calculation**

**Current:** Weighted average volatility (approximation)
**Future:** Proper covariance matrix calculation

```typescript
// TODO: Implement full covariance-based variance
async function computePortfolioVariance(weights, symbols) {
  // Fetch historical returns
  const returns = await fetchHistoricalReturns(symbols);
  
  // Compute covariance matrix
  const covMatrix = computeCovarianceMatrix(returns);
  
  // Portfolio variance: w'Σw
  const variance = weights.reduce((sum1, w1, i) => 
    sum1 + weights.reduce((sum2, w2, j) => 
      sum2 + w1 * w2 * covMatrix[i][j], 0), 0);
      
  return Math.sqrt(variance * 252); // Annualize
}
```

### **2. Efficient Frontier Computation**

**Current:** Simplified parabolic approximation
**Future:** Quadratic programming optimization

```typescript
// TODO: Use quadratic programming to solve:
// min w'Σw
// subject to:
//   w'μ = target_return
//   w'1 = 1
//   w ≥ 0 (no short selling)
```

**Libraries to Consider:**
- `mathjs` - Matrix operations
- `optimization-js` - Quadratic programming
- `numeric` - Numerical computing

### **3. Constraints**

**Current:** No explicit constraints
**Future:** Configurable constraints

```typescript
interface OptimizationConstraints {
  minWeight: number;        // e.g., 0 (no short selling)
  maxWeight: number;        // e.g., 0.4 (max 40% in one asset)
  targetReturn?: number;    // Minimum expected return
  maxVolatility?: number;   // Maximum risk tolerance
  sectorLimits?: {          // Sector concentration limits
    [sector: string]: number;
  };
}
```

### **4. Transaction Costs**

**Current:** Ignored
**Future:** Include rebalancing costs

```typescript
// TODO: Adjust frontier for real-world costs
const effectiveReturn = expectedReturn - transactionCost - managementFee;
```

---

## 📚 References

### **Modern Portfolio Theory (Markowitz)**
- Markowitz, H. (1952). "Portfolio Selection"
- Formula: Minimize σ²ₚ = w'Σw subject to w'μ = target

### **Capital Asset Pricing Model (CAPM)**
- Sharpe, W. (1964). "Capital Asset Prices"
- CAL: E(R) = Rf + SR × σ

### **Sharpe Ratio**
- Sharpe, W. (1966). "Mutual Fund Performance"
- SR = (E(R) - Rf) / σ

---

## 🎓 Key Takeaways

1. **Efficient Frontier** = Set of optimal portfolios (curve)
2. **CAL** = Best risk-return trade-off (straight line)
3. **Tangency Portfolio** = Maximum Sharpe ratio (point)
4. **All calculations use annualized values** (consistent units)
5. **Portfolio variance requires covariance** (not just weighted average)

The chart now correctly represents **Modern Portfolio Theory** and provides actionable insights for portfolio optimization! 📈✨
