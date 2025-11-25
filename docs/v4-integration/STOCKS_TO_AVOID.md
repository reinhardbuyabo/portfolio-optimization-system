# Stocks to Avoid - Prediction Failure Reference

**Date:** November 19, 2024  
**Purpose:** Document stocks that will cause "prediction failed" errors  
**V4 Model Coverage:** 60/73 stocks (82%)

---

## Summary

**Total NSE stocks in datasets:** 73  
**V4 Model coverage:** 60 stocks (82%)  
**Stocks that will fail:** 14 stocks (18%)  

---

## ✅ Stocks with V4 Model Coverage (60 stocks)

These stocks will work perfectly with V4 predictions:

### Stock-Specific Models (16 stocks - Best Accuracy)
1. **ABSA** - Absa Bank Kenya
2. **BAMB** - Bamburi Cement
3. **BRIT** - Britam Holdings
4. **CIC** - CIC Insurance Group
5. **COOP** - Co-operative Bank
6. **DTK** - Diamond Trust Bank
7. **EABL** - East African Breweries (MAPE: 2.87%)
8. **EQTY** - Equity Group Holdings (MAPE: 4.69%)
9. **KCB** - KCB Group (MAPE: 4.89%)
10. **KEGN** - Kenya Electricity Generating Company
11. **KPLC** - Kenya Power & Lighting
12. **NBK** - National Bank of Kenya
13. **NCBA** - NCBA Group
14. **SCBK** - Standard Chartered Bank Kenya
15. **SCOM** - Safaricom (MAPE: 8.95%)
16. **TOTL** - TotalEnergies Marketing Kenya (MAPE: 4.73%)

### General Model (44 additional stocks - Good Accuracy ~4.5% MAPE)
17. BKG - BK Group
18. BOC - Bank of Ceylon
19. CABL - Cable & Wireless
20. CARB - Carbacid Investments
21. CGEN - Car and General
22. CRWN - Crown Paints Kenya
23. CTUM - Centum Investment Company
24. DCON - Deacons East Africa
25. EGAD - Eaagads
26. EVRD - Eveready East Africa
27. FTGH - Flame Tree Group Holdings
28. GLD - Longhorn Publishers
29. HAFR - Home Afrika
30. HBE - HF Group
31. HFCK - Housing Finance Company of Kenya
32. IMH - I&M Holdings
33. KAPC - Kapchorua Tea
34. KNRE - Kenya Re
35. KPLC-P4 - Kenya Power Preference Share Series 4
36. KPLC-P7 - Kenya Power Preference Share Series 7
37. KQ - Kenya Airways
38. KUKZ - Kakuzi
39. KURV - Kurwitu Ventures
40. LBTY - Liberty Kenya Holdings
41. LIMT - Limuru Tea
42. LKL - Longhorn Publishers
43. MSC - MUA Insurance
44. NBV - Nairobi Business Ventures
45. NSE - Nairobi Securities Exchange
46. OCH - Olympia Capital Holdings
47. ORCH - Orchards
48. PORT - East African Portland Cement
49. SASN - Sasini
50. SBIC - Stanbic Holdings
51. SCAN - Scangroup
52. SGL - Stanbic Group
53. SLAM - Sameer Africa
54. SMER - Sameer Africa
55. TCL - Trans-Century
56. TPSE - TPS Eastern Africa (Serena)
57. UCHM - Uchumi Supermarkets
58. UMME - Umeme
59. WTK - Williamson Tea Kenya
60. XPRS - Express Kenya

---

## ❌ Stocks That Will FAIL V4 Predictions (14 stocks)

These stocks are in the NSE dataset but **NOT** covered by V4 models. Using them will result in errors.

### Individual Stocks (7 stocks)

1. **ARM** - ARM Cement
   - **Status:** Delisted/Inactive
   - **Error:** "No model found for symbol 'ARM'"
   - **Recommendation:** Remove from portfolios

2. **BAT** - British American Tobacco Kenya
   - **Status:** Active but not in V4 training set
   - **Error:** "No model found for symbol 'BAT'"
   - **Fallback:** Will use V1 general model if available

3. **FAHR** - Fahari I-REIT
   - **Status:** Active but not in V4 training set
   - **Error:** "No model found for symbol 'FAHR'"
   - **Fallback:** Will use V1 general model if available

4. **JUB** - Jubilee Holdings
   - **Status:** Active but not in V4 training set
   - **Error:** "No model found for symbol 'JUB'"
   - **Fallback:** Will use V1 general model if available

5. **KENO** - Kenya Orient Insurance
   - **Status:** Active but not in V4 training set
   - **Error:** "No model found for symbol 'KENO'"
   - **Fallback:** Will use V1 general model if available

6. **NMG** - Nation Media Group
   - **Status:** Active but not in V4 training set
   - **Error:** "No model found for symbol 'NMG'"
   - **Fallback:** Will use V1 general model if available

7. **UNGA** - Unga Group
   - **Status:** Active but not in V4 training set
   - **Error:** "No model found for symbol 'UNGA'"
   - **Fallback:** Will use V1 general model if available

### Market Indices (7 indices - Should NOT be used for predictions)

8. **^FNK15** - NSE Fidelity Kenya 15 Index
9. **^FNK25** - NSE Fidelity Kenya 25 Index
10. **^N20I** - NSE 20 Share Index
11. **^N25I** - NSE 25 Share Index
12. **^NASI** - NSE All Share Index
13. **^ZKEQTK** - FTSE NSE Kenya 15 Index
14. **^ZKEQTU** - FTSE NSE Kenya 25 Index

**Note:** Indices (^) are market benchmarks, not individual stocks. They should never be used for stock price predictions.

---

## Behavior by Component

### Stock Analysis Page
When user selects a stock that will fail:

**Before (without V4/V1 hybrid):**
```
Error: No model found for symbol 'BAT'
Status: ❌ Prediction failed
```

**After (with V4/V1 hybrid implemented):**
```
Info: Using V1 model for BAT - V4 not available
Status: ✓ Prediction successful (V1 general model)
MAPE: ~15-20% (lower accuracy)
```

### Batch Predictions
Portfolios containing problematic stocks:

**Scenario 1: Portfolio with mixed stocks**
```
Portfolio: SCOM, EQTY, BAT, NMG

Results:
✓ SCOM - V4 specific (8.95% MAPE)
✓ EQTY - V4 specific (4.69% MAPE)
✓ BAT  - V1 general (~15% MAPE)
✓ NMG  - V1 general (~15% MAPE)

Status: All predictions successful with V1 fallback
```

**Scenario 2: Portfolio with indices (WRONG)**
```
Portfolio: SCOM, ^NASI, ^N20I

Results:
✓ SCOM   - V4 specific (8.95% MAPE)
✗ ^NASI  - ERROR (index, not a stock)
✗ ^N20I  - ERROR (index, not a stock)

Status: Partial failure - indices should not be in portfolios
```

---

## Recommendations

### For Application Users

1. **Avoid using indices** (`^` prefix stocks)
   - These are market benchmarks, not individual stocks
   - Cannot predict index prices with stock models

2. **Stocks with V1 fallback acceptable:**
   - BAT, FAHR, JUB, KENO, NMG, UNGA
   - Will work but with lower accuracy (~15-20% MAPE vs 2-9%)

3. **Delisted/inactive stocks to avoid:**
   - ARM (delisted)
   - Check NSE website for current status

### For Developers

1. **Input Validation:**
   ```typescript
   // Reject indices
   if (symbol.startsWith('^')) {
     throw new Error('Market indices cannot be used for predictions');
   }
   
   // Warn about stocks without V4 models
   const problemStocks = ['ARM', 'BAT', 'FAHR', 'JUB', 'KENO', 'NMG', 'UNGA'];
   if (problemStocks.includes(symbol)) {
     console.warn(`Stock ${symbol} will use V1 fallback - lower accuracy`);
   }
   ```

2. **Stock Dropdown Filtering:**
   ```typescript
   // Filter out indices and delisted stocks
   const validStocks = allStocks.filter(s => 
     !s.startsWith('^') && s !== 'ARM'
   );
   ```

3. **User Feedback:**
   ```typescript
   // Show model type in UI
   if (result.model_version === 'v1_general') {
     toast.info(`${symbol} using V1 model - expect lower accuracy`);
   }
   ```

---

## V1 vs V4 Coverage Comparison

| Stock | V4 Coverage | V1 Coverage | Recommended |
|-------|-------------|-------------|-------------|
| SCOM, EQTY, etc. (16) | ✅ Specific | ✅ Yes | V4 (best) |
| BKG, BOC, etc. (44) | ✅ General | ✅ Yes | V4 (good) |
| BAT, NMG, etc. (7) | ❌ No | ✅ Yes | V1 (fallback) |
| ARM | ❌ No | ❌ No | ❌ Avoid |
| ^NASI, ^N20I, etc. (7) | ❌ No | ❌ No | ❌ Never use |

---

## Error Messages Reference

### V4 API Errors

**Error 1: Stock not found**
```json
{
  "detail": "No model found for symbol 'BAT'. Available: ['ABSA', 'BAMB', ...]"
}
```
**Solution:** Use V1 fallback or avoid the stock

**Error 2: Invalid symbol (index)**
```json
{
  "detail": "No model found for symbol '^NASI'"
}
```
**Solution:** Remove indices from stock selection

**Error 3: Insufficient data**
```json
{
  "detail": "Insufficient historical data for prediction (need 60 days, got 30)"
}
```
**Solution:** Stock has incomplete data, use different stock

### Frontend Errors

**Batch Prediction:**
```typescript
// Some stocks may fail in batch
{
  "predictions": [
    { "symbol": "SCOM", "status": "success", ... },
    { "symbol": "BAT", "status": "error", "error": "No V4 model" }
  ],
  "summary": {
    "successful": 1,
    "failed": 1
  }
}
```

---

## Future Improvements

### Priority 1: Train V4 Models for Missing Stocks
Train V4 models for the 7 active stocks:
1. BAT - British American Tobacco
2. FAHR - Fahari I-REIT
3. JUB - Jubilee Holdings
4. KENO - Kenya Orient
5. NMG - Nation Media Group
6. UNGA - Unga Group

**Expected impact:** Increase V4 coverage from 82% to 91%

### Priority 2: Index Filtering
Add validation to reject indices:
```typescript
const INVALID_SYMBOLS = ['^FNK15', '^FNK25', '^N20I', '^N25I', '^NASI', '^ZKEQTK', '^ZKEQTU'];
```

### Priority 3: Stock Status Tracking
Track delisted/inactive stocks:
```typescript
const DELISTED = ['ARM'];
const WARNING_STOCKS = ['BAT', 'NMG', 'JUB', 'FAHR', 'KENO', 'UNGA'];
```

---

## Quick Reference Card

### ✅ Safe to Use (60 stocks)
All stocks listed in "V4 Model Coverage" section

### ⚠️ Use with Caution (7 stocks - V1 fallback)
BAT, FAHR, JUB, KENO, NMG, UNGA, ARM

### ❌ Never Use (7 indices)
^FNK15, ^FNK25, ^N20I, ^N25I, ^NASI, ^ZKEQTK, ^ZKEQTU

### 🔧 How to Check if Stock is Safe
```bash
# Check if stock is in V4 models
curl http://localhost:8000/api/v4/models/available | grep "STOCK_SYMBOL"

# If found: ✅ Safe to use
# If not found: ⚠️ Will use V1 fallback or fail
```

---

## Testing

### Test Successful Prediction (V4)
```bash
curl -X POST http://localhost:8000/api/v4/predict \
  -d '{"symbol":"TOTL","horizon":"10d","recent_prices":[...]}'
# Expected: Success with v4_log_stock_specific or v4_log_general
```

### Test V1 Fallback Stock
```bash
curl -X POST http://localhost:8000/api/v4/predict \
  -d '{"symbol":"BAT","horizon":"10d","recent_prices":[...]}'
# Expected: Error "No model found for symbol 'BAT'"
# Frontend: Should fall back to V1 general model
```

### Test Invalid Index
```bash
curl -X POST http://localhost:8000/api/v4/predict \
  -d '{"symbol":"^NASI","horizon":"10d","recent_prices":[...]}'
# Expected: Error - indices cannot be predicted
```

---

**Last Updated:** November 19, 2024  
**V4 Model Version:** v4_log_hybrid  
**Coverage:** 60/73 stocks (82%)

---

*See also:*
- `ml/TRAINING_COMPLETE_16_MODELS.md` - Training summary
- `docs/v4-integration/README.md` - Integration guide
- `docs/v4-integration/MIGRATION_STATUS.md` - Migration details
