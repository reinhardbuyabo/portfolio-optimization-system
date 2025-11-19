# API Integration Strategy for Stock-Specific Models (v4 Log)

**Date**: November 18, 2024  
**Models**: Stock-Specific LSTM with Log Transformations  
**Total Stocks**: 66 stocks across 11 sectors  
**Currently Trained**: 5 stocks (SCOM, EQTY, KCB, BAMB, EABL)

---

## Executive Summary

**Question**: Do we need an API endpoint/route for every stock?  
**Answer**: ❌ **NO** - We use a **dynamic routing strategy** with a single endpoint that serves all stocks.

### Recommended Approach

```
Single Endpoint → Dynamic Model Loading → Cached Models → Predictions
```

**Benefits**:
- ✅ Single endpoint handles all stocks
- ✅ Models loaded on-demand (lazy loading)
- ✅ LRU cache for frequently-used models
- ✅ Scalable to 100+ stocks without code changes
- ✅ Consistent API interface

---

## Current State Analysis

### Available Stocks (from CSV)

```
Total Stocks: 66
Sectors: 11
- Banking: 12 stocks
- Manufacturing: 8 stocks
- Insurance: 6 stocks
- Construction: 6 stocks
- Telecommunication: 1 stock (SCOM)
- And 6 more sectors...
```

### Currently Trained Models (v4 Log)

```
✅ SCOM  - Telecom (1d MAPE: 4.78%, 10d: 4.23%)
✅ EQTY  - Banking (1d MAPE: 1.86%, 10d: 3.68%)
✅ KCB   - Banking (1d MAPE: 4.68%, 10d: 4.38%)
✅ BAMB  - Construction (1d MAPE: 8.53%, 10d: 16.41%)
✅ EABL  - Manufacturing (1d MAPE: 3.77%, 10d: 5.67%)
```

### Existing API Structure

```typescript
// Next.js API Routes (TypeScript)
/app/api/
├── ml/
│   ├── predict/route.ts        ← Main prediction endpoint
│   ├── predict/batch/route.ts  ← Batch predictions
│   └── garch/predict/route.ts  ← GARCH volatility

// Python FastAPI (ML Service)
/ml/api/
├── main.py                     ← FastAPI app
├── routes/
│   ├── lstm.py                 ← Current LSTM endpoint
│   ├── lstm_improved.py        ← Improved LSTM
│   └── portfolio.py
```

**Current Issue**: Uses global model for all stocks ❌

---

## Proposed API Architecture

### 1. Stock-Specific Model Service (Python FastAPI)

**Single Endpoint with Dynamic Model Loading**

```python
# New endpoint: /api/v4/predict/stock/{symbol}
# OR: /api/v4/predict with symbol parameter

POST /api/v4/predict
{
  "symbol": "SCOM",
  "horizon": "10d",  // 1d, 5d, 10d, 30d
  "historical_data": [...]  // Optional, can fetch from DB
}

Response:
{
  "symbol": "SCOM",
  "prediction": 17.8,
  "confidence_interval": {
    "lower": 16.5,
    "upper": 19.1
  },
  "horizon": "10d",
  "mape": 4.23,
  "model_version": "v4_log",
  "execution_time": 0.12
}
```

### 2. Model Registry & Loader

```python
class StockModelRegistry:
    """
    Manages stock-specific models with lazy loading and caching.
    """
    def __init__(self, models_dir, cache_size=20):
        self.models_dir = Path(models_dir)
        self.cache = LRUCache(cache_size)  # Keep 20 most recent
        self.available_models = self._scan_models()
    
    def _scan_models(self) -> Dict[str, Path]:
        """Scan models directory for available stocks."""
        models = {}
        for model_file in self.models_dir.glob("*_best.h5"):
            symbol = model_file.stem.replace("_best", "")
            models[symbol] = model_file
        return models
    
    def load_model(self, symbol: str):
        """Load model (from cache or disk)."""
        if symbol in self.cache:
            return self.cache[symbol]
        
        if symbol not in self.available_models:
            raise ModelNotFoundError(f"No model for {symbol}")
        
        # Load model + scaler
        model_path = self.available_models[symbol]
        scaler_path = model_path.parent / f"{symbol}_log_scaler.joblib"
        
        model = load_model(model_path)
        scaler = LogPriceScaler.load(scaler_path)
        
        self.cache[symbol] = (model, scaler)
        return (model, scaler)
    
    def get_available_stocks(self) -> List[str]:
        """Return list of stocks with trained models."""
        return list(self.available_models.keys())
```

### 3. Batch Prediction Endpoint

```python
POST /api/v4/predict/batch
{
  "symbols": ["SCOM", "EQTY", "KCB"],
  "horizon": "10d"
}

Response:
{
  "predictions": [
    {"symbol": "SCOM", "prediction": 17.8, ...},
    {"symbol": "EQTY", "prediction": 48.5, ...},
    {"symbol": "KCB", "prediction": 39.2, ...}
  ],
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "total_time": 0.35
  }
}
```

### 4. Sector-Based Prediction

```python
POST /api/v4/predict/sector
{
  "sector": "Banking",  // From CSV
  "horizon": "10d"
}

Response:
{
  "sector": "Banking",
  "stocks": [
    {"symbol": "ABSA", "prediction": null, "error": "Model not trained"},
    {"symbol": "COOP", "prediction": null, "error": "Model not trained"},
    {"symbol": "EQTY", "prediction": 48.5, "mape": 3.68},
    {"symbol": "KCB", "prediction": 39.2, "mape": 4.38},
    ...
  ],
  "trained_count": 2,
  "total_count": 12
}
```

### 5. Model Availability Endpoint

```python
GET /api/v4/models/available

Response:
{
  "total_stocks": 66,
  "trained_models": 5,
  "available_stocks": ["SCOM", "EQTY", "KCB", "BAMB", "EABL"],
  "models_by_sector": {
    "Banking": ["EQTY", "KCB"],
    "Telecommunication": ["SCOM"],
    "Manufacturing": ["EABL"],
    "Construction": ["BAMB"]
  },
  "model_version": "v4_log",
  "training_date": "2024-11-18"
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Day 1-2)

1. **Create Model Registry Service**
   ```
   ml/api/services/model_registry.py
   - StockModelRegistry class
   - LRU caching
   - Model scanning
   ```

2. **Create Stock-Specific Prediction Route**
   ```
   ml/api/routes/stock_predict_v4.py
   - Single prediction endpoint
   - Batch prediction endpoint
   - Sector-based prediction
   ```

3. **Update FastAPI Main**
   ```python
   # ml/api/main.py
   from api.services.model_registry import StockModelRegistry
   from api.routes import stock_predict_v4
   
   app = FastAPI()
   
   @app.on_event("startup")
   async def startup():
       app.state.model_registry = StockModelRegistry(
           models_dir="trained_models/stock_specific_v4_log",
           cache_size=20  # Keep 20 models in memory
       )
   
   app.include_router(stock_predict_v4.router, prefix="/api/v4")
   ```

### Phase 2: Next.js Integration (Day 3)

1. **Update ML Client**
   ```typescript
   // lib/api/ml-client.ts
   export class MLClient {
       async predictStock(symbol: string, horizon: string = '10d') {
           const response = await fetch(`${ML_API}/api/v4/predict`, {
               method: 'POST',
               body: JSON.stringify({ symbol, horizon })
           });
           return response.json();
       }
       
       async predictStockBatch(symbols: string[], horizon: string = '10d') {
           const response = await fetch(`${ML_API}/api/v4/predict/batch`, {
               method: 'POST',
               body: JSON.stringify({ symbols, horizon })
           });
           return response.json();
       }
       
       async getAvailableModels() {
           const response = await fetch(`${ML_API}/api/v4/models/available`);
           return response.json();
       }
   }
   ```

2. **Update Next.js Route**
   ```typescript
   // app/api/ml/predict/route.ts
   export async function POST(request: NextRequest) {
       const { symbols, horizon = '10d' } = await request.json();
       
       const mlClient = new MLClient();
       const predictions = await mlClient.predictStockBatch(symbols, horizon);
       
       // Persist to database
       for (const pred of predictions.predictions) {
           await prisma.lSTMPrediction.create({
               data: {
                   symbol: pred.symbol,
                   prediction: pred.prediction,
                   modelVersion: 'v4_log',
                   horizon: pred.horizon,
                   mape: pred.mape
               }
           });
       }
       
       return NextResponse.json(predictions);
   }
   ```

### Phase 3: Frontend Integration (Day 4)

1. **Create Stock Selector Component**
   ```typescript
   // components/StockSelector.tsx
   export function StockSelector() {
       const [availableStocks, setAvailableStocks] = useState([]);
       
       useEffect(() => {
           fetch('/api/ml/models/available')
               .then(r => r.json())
               .then(data => setAvailableStocks(data.available_stocks));
       }, []);
       
       return (
           <Select>
               {availableStocks.map(stock => (
                   <SelectItem key={stock} value={stock}>
                       {stock}
                   </SelectItem>
               ))}
           </Select>
       );
   }
   ```

2. **Update Portfolio Predictions**
   ```typescript
   // app/portfolios/[id]/page.tsx
   async function getPredictions(stocks: string[]) {
       const response = await fetch('/api/ml/predict', {
           method: 'POST',
           body: JSON.stringify({
               symbols: stocks,
               horizon: '10d'
           })
       });
       return response.json();
   }
   ```

---

## Model Training Strategy

### Current Status
```
✅ Trained: 5 stocks
⏳ Remaining: 61 stocks
```

### Priority Tiers

**Tier 1 (High Volume - Train First)**: 15 stocks
```
Banking (5): ABSA, COOP, DTK, NCBA, SCBK
Top 10 by market cap from other sectors
```

**Tier 2 (Medium Volume)**: 25 stocks
```
Remaining banking stocks
Insurance sector (6 stocks)
Construction sector (remaining 4)
```

**Tier 3 (Low Volume)**: 26 stocks
```
Smaller cap stocks
Less liquid stocks
```

### Training Schedule

```bash
# Week 1: Tier 1 (15 stocks) - ~4 hours
python3 ml/train_stock_specific_v4_log.py --stocks ABSA COOP DTK NCBA SCBK

# Week 2: Tier 2 (25 stocks) - ~6 hours
python3 ml/train_stock_specific_v4_log.py --stocks [tier2_list]

# Week 3: Tier 3 (26 stocks) - ~6 hours
python3 ml/train_stock_specific_v4_log.py --stocks [tier3_list]
```

---

## Performance Considerations

### Model Loading Performance

```python
# Cold Start (first request)
- Load model from disk: ~100ms
- Load scaler: ~10ms
- Total: ~110ms

# Warm Cache (subsequent requests)
- Retrieve from LRU cache: ~1ms
- Total: ~1ms

# Prediction
- LSTM inference: ~20ms
- Post-processing: ~5ms
- Total: ~25ms
```

### Scalability

```
Memory per model: ~50MB (model) + ~1MB (scaler) = ~51MB
Cache size: 20 models × 51MB = ~1GB RAM

For 66 stocks:
- All models in memory: ~3.4GB (not practical)
- With LRU cache (20): ~1GB (practical)
- Hit rate: 95%+ (most users query same stocks)
```

### Caching Strategy

```python
# LRU Cache Configuration
cache_size = min(20, total_trained_models)

# Most requested stocks stay in cache:
# - SCOM (highest volume)
# - EQTY, KCB (banking)
# - EABL (manufacturing)
# - Top 15 by market cap

# Less requested stocks:
# - Loaded on-demand
# - Evicted from cache when not used
# - Cold start latency acceptable for rare stocks
```

---

## Error Handling

### Model Not Found

```python
{
  "error": "model_not_found",
  "detail": "No trained model for symbol ABSA",
  "available_stocks": ["SCOM", "EQTY", "KCB", "BAMB", "EABL"],
  "suggestion": "Use one of the available stocks or request model training"
}
```

### Prediction Failure

```python
{
  "error": "prediction_failed",
  "detail": "Insufficient historical data (need 60 days, got 30)",
  "symbol": "SCOM",
  "required_samples": 60,
  "provided_samples": 30
}
```

### Partial Batch Failure

```python
{
  "predictions": [
    {"symbol": "SCOM", "prediction": 17.8, ...},
    {"symbol": "EQTY", "prediction": 48.5, ...},
    {"symbol": "ABSA", "error": "model_not_found"}
  ],
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  }
}
```

---

## Testing Strategy

### Unit Tests

```python
# test_model_registry.py
def test_model_loading():
    registry = StockModelRegistry("trained_models/stock_specific_v4_log")
    model, scaler = registry.load_model("SCOM")
    assert model is not None
    assert scaler is not None

def test_model_caching():
    registry = StockModelRegistry("...", cache_size=2)
    registry.load_model("SCOM")
    registry.load_model("EQTY")
    registry.load_model("KCB")  # Should evict SCOM
    assert "KCB" in registry.cache
    assert "EQTY" in registry.cache
```

### Integration Tests

```python
# test_api_endpoints.py
def test_single_prediction():
    response = client.post("/api/v4/predict", json={
        "symbol": "SCOM",
        "horizon": "10d"
    })
    assert response.status_code == 200
    assert "prediction" in response.json()

def test_batch_prediction():
    response = client.post("/api/v4/predict/batch", json={
        "symbols": ["SCOM", "EQTY", "KCB"],
        "horizon": "10d"
    })
    assert response.status_code == 200
    assert len(response.json()["predictions"]) == 3
```

### E2E Tests (Playwright)

```typescript
// e2e/predictions.spec.ts
test('should display stock predictions', async ({ page }) => {
    await page.goto('/portfolio/123');
    await page.click('[data-testid="predict-button"]');
    
    // Wait for predictions
    await page.waitForSelector('[data-testid="prediction-SCOM"]');
    
    // Verify prediction displayed
    const prediction = await page.textContent('[data-testid="prediction-SCOM"]');
    expect(prediction).toContain('KES');
});
```

---

## Migration Plan

### Current State → Target State

```
Current: Global model for all stocks ❌
Target: Stock-specific models with dynamic loading ✅

Migration Steps:
1. Deploy new /api/v4 endpoints (parallel to existing)
2. Update frontend to use /api/v4
3. Monitor performance and errors
4. Once stable, deprecate old endpoints
5. Remove old code after 30 days
```

### Backward Compatibility

```python
# Keep old endpoint for 30 days
@router.post("/lstm", deprecated=True)
async def predict_lstm_legacy(req: LSTMPredictionRequest):
    warnings.warn("This endpoint is deprecated. Use /api/v4/predict")
    # Redirect to new endpoint
    return await predict_stock_v4(req.symbol, "10d")
```

---

## Monitoring & Observability

### Metrics to Track

```
- Requests per stock (which models are used most)
- Cache hit rate (should be >95%)
- Average latency per stock
- Model loading time
- Prediction errors by stock
- API endpoint usage
```

### Logging

```python
logger.info(f"Prediction request: {symbol}, horizon: {horizon}")
logger.info(f"Cache hit: {cache_hit}, latency: {latency}ms")
logger.error(f"Prediction failed for {symbol}: {error}")
```

### Alerts

```
- Cache hit rate < 90% → Increase cache size
- Average latency > 200ms → Investigate slow models
- Error rate > 5% → Check model integrity
```

---

## Summary

### ✅ Recommended Architecture

**Single Dynamic Endpoint** with:
- Model registry for discovery
- LRU caching for performance
- Lazy loading for memory efficiency
- Batch processing for efficiency
- Comprehensive error handling

### ❌ NOT Recommended

- ❌ One endpoint per stock (66 endpoints!)
- ❌ Loading all models at startup (3.4GB RAM)
- ❌ No caching (slow cold starts)
- ❌ Synchronous batch processing

### Next Steps

1. **Immediate**: Implement model registry + v4 prediction endpoint
2. **This Week**: Train Tier 1 stocks (15 models)
3. **Next Week**: Update frontend + integration tests
4. **Month 1**: Train all 66 stocks, full deployment

---

**Status**: Ready for implementation  
**Effort**: 3-4 days for full integration  
**Impact**: Scalable, production-ready prediction system for all NSE stocks

