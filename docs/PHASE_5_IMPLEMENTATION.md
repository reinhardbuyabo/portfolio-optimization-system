# Phase 5 Implementation: Risk-Return Chart Visualization

## ✅ Completed Features

### 1. Chart Toggle System
**Added state to switch between visualization modes:**
```typescript
const [chartView, setChartView] = useState<'allocation' | 'risk-return'>('allocation');
```

**Toggle Buttons:**
- 📊 **Allocation** - Traditional pie chart showing portfolio weights
- 📈 **Risk-Return** - Scatter plot showing risk vs return analysis
- Only visible when ML predictions are loaded
- Smooth switching between views

---

### 2. Risk-Return Data Preparation

**Data Structure:**
```typescript
const riskReturnData = {
  stocks: [
    {
      symbol: 'SCOM',
      return: 4.5,          // Expected return %
      volatility: 22.0,     // Volatility %
      sharpeRatio: 1.2,     // Risk-adjusted return
      weight: 0.333,        // Portfolio weight
    },
    // ... more stocks
  ],
  currentPortfolio: {
    symbol: 'Portfolio (Current)',
    return: 4.2,
    volatility: 18.5,
    sharpeRatio: 1.15,
    weight: 1.0,
    isPortfolio: true,
  },
  optimizedPortfolio: {
    symbol: 'Portfolio (Optimized)',
    return: 5.1,
    volatility: 17.2,
    sharpeRatio: 1.42,
    weight: 1.0,
    isPortfolio: true,
    isOptimized: true,
  }
};
```

---

### 3. Scatter Plot Features

#### Stock Points
- **Position:** (Volatility, Return)
- **Size:** Based on portfolio weight
  - Larger circles = higher allocation
  - Minimum size 30px, scales up to 100px
- **Color:** Based on Sharpe Ratio
  - 🟢 **Green** (Good): Sharpe > 1.0
  - 🔵 **Blue** (Moderate): Sharpe 0.5 - 1.0
  - 🔴 **Red** (Poor): Sharpe < 0.5
- **Label:** Stock symbol displayed above point

#### Portfolio Markers
- **Current Portfolio** (Purple)
  - 8px circle with white border
  - Label: "Current"
  - Shows current portfolio position
  
- **Optimized Portfolio** (Green)
  - 8px circle with white border
  - Label: "Optimized"
  - Only shows after optimization

#### Chart Elements
- **X-Axis:** Volatility (%) - Risk measure
- **Y-Axis:** Expected Return (%) - Reward measure
- **Grid:** Subtle dashed lines for easier reading
- **Tooltip:** Hover to see exact values

---

### 4. Interactive Tooltip

**Displays on hover:**
```
Stock: SCOM
Return: 4.52%
Volatility: 22.15%
Sharpe Ratio: 1.23
Weight: 33.3%
```

**Styled with:**
- Dark background matching app theme
- Border and rounded corners
- Formatted percentage values
- Clear labels

---

### 5. Chart Styling

**Colors (OKLCH format):**
- Background: `oklch(0.15 0.02 264)` - Dark blue
- Grid: `oklch(0.25 0.02 264)` - Subtle gray
- Axes: `oklch(0.5 0.02 264)` - Medium gray
- Good Sharpe: `oklch(0.7 0.2 150)` - Green
- Moderate Sharpe: `oklch(0.7 0.2 200)` - Blue
- Poor Sharpe: `oklch(0.7 0.2 30)` - Red
- Current Portfolio: `oklch(0.7 0.2 250)` - Purple
- Optimized Portfolio: `oklch(0.7 0.2 150)` - Green

---

## User Experience Flow

### Step 1: View Default Allocation Chart
```
User opens portfolio page
→ See pie chart showing asset allocation
→ Each stock's percentage displayed
```

### Step 2: Run Batch Predictions
```
User runs batch predictions
→ ML predictions loaded
→ Toggle buttons appear above chart
```

### Step 3: Switch to Risk-Return View
```
Click "Risk-Return" button
→ Chart transitions to scatter plot
→ See stocks plotted by risk and return
```

### Step 4: Analyze Stocks
```
Hover over stock points
→ Tooltip shows details
→ Color indicates quality (Sharpe Ratio)
→ Size shows allocation weight
```

### Step 5: Optimize Portfolio
```
Click "Optimize Portfolio"
→ Apply optimized weights
→ "Optimized" marker appears on chart
→ Compare current vs optimized position
```

### Step 6: Toggle Back
```
Click "Allocation" button
→ Return to pie chart view
→ See updated weights if optimization applied
```

---

## Chart Interpretation Guide

### Understanding the Plot

**Ideal Quadrant (Top-Left):**
```
High Return, Low Risk
↑
Return  |     IDEAL     | Good
        |               |
        |---------------|
        | Avoid         | Acceptable
←----------------------→
        Low Risk        High Risk
                    Volatility →
```

**Stock Classifications:**

| Position | Return | Volatility | Interpretation |
|----------|--------|-----------|----------------|
| **Top-Left** | High | Low | ⭐ Best - High return, low risk |
| **Top-Right** | High | High | ⚠️ Aggressive - High risk/reward |
| **Bottom-Left** | Low | Low | 💤 Conservative - Safe but low return |
| **Bottom-Right** | Low | High | ❌ Worst - High risk, low return |

### Sharpe Ratio Colors

| Color | Sharpe Ratio | Meaning |
|-------|--------------|---------|
| 🟢 Green | > 1.0 | **Excellent** - Returns justify the risk |
| 🔵 Blue | 0.5 - 1.0 | **Moderate** - Acceptable risk-adjusted return |
| 🔴 Red | < 0.5 | **Poor** - Risk too high for returns |

### Point Size Meaning

| Size | Weight | Interpretation |
|------|--------|----------------|
| **Large** | > 40% | Major holding - high impact on portfolio |
| **Medium** | 20-40% | Standard holding - balanced allocation |
| **Small** | < 20% | Minor holding - limited exposure |

---

## Example Scenarios

### Scenario 1: Well-Balanced Portfolio

**Before Optimization:**
```
Chart shows:
- 3 stocks clustered in moderate risk/return area
- Similar sizes (equal weighting)
- Mix of green and blue colors
- Current Portfolio marker in center

Interpretation:
✓ Diversified risk
✓ Moderate returns
✓ No single stock dominates
```

**After Optimization:**
```
Chart shows:
- Green (high Sharpe) stocks now larger
- Red (low Sharpe) stocks now smaller
- Optimized Portfolio marker moved left (lower risk)

Interpretation:
✓ Lower overall risk
✓ Better risk-adjusted returns
✓ Sharpe Ratio improved
```

---

### Scenario 2: Aggressive Portfolio

**Chart shows:**
```
- Stocks clustered in high volatility area (right side)
- High returns (top area)
- Large red circles (poor Sharpe, high allocation)
- Portfolio marker in top-right quadrant

Interpretation:
⚠️ High risk portfolio
✓ Potential for high returns
❌ Poor risk-adjusted performance
💡 Recommendation: Rebalance to reduce risk
```

---

### Scenario 3: Conservative Portfolio

**Chart shows:**
```
- Stocks clustered in low volatility area (left side)
- Low returns (bottom area)
- Mostly green circles (good Sharpe)
- Portfolio marker in bottom-left quadrant

Interpretation:
✓ Low risk portfolio
⚠️ Limited return potential
✓ Good risk-adjusted performance
💡 Recommendation: Consider adding moderate-risk stocks
```

---

## Technical Implementation

### Components Used
```typescript
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
```

### Chart Configuration
```typescript
<ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis 
    type="number" 
    dataKey="volatility" 
    label={{ value: 'Volatility (%)', position: 'bottom' }}
  />
  <YAxis 
    type="number" 
    dataKey="return" 
    label={{ value: 'Expected Return (%)', angle: -90 }}
  />
  <Tooltip />
  <Scatter name="Stocks" data={stocks} />
  <Scatter name="Portfolio" data={[currentPortfolio]} />
</ScatterChart>
```

### Custom Shape Rendering
```typescript
shape={(props) => {
  const { cx, cy, payload } = props;
  const size = Math.max(30, payload.weight * 100);
  const color = getColorBySharpe(payload.sharpeRatio);
  
  return (
    <g>
      <circle cx={cx} cy={cy} r={size / 10} fill={color} opacity={0.6} />
      <text x={cx} y={cy - size / 8} textAnchor="middle">
        {payload.symbol}
      </text>
    </g>
  );
}}
```

---

## Benefits

### For Users
✅ **Visual Risk Analysis** - See risk vs return at a glance
✅ **Stock Comparison** - Easily compare stocks on same chart
✅ **Quality Indicators** - Color-coded Sharpe Ratios
✅ **Weight Awareness** - Size shows portfolio allocation
✅ **Optimization Tracking** - Compare before/after optimization
✅ **Interactive** - Hover tooltips with exact values
✅ **Dual Views** - Switch between allocation and risk-return

### For Investment Decisions
✅ **Identify Outliers** - Spot stocks with poor risk/return
✅ **Diversification Check** - See if risk is concentrated
✅ **Optimization Validation** - Verify improvements visually
✅ **Risk Assessment** - Understand portfolio risk profile
✅ **Performance Tracking** - Monitor position changes over time

---

## Testing Checklist

### Chart Toggle
- [ ] Toggle buttons only show when predictions loaded
- [ ] Click "Allocation" shows pie chart
- [ ] Click "Risk-Return" shows scatter plot
- [ ] Chart title updates based on view
- [ ] Smooth transition between views

### Scatter Plot Display
- [ ] All stocks appear as points
- [ ] X-axis shows volatility (%)
- [ ] Y-axis shows return (%)
- [ ] Grid lines visible
- [ ] Axis labels readable

### Stock Points
- [ ] Symbol labels displayed
- [ ] Colors match Sharpe Ratios
  - Green for > 1.0
  - Blue for 0.5 - 1.0
  - Red for < 0.5
- [ ] Size reflects portfolio weight
- [ ] Hover shows tooltip

### Portfolio Markers
- [ ] Current portfolio marker shows (purple)
- [ ] Current marker labeled "Current"
- [ ] After optimization, optimized marker shows (green)
- [ ] Optimized marker labeled "Optimized"
- [ ] Markers clearly visible against stock points

### Tooltips
- [ ] Hover over stock shows tooltip
- [ ] Tooltip displays symbol, return, volatility
- [ ] Values formatted as percentages
- [ ] Tooltip styled with dark theme
- [ ] Tooltip doesn't obscure chart

---

## Next Phase Preview

### Phase 6: Export Report (FINAL)
- Generate PDF report with all metrics
- Include allocation pie chart
- Include risk-return scatter plot
- Add prediction tables
- Include optimization recommendations
- Professional formatting
- Download button
- Email report option

---

## Files Modified

1. ✅ `app/(dashboard)/portfolios/[id]/page.tsx`
   - Added chart toggle state
   - Added risk-return data preparation
   - Added scatter chart component
   - Added toggle buttons UI
   - Fixed TypeScript types

---

## Summary

**Phase 5 delivers a powerful risk-return visualization tool:**

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Scatter Plot** | Risk vs Return chart | Visual analysis |
| **Color Coding** | Sharpe Ratio indicators | Quality assessment |
| **Size Scaling** | Weight-based sizing | Allocation awareness |
| **Portfolio Markers** | Current & Optimized | Compare performance |
| **Interactive Tooltips** | Hover for details | Detailed information |
| **Chart Toggle** | Switch views easily | Flexible analysis |

Users can now visualize their portfolio's risk-return profile and make data-driven investment decisions with confidence! 📊📈

## Phase 5 Complete! 🎉
