# Real Data Refactor Plan - Remove All Mock Data

## Current Problem

The system is mixing mock data and real data, causing confusion:

### Issues:
1. ❌ **Graph shows mock prices** (28.5) instead of real CSV data (16.75)
2. ❌ **Mock forecasts displayed** before predictions run
3. ❌ **Mock volatility data** shown instead of "no data yet"
4. ❌ **Confusing state** - users can't tell what's real vs fake
5. ❌ **Inconsistent baselines** - calculations use different sources

## Solution Architecture

```
Source of Truth:
└─ ml/datasets/NSE_data_all_stocks_2024_jan_to_oct.csv
   ↓
   ├─ Historical Prices → Display in chart
   ├─ Current Price → Calculate from latest CSV entry
   └─ Feed to ML Models → Get predictions
      ↓
      ├─ LSTM → Future price prediction
      └─ GARCH → Volatility forecast
         ↓
         Display ONLY prediction results
         (No mock data, no placeholders)
```

## Refactored Data Flow

### Before (Current - Confusing):
```
Page Load:
├─ Show mock current price (28.5)
├─ Show mock forecast chart
├─ Show mock volatility
└─ Show mock metrics

After Prediction:
├─ Show real current price (16.75)
├─ Show real prediction (28.99)
├─ Chart still shows mock data ❌
└─ Metrics show real + mock mix ❌
```

### After (Clean):
```
Page Load:
├─ Fetch historical prices from CSV
├─ Display real current price (16.75)
├─ Show historical price chart (last 60 days)
└─ Show "Run LSTM to get predictions" messages

After Prediction:
├─ Keep real current price (16.75)
├─ Add prediction to chart (28.99)
├─ Display predicted values ONLY
└─ Calculate all metrics from real data
```

## Implementation Plan

### Phase 1: Remove Mock Data Dependencies

#### 1.1 Create Historical Data Fetcher
```typescript
// lib/api/get-historical-data.ts

export interface HistoricalDataPoint {
  date: string;
  price: number;
}

export async function getHistoricalPrices(
  symbol: string, 
  days: number = 60
): Promise<HistoricalDataPoint[]> {
  // Read from CSV
  // Return array of {date, price}
}

export async function getLatestPrice(symbol: string): Promise<number | null> {
  const prices = await getHistoricalPrices(symbol, 1);
  return prices.length > 0 ? prices[0].price : null;
}
```

#### 1.2 Update Stock Analysis Page State
```typescript
// Remove all mock data imports
// Remove: generateMockForecasts, generateMockVolatility, mockMetrics

const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
const [currentPrice, setCurrentPrice] = useState<number | null>(null);
const [predictionResult, setPredictionResult] = useState<CombinedPrediction | null>(null);
const [isLoading, setIsLoading] = useState(true);
```

### Phase 2: Fetch Real Historical Data

#### 2.1 Load Historical Prices on Mount
```typescript
useEffect(() => {
  const loadHistoricalData = async () => {
    setIsLoading(true);
    try {
      // Fetch last 60 days of prices
      const response = await fetch(`/api/stocks/historical?symbol=${selectedStock}&days=60`);
      const data = await response.json();
      
      setHistoricalData(data.prices);
      setCurrentPrice(data.latestPrice);
    } catch (error) {
      console.error('Failed to load historical data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  loadHistoricalData();
}, [selectedStock]);
```

#### 2.2 Create Historical Data API
```typescript
// app/api/stocks/historical/route.ts

export async function GET(request: NextRequest) {
  const symbol = searchParams.get('symbol');
  const days = parseInt(searchParams.get('days') || '60');
  
  const prices = getHistoricalPrices(symbol, days);
  
  return NextResponse.json({
    symbol,
    prices: prices.map(p => ({
      date: p.date,
      price: p.price,
    })),
    latestPrice: prices[prices.length - 1]?.price,
  });
}
```

### Phase 3: Update Chart to Show Real Data

#### 3.1 Historical Price Chart (Before Prediction)
```typescript
const chartData = useMemo(() => {
  if (!predictionResult) {
    // Show only historical data
    return historicalData.map(point => ({
      date: formatDate(point.date),
      actual: point.price,
    }));
  }
  
  // After prediction: show historical + prediction
  const historical = historicalData.map(point => ({
    date: formatDate(point.date),
    actual: point.price,
  }));
  
  const prediction = generatePredictionPoints(
    currentPrice,
    predictionResult.lstm.prediction,
    30
  );
  
  return [...historical, ...prediction];
}, [historicalData, predictionResult, currentPrice]);
```

#### 3.2 Prediction Visualization
```typescript
function generatePredictionPoints(
  current: number,
  predicted: number,
  days: number
) {
  const points = [];
  for (let i = 1; i <= days; i++) {
    const progress = i / days;
    const interpolated = current + (predicted - current) * progress;
    
    points.push({
      date: formatFutureDate(i),
      predicted: interpolated,
      lower: interpolated * 0.95,
      upper: interpolated * 1.05,
    });
  }
  return points;
}
```

### Phase 4: Update UI Components

#### 4.1 Before Prediction State
```tsx
{!predictionResult && (
  <div className="text-center py-12">
    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
    <h3 className="text-lg mb-2">No Prediction Available</h3>
    <p className="text-muted-foreground mb-4">
      Run LSTM model to get price predictions
    </p>
    <button onClick={handleRunModel} className="...">
      Run LSTM Prediction
    </button>
  </div>
)}
```

#### 4.2 After Prediction State
```tsx
{predictionResult && (
  <div className="space-y-6">
    {/* Chart with historical + prediction */}
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <Line dataKey="actual" name="Historical" stroke="#10B981" />
        <Line dataKey="predicted" name="Predicted" stroke="#FACC15" />
        <Line dataKey="upper" name="Upper Bound" strokeDasharray="5 5" />
        <Line dataKey="lower" name="Lower Bound" strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
    
    {/* Metrics from real prediction */}
    <div className="grid grid-cols-3 gap-4">
      <MetricCard
        title="30-Day Forecast"
        value={formatCurrency(predictionResult.lstm.prediction)}
        change={((predictionResult.lstm.prediction - currentPrice) / currentPrice) * 100}
      />
      <MetricCard
        title="Current Price"
        value={formatCurrency(currentPrice)}
        subtitle="From CSV (Oct 2024)"
      />
      <MetricCard
        title="Expected Return"
        value={formatPercent(
          ((predictionResult.lstm.prediction - currentPrice) / currentPrice) * 100
        )}
        subtitle="From LSTM"
      />
    </div>
  </div>
)}
```

### Phase 5: Database Integration (Prisma)

#### 5.1 Store Predictions in Database
```typescript
// After successful prediction
await prisma.lSTMPrediction.create({
  data: {
    symbol: selectedStock,
    prediction: predictionResult.lstm.prediction,
    currentPrice: currentPrice,
    predictionDate: new Date(),
    executionTime: predictionResult.lstm.execution_time,
  },
});
```

#### 5.2 Fetch Historical Predictions
```typescript
// app/api/stocks/predictions/route.ts

export async function GET(request: NextRequest) {
  const symbol = searchParams.get('symbol');
  
  const predictions = await prisma.lSTMPrediction.findMany({
    where: { symbol },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  
  return NextResponse.json({ predictions });
}
```

### Phase 6: Remove Mock Data Files (Optional)

#### 6.1 Clean Up
```typescript
// Remove or mark as deprecated:
// - lib/mockData.ts (keep only stock list for dropdowns)
// - generateMockForecasts()
// - generateMockVolatility()
// - mockMetrics
```

#### 6.2 Keep Only Essential Mock Data
```typescript
// lib/stockList.ts
export const NSE_STOCKS = [
  { symbol: 'SCOM', name: 'Safaricom PLC', sector: 'Telecommunications' },
  { symbol: 'EQTY', name: 'Equity Group', sector: 'Banking' },
  // ... (just for dropdowns, no prices)
];
```

## New User Flow

### 1. Page Load
```
1. User navigates to Stock Analysis
2. System fetches last 60 days of SCOM prices from CSV
3. Display:
   ├─ Historical price chart (60 days)
   ├─ Current price: Ksh 16.75 (from CSV)
   └─ Message: "Run LSTM to get predictions"
```

### 2. Run Prediction
```
1. User clicks "Run LSTM"
2. System:
   ├─ Prepares data from CSV
   ├─ Calls ML API
   └─ Returns prediction
3. Display:
   ├─ Chart: Historical (green) + Predicted (yellow)
   ├─ 30-Day Forecast: Ksh 28.99
   ├─ Expected Return: +72.84%
   └─ All metrics calculated from real prediction
```

### 3. Switch Stocks
```
1. User selects different stock
2. System:
   ├─ Fetches new historical data
   ├─ Clears previous prediction
   └─ Shows historical chart only
3. Display:
   ├─ New stock's historical prices
   ├─ New current price
   └─ Message: "Run LSTM to get predictions"
```

## Data Source Matrix

| Data Point | Source | When Available |
|------------|--------|----------------|
| Historical Prices | CSV via API | Always |
| Current Price | Latest CSV entry | Always |
| Predicted Price | LSTM Model | After prediction |
| Volatility | GARCH Model | After prediction |
| Expected Return | Calculated from LSTM | After prediction |
| Chart (Historical) | CSV data | Always |
| Chart (Forecast) | LSTM interpolation | After prediction |

## API Endpoints Needed

```
GET /api/stocks/historical?symbol=SCOM&days=60
├─ Returns: Historical prices array
└─ Source: CSV file

GET /api/stocks/latest-prices?symbols=SCOM,EQTY
├─ Returns: Latest prices for symbols
└─ Source: CSV file (already exists ✅)

POST /api/ml/predict
├─ Input: Historical data
├─ Returns: LSTM + GARCH predictions
└─ Source: ML service (already exists ✅)

GET /api/stocks/predictions?symbol=SCOM
├─ Returns: Historical predictions from DB
└─ Source: Prisma (to be created)
```

## Benefits of This Approach

✅ **No Confusion** - Everything shown is real data  
✅ **Clear States** - Either "no prediction" or "with prediction"  
✅ **Consistent** - All calculations use same baseline  
✅ **Transparent** - Users know exactly what they're seeing  
✅ **Accurate** - No mock data causing wrong expectations  
✅ **Professional** - Production-ready, not demo-mode  

## Implementation Priority

### High Priority (Do First):
1. ✅ Create historical data API endpoint
2. ✅ Fetch real historical prices on page load
3. ✅ Update chart to show real historical data
4. ✅ Remove mock data from initial state
5. ✅ Show "no prediction" state properly

### Medium Priority (Do Next):
1. Store predictions in database
2. Fetch historical predictions
3. Show prediction history
4. Add date range selector

### Low Priority (Future):
1. Clean up/remove mock data files
2. Add more advanced charting
3. Compare multiple predictions
4. Export functionality

## File Changes Required

### New Files:
```
app/api/stocks/historical/route.ts       - Historical data API
app/api/stocks/predictions/route.ts      - Prediction history API
lib/api/get-historical-data.ts          - Historical data utilities
```

### Modified Files:
```
app/new/(newui)/stock-analysis/page.tsx  - Remove mock, use real data
lib/api/ml-data-helper.ts               - Export helper functions
```

### Deprecated Files:
```
lib/mockData.ts                         - Keep only stock list
```

## Testing Checklist

- [ ] Historical chart shows real CSV prices
- [ ] Current price matches latest CSV entry
- [ ] No mock data displayed before prediction
- [ ] Prediction updates chart correctly
- [ ] All metrics calculated from real data
- [ ] Switching stocks clears previous prediction
- [ ] Error states handled gracefully
- [ ] Performance is acceptable

## Migration Notes

This is a **breaking change** for the UI, but a necessary one:
- Users will see empty state until they run predictions
- This is actually better UX (clear intent)
- No more confusion about what's real vs fake

## Success Criteria

✅ **Zero mock data displayed** in production flow  
✅ **All prices from CSV** match exactly  
✅ **Chart shows historical** data by default  
✅ **Predictions clearly differentiated** from historical  
✅ **Consistent baseline** for all calculations  

---

**This refactor will make the system production-ready and eliminate all confusion between mock and real data.** 🎯


