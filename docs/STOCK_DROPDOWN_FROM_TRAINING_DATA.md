# Stock Dropdown from Training Data

## Overview

The stock dropdown in the Stock Analysis page now dynamically loads all available stocks from the actual training data CSV files, organized by their sectors.

## Implementation

### Files Created

1. **`lib/api/get-available-stocks.ts`**
   - Reads `NSE_data_all_stocks_2024_jan_to_oct.csv` for stock codes and names
   - Reads `NSE_data_stock_market_sectors_2023_2024.csv` for sector classifications
   - Merges data to provide complete stock information
   - Exports functions:
     - `getAvailableStocks()` - Returns all stocks as flat array
     - `getStocksBySector()` - Returns stocks grouped by sector

2. **`app/api/stocks/available/route.ts`**
   - New API endpoint: `GET /api/stocks/available`
   - Query parameter: `grouped=true` for sector-grouped response
   - Returns stock data in JSON format

### Files Modified

3. **`app/new/(newui)/stock-analysis/page.tsx`**
   - Removed dependency on `mockStocks` 
   - Added state for available stocks and sector grouping
   - Fetches stocks from API on component mount
   - Dropdown now uses `<optgroup>` for sector organization
   - Shows stock count in page header

## Features

### 1. Dynamic Stock Loading

```typescript
// Fetches on component mount
useEffect(() => {
  const fetchAvailableStocks = async () => {
    const response = await fetch('/api/stocks/available?grouped=true');
    const result = await response.json();
    setStocksBySector(result.data);
    // ... flatten and set availableStocks
  };
  fetchAvailableStocks();
}, []);
```

### 2. Sector-Grouped Dropdown

The dropdown organizes stocks by sector using HTML `<optgroup>`:

```
Banking (11)
  ├─ ABSA - ABSA Bank Kenya Plc
  ├─ COOP - Co-operative Bank of Kenya Ltd
  ├─ EQTY - Equity Group Holdings Plc
  └─ ...

Telecommunication and Technology (1)
  └─ SCOM - Safaricom Plc

Agricultural (6)
  ├─ KUKZ - Kakuzi Plc
  ├─ SASN - Sasini Plc
  └─ ...
```

### 3. Stock Information Display

- **Header**: Shows total stock count (e.g., "• 67 stocks from training data")
- **Dropdown**: Shows sector, code, and full company name
- **Loading State**: "Loading stocks from training data..." while fetching

## API Endpoints

### GET /api/stocks/available

**Response (flat list):**
```json
{
  "grouped": false,
  "data": [
    {
      "code": "SCOM",
      "name": "Safaricom Plc",
      "sector": "Telecommunication and Technology"
    },
    ...
  ],
  "total": 67
}
```

**Response (grouped by sector):**
```json
{
  "grouped": true,
  "sectors": ["Agricultural", "Banking", ...],
  "data": {
    "Banking": [
      { "code": "ABSA", "name": "ABSA Bank Kenya Plc", "sector": "Banking" },
      ...
    ],
    "Agricultural": [
      { "code": "KUKZ", "name": "Kakuzi Plc", "sector": "Agricultural" },
      ...
    ]
  },
  "total": 67
}
```

## Data Sources

### Primary CSV: Stock Prices
**File**: `ml/datasets/NSE_data_all_stocks_2024_jan_to_oct.csv`

**Structure**:
```csv
Date,Code,Name,12m Low,12m High,Day Low,Day High,Day Price,Previous,Change,Change%,Volume,Adjusted Price
2-Jan-2024,SCOM,Safaricom Plc,10.00,30.00,28.50,28.50,28.50,28.00,0.50,1.79%,"1,000,000.00",-
```

**Used for**: Extracting stock codes and company names

### Secondary CSV: Sectors
**File**: `ml/datasets/NSE_data_stock_market_sectors_2023_2024.csv`

**Structure**:
```csv
Sector,Stock_code,Stock_name
Banking,ABSA,ABSA Bank Kenya Plc
Banking,EQTY,Equity Group Holdings Plc
Telecommunication and Technology,SCOM,Safaricom Plc
```

**Used for**: Sector classification and authoritative stock names

## Sectors Available

From the training data, stocks are categorized into:

1. **Agricultural** (6 stocks)
   - Kakuzi, Sasini, Williamson Tea, etc.

2. **Banking** (11 stocks)
   - ABSA, Co-op Bank, Equity, KCB, NCBA, etc.

3. **Commercial and Services** (12 stocks)
   - Kenya Airways, NMG, Standard Group, etc.

4. **Construction and Allied** (9 stocks)
   - Bamburi Cement, Crown Paints, East African Cables, etc.

5. **Energy and Petroleum** (5 stocks)
   - KenGen, KPLC, TotalEnergies, Umeme, etc.

6. **Insurance** (8 stocks)
   - Britam, CIC, Jubilee, Liberty, etc.

7. **Investment** (4 stocks)
   - Centum, Olympia, Trans-Century, etc.

8. **Manufacturing and Allied** (8 stocks)
   - BAT, Carbacid, EABL, Unga, etc.

9. **Real Estate Investment Trusts** (3 stocks)
   - Fahari I-REIT, Ilam Fahari I-REIT, etc.

10. **Telecommunication and Technology** (1 stock)
    - Safaricom

## Benefits

### 1. Data Consistency
- ✅ Dropdown matches training data exactly
- ✅ No manual synchronization needed
- ✅ Automatic updates when CSV is refreshed

### 2. User Experience
- ✅ Organized by sector for easy navigation
- ✅ Shows sector and stock count
- ✅ Full company names displayed
- ✅ Loading state while fetching

### 3. Scalability
- ✅ Handles any number of stocks
- ✅ Supports adding new sectors
- ✅ No code changes needed when data updates

## Error Handling

### Fallback Mechanism
If API fails, uses hardcoded fallback:

```typescript
setAvailableStocks([
  { code: 'SCOM', name: 'Safaricom Plc', sector: 'Telecommunication and Technology' },
  { code: 'EQTY', name: 'Equity Group Holdings Plc', sector: 'Banking' },
  { code: 'KCB', name: 'KCB Group Plc', sector: 'Banking' },
]);
```

### Loading States
- Dropdown shows "Loading stocks from training data..."
- Dropdown disabled during loading
- Error logged to console

### Missing Sector Data
- If sector CSV not found, stocks still load (without sector info)
- Flat list fallback displays stocks with available information

## CSV Parsing

Handles complex CSV formats:
- **Quoted fields**: `"176,500.00"` (commas inside quotes)
- **Multiple columns**: Extracts only Code and Name
- **Case variations**: Handles both `Code` and `CODE` columns
- **Duplicate detection**: Uses Map to ensure unique stocks

## Testing

### Manual Test
1. Navigate to Stock Analysis page
2. Click stock dropdown
3. **Expected**:
   - Dropdown shows sectors as groups
   - Each sector shows stock count
   - Stocks sorted by code within sector
   - Header shows total count (e.g., "67 stocks")

### API Test
```bash
# Get flat list
curl http://localhost:3000/api/stocks/available

# Get grouped by sector
curl http://localhost:3000/api/stocks/available?grouped=true
```

### Verification
- All stocks from `NSE_data_all_stocks_2024_jan_to_oct.csv` appear
- Sector information matches `NSE_data_stock_market_sectors_2023_2024.csv`
- No mock data dependencies

## Future Enhancements

1. **Search Functionality**
   - Add search/filter in dropdown
   - Fuzzy search by code or name

2. **Stock Details**
   - Show additional info (12m high/low, volume)
   - Add stock descriptions

3. **Favorites**
   - Allow users to star/favorite stocks
   - Quick access to frequently analyzed stocks

4. **Performance**
   - Cache API response
   - Lazy load dropdown options
   - Virtual scrolling for large lists

5. **Real-time Data**
   - WebSocket integration for live prices
   - Auto-refresh stock list

## Summary

✅ **Before**: Dropdown used hardcoded mock data (5 stocks)  
✅ **After**: Dropdown loads from training CSV (67 stocks)  
✅ **Benefit**: Always in sync with available training data  
✅ **UX**: Organized by sector with full company names

The dropdown now represents the **actual universe of stocks** the ML models were trained on, ensuring predictions are only attempted for stocks with sufficient historical data.

## Date

November 10, 2025


