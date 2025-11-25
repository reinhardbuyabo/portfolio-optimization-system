# Equal Weight Rebalancing Implementation

## Overview
All portfolio operations now use **equal weighting** as the default strategy. This ensures that each asset in a portfolio receives an equal allocation, regardless of how many assets are in the portfolio.

## Equal Weighting Formula
```typescript
Equal Weight = 1 / Number of Assets

Examples:
- 2 assets: 50% each (0.5)
- 3 assets: 33.33% each (0.333)
- 4 assets: 25% each (0.25)
- 5 assets: 20% each (0.2)
```

---

## Implementation Changes

### 1. Portfolio Creation
**File:** `app/api/portfolios/create/route.ts`

**Before:**
```typescript
// Used normalizeWeights() which maintained existing weight proportions
normalizedStocks = normalizeWeights(stocks);
```

**After:**
```typescript
// Apply equal weighting to all stocks
const equalWeight = 1.0 / stocks.length;
normalizedStocks = stocks.map(stock => ({
  ...stock,
  weight: equalWeight,
}));
```

**Result:**
- When creating a portfolio with 3 stocks, each gets **33.33%** weight
- Ignores any weights provided by the user
- Ensures fair distribution from the start

---

### 2. Adding Stocks
**File:** `app/api/portfolios/[portfolioId]/add-stock/route.ts`

**Before:**
```typescript
// New stock got equal weight but existing stocks kept their weights
const newWeight = weight ?? 1 / (allAllocations.length + 1);
allAllocations.push({ assetId: asset.id, weight: newWeight });
normalizedAllocations = normalizeWeights(allAllocations); // Normalized proportionally
```

**After:**
```typescript
// ALL stocks get equal weight (full rebalance)
const totalAssets = allAllocations.length + 1;
const equalWeight = 1 / totalAssets;

allAllocations.push({ assetId: asset.id, weight: equalWeight });

// Apply equal weighting to all allocations
const normalizedAllocations = allAllocations.map((alloc) => ({
  assetId: alloc.assetId,
  weight: equalWeight,
}));
```

**Result:**
- Adding a 4th stock to a portfolio rebalances ALL stocks to **25% each**
- Previous weights are discarded
- Portfolio is automatically rebalanced with equal weights

**Example:**
```
Before adding stock (3 stocks):
SCOM: 33.33%
EQTY: 33.33%
KCB:  33.33%

After adding BAT:
SCOM: 25%
EQTY: 25%
KCB:  25%
BAT:  25%  ← New stock
```

---

### 3. Portfolio Rebalancing
**File:** `app/api/portfolios/[portfolioId]/rebalance/route.ts`

**New Endpoint:** Supports both equal weighting and custom optimization

**When NO weights provided:**
```typescript
// Apply equal weighting (default rebalancing)
const equalWeight = 1.0 / numAssets;
weights = portfolio.allocations.map((allocation) => ({
  symbol: allocation.asset.ticker,
  weight: equalWeight,
}));
```

**When weights ARE provided (optimization):**
```typescript
// Use provided weights
weights = providedWeights;

// Validate weights sum to 100%
const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
if (Math.abs(totalWeight - 1.0) > 0.01) {
  throw new Error("Weights must sum to 100%");
}
```

**Frontend Handler:**
```typescript
const handleRebalance = async () => {
  const response = await fetch(`/api/portfolios/${portfolioId}/rebalance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}), // Empty body = equal weighting
  });
  
  toast.success("Portfolio rebalanced successfully", {
    description: "Equal weights applied to all assets"
  });
};
```

**Result:**
- "Rebalance Portfolio" button applies equal weights
- "Optimize Portfolio" button applies ML-optimized weights
- Both use the same `/rebalance` endpoint

---

## User Experience Flow

### Scenario 1: Create Portfolio
```
User creates portfolio with:
- SCOM
- EQTY
- KCB

Result:
SCOM: 33.33%
EQTY: 33.33%
KCB:  33.33%
```

### Scenario 2: Add Stock to Portfolio
```
Existing portfolio:
SCOM: 50%
EQTY: 50%

User adds KCB:

Result:
SCOM: 33.33%  ← Rebalanced
EQTY: 33.33%  ← Rebalanced
KCB:  33.33%  ← New stock
```

### Scenario 3: Manual Rebalance
```
Current weights (after optimization):
SCOM: 45%
EQTY: 35%
KCB:  20%

User clicks "Rebalance Portfolio":

Result:
SCOM: 33.33%
EQTY: 33.33%
KCB:  33.33%
```

### Scenario 4: ML Optimization
```
Current weights (equal):
SCOM: 33.33%
EQTY: 33.33%
KCB:  33.33%

User runs batch predictions and clicks "Optimize Portfolio":

Result (based on Sharpe Ratios):
SCOM: 47%  ← Highest Sharpe
EQTY: 34%  ← Medium Sharpe
KCB:  19%  ← Lowest Sharpe
```

---

## API Endpoints

### 1. Create Portfolio with Equal Weights
```bash
POST /api/portfolios/create
{
  "name": "Tech Portfolio",
  "riskTolerance": "MEDIUM",
  "targetReturn": 0.08,
  "stocks": [
    { "ticker": "SCOM" },
    { "ticker": "EQTY" },
    { "ticker": "KCB" }
  ]
}

# Response: Each stock gets 33.33% weight
```

### 2. Add Stock (Auto-Rebalance)
```bash
POST /api/portfolios/{portfolioId}/add-stock
{
  "ticker": "BAT"
}

# Result: All stocks rebalanced to equal weights
# 4 stocks = 25% each
```

### 3. Manual Rebalance (Equal Weights)
```bash
POST /api/portfolios/{portfolioId}/rebalance
{}

# Empty body = equal weighting
# Result: All stocks get 1/N weight
```

### 4. Optimize Portfolio (Custom Weights)
```bash
POST /api/portfolios/{portfolioId}/rebalance
{
  "weights": [
    { "symbol": "SCOM", "weight": 0.47 },
    { "symbol": "EQTY", "weight": 0.34 },
    { "symbol": "KCB", "weight": 0.19 }
  ]
}

# Result: Applies optimized weights from ML
```

---

## Benefits

### For Users
✅ **Simple & Fair**: Equal distribution across all assets
✅ **Predictable**: Easy to understand weight allocation
✅ **No Bias**: Doesn't favor any particular stock
✅ **Automatic**: No need to specify weights manually
✅ **Flexible**: Can optimize later with ML predictions

### For System
✅ **Consistent**: All portfolio operations use same strategy
✅ **Easy to Calculate**: Simple formula (1/N)
✅ **Rebalancing**: Adding/removing stocks auto-rebalances
✅ **Optimization Ready**: Can switch to ML weights when ready

---

## Validation

### Weight Sum Validation
```typescript
// For custom weights (optimization)
const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
if (Math.abs(totalWeight - 1.0) > 0.01) {
  throw new Error("Weights must sum to 100%");
}
```

**Allowed Range:** 99% - 101% (accounts for floating-point precision)

---

## Testing Checklist

### Equal Weighting Tests
- [ ] Create portfolio with 2 stocks → Each gets 50%
- [ ] Create portfolio with 3 stocks → Each gets 33.33%
- [ ] Create portfolio with 5 stocks → Each gets 20%
- [ ] Add stock to 2-stock portfolio → All become 33.33%
- [ ] Add stock to 3-stock portfolio → All become 25%
- [ ] Click "Rebalance Portfolio" → All weights become equal
- [ ] Verify weights always sum to 100%

### Optimization Tests
- [ ] Run batch predictions
- [ ] Click "Optimize Portfolio"
- [ ] Verify optimized weights are NOT equal
- [ ] Apply optimization
- [ ] Click "Rebalance Portfolio" again
- [ ] Verify weights return to equal

---

## Migration Notes

### Existing Portfolios
- ✅ **No migration needed** - equal weighting applies going forward
- ⚠️ Existing portfolios keep their current weights until rebalanced
- 💡 Users can click "Rebalance Portfolio" to apply equal weights

### Backward Compatibility
- ✅ All existing API endpoints still work
- ✅ Frontend handles both equal and custom weights
- ✅ Optimization modal shows weight changes clearly

---

## Files Modified

1. ✅ `app/api/portfolios/create/route.ts` - Equal weights on creation
2. ✅ `app/api/portfolios/[portfolioId]/add-stock/route.ts` - Equal weights when adding
3. ✅ `app/api/portfolios/[portfolioId]/rebalance/route.ts` - Supports both equal and custom
4. ✅ `app/(dashboard)/portfolios/[id]/page.tsx` - Updated rebalance handler

---

## Summary

**Equal weighting is now the default strategy across all portfolio operations:**

| Operation | Weight Strategy | Example (3 stocks) |
|-----------|----------------|-------------------|
| Create Portfolio | Equal (1/N) | 33.33% each |
| Add Stock | Equal (1/N) | Rebalance all to 25% |
| Rebalance Portfolio | Equal (1/N) | Reset to 33.33% each |
| Optimize Portfolio | ML-based | Custom (47%, 34%, 19%) |

This provides a **simple, fair, and predictable** foundation while still allowing **ML-powered optimization** when users want to maximize returns.
