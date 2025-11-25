# New UI ML Integration Guide

This document describes the complete ML integration for the new UI routes under `/new/(newui)`.

## Overview

The new UI has been enhanced with:
1. **Real market data** from CSV files (NSE data through Oct 2024)
2. **ML prediction capabilities** (LSTM + GARCH) integrated into the market page
3. **Beautiful visualizations** matching the new UI design system
4. **Prediction history page** for viewing historical ML predictions

## Changes Made

### 1. New API Endpoint: `/api/market-data/latest`

**File:** `app/api/market-data/latest/route.ts`

**Purpose:** Fetches the latest stock data from CSV and formats it for the new UI

**Features:**
- Parses `NSE_data_all_stocks_2024_jan_to_oct.csv`
- Maps stock codes to readable sector names (Banking, Telecommunications, Consumer Goods, etc.)
- Returns latest data for each stock
- Calculates market cap estimates
- Sorts by market cap descending

**Response Format:**
```json
{
  "stocks": [
    {
      "symbol": "SCOM",
      "name": "Safaricom PLC",
      "sector": "Telecommunications",
      "currentPrice": 28.50,
      "change": 0.45,
      "changePercent": 1.60,
      "volume": 5234000,
      "marketCap": 1140000000000
    }
  ],
  "lastUpdated": "2025-11-10T19:54:21Z",
  "dataDate": "31-Oct-2024",
  "totalStocks": 68
}
```

### 2. Enhanced Stock Table Component

**File:** `components/figma/StockTableWithML.tsx`

**New Features:**
- ✅ Checkbox column for multi-stock selection
- ✅ "Select all" functionality
- ✅ ML prediction button with loading states
- ✅ Visual feedback for selected rows (orange highlight)
- ✅ Error handling and display
- ✅ Maintains new UI design (border styling, colors, typography)

**Integration:**
- Calls `/api/ml/prepare-data` to fetch historical data
- Calls `/api/ml/predict` to run LSTM + GARCH predictions
- Triggers callback with prediction results

### 3. ML Prediction Results Modal

**File:** `components/figma/MLPredictionModal.tsx`

**Features:**
- ✅ Large modal showing all predictions in grid layout
- ✅ LSTM price predictions with trend indicators
- ✅ GARCH volatility forecasts with risk levels
- ✅ Expected price change percentage
- ✅ Price range context
- ✅ Interpretation summaries
- ✅ Batch summary stats at bottom
- ✅ Matches new UI design system (colors, borders, spacing)

**Visual Elements:**
- 🟢 Green for bullish predictions
- 🔴 Red for bearish predictions
- 🔵 Blue for volatility metrics
- 🟡 Warning/Moderate risk indicators

### 4. Updated Market Overview Page

**File:** `app/new/(newui)/market/page.tsx`

**Changes:**
- ✅ Replaced `mockStocks` with real data from API
- ✅ Loading state with spinner
- ✅ Error state with retry button
- ✅ Data date badge showing "Data as of: 31-Oct-2024"
- ✅ Integrated `StockTableWithML` component
- ✅ ML prediction modal integration
- ✅ Real-time sector calculations from actual data

**New State Management:**
```typescript
const [stocks, setStocks] = useState<Stock[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [predictions, setPredictions] = useState<CombinedPrediction[]>([]);
const [showPredictions, setShowPredictions] = useState(false);
const [dataDate, setDataDate] = useState<string>("");
```

### 5. ML Predictions History Page

**File:** `app/new/(newui)/ml-predictions/page.tsx`

**Features:**
- ✅ Search by stock symbol
- ✅ Tab navigation between LSTM and GARCH
- ✅ Grid layout for prediction cards
- ✅ Date formatting with calendar icons
- ✅ Risk level color coding
- ✅ Summary statistics at bottom
- ✅ Refresh functionality
- ✅ Loading and empty states

**URL:** `/new/ml-predictions`

## User Flow

### Running Predictions

1. User navigates to `/new/market`
2. Market data loads automatically from CSV
3. User selects one or more stocks using checkboxes
4. User clicks "Run ML Predictions" button
5. System prepares historical data (60 days for LSTM, 200 for GARCH)
6. System runs predictions in parallel
7. Modal displays results with:
   - Price predictions
   - Volatility forecasts
   - Risk assessments
   - Interpretations
8. Predictions are automatically saved to database

### Viewing History

1. User navigates to `/new/ml-predictions`
2. Historical predictions load automatically
3. User can:
   - Search by symbol
   - Toggle between LSTM and GARCH tabs
   - Refresh data
   - View summary stats

## Design System Consistency

### Colors
- **Primary Orange:** `#F79D00` (brand color)
- **Success/Bullish:** `text-success` (green)
- **Destructive/Bearish:** `text-destructive` (red)
- **Info/Volatility:** `text-info` (blue)
- **Warning/Moderate:** `text-warning` (yellow)

### Typography
- **Headings:** `h1`, `h3`, `h4` classes
- **Body:** `text-muted-foreground`
- **Labels:** `text-sm text-muted-foreground`

### Spacing
- **Cards:** `p-6` padding, `space-y-6` gap
- **Grid:** `gap-4` for cards, `gap-6` for sections

### Components
- All using shadcn/ui components
- Consistent border radius with `rounded-lg`
- Border color: `border-border`
- Background: `bg-card`, `bg-muted/30`

## Data Considerations

### CSV Data Limitations
- **Latest Date:** October 31, 2024
- **Data Range:** January 2024 - October 2024
- **Total Stocks:** 68 NSE stocks
- **Required Days:** Minimum 60 for LSTM, 200 for GARCH

### Sector Mapping
Automatic sector classification based on stock codes:
- Banking: ABSA, EQTY, KCB, COOP, etc.
- Telecommunications: SCOM
- Consumer Goods: EABL, BAT
- Construction: BAMB, ARMN
- Insurance: BRIT, CIC, JUB
- Manufacturing: TOTL, BATA
- Energy: KEGN, KPLC
- Agriculture: KAPC, KAKZ, SASN
- Investment: EVRD, OLMP
- Other: Unclassified stocks

## Testing Checklist

### Market Overview Page
- [ ] Page loads without errors
- [ ] Real stock data displays correctly
- [ ] Sector heatmap uses real data
- [ ] Data date badge shows correctly
- [ ] Refresh button works
- [ ] Error handling displays properly
- [ ] Loading state shows spinner

### ML Predictions
- [ ] Can select single stock
- [ ] Can select multiple stocks
- [ ] Select all checkbox works
- [ ] Prediction button enables/disables correctly
- [ ] Loading state shows during prediction
- [ ] Modal opens with results
- [ ] LSTM predictions display correctly
- [ ] GARCH forecasts display correctly
- [ ] Risk levels calculated properly
- [ ] Interpretations are accurate
- [ ] Predictions saved to database

### Predictions History
- [ ] Page loads historical data
- [ ] Search by symbol works
- [ ] Tab switching works
- [ ] Cards display correct data
- [ ] Summary stats are accurate
- [ ] Refresh button works
- [ ] Empty states display properly

## Troubleshooting

### "Failed to load market data"
**Cause:** CSV file not found or parse error

**Solution:**
```bash
# Verify CSV exists
ls ml/datasets/NSE_data_all_stocks_2024_jan_to_oct.csv

# Check file permissions
chmod 644 ml/datasets/NSE_data_all_stocks_2024_jan_to_oct.csv
```

### "Insufficient data for prediction"
**Cause:** Stock doesn't have 60+ days of data

**Solution:**
- Only select stocks with sufficient historical data
- Check CSV for stock's date range
- Consider using different stock

### Modal not opening after prediction
**Cause:** State management issue

**Solution:**
- Check browser console for errors
- Verify `onPredictionsComplete` callback is working
- Ensure modal component is imported correctly

### Styling inconsistencies
**Cause:** CSS classes not matching design system

**Solution:**
- Use Tailwind classes from new UI design tokens
- Reference existing new UI components for patterns
- Ensure shadcn/ui components are installed

## Deployment

### Database Migration
Before deploying, run migrations to create ML prediction tables:
```bash
npx prisma migrate dev --name add_ml_predictions
npx prisma generate
```

### Environment Variables
No new environment variables required (uses existing):
```env
NEXT_PUBLIC_ML_API_URL=http://localhost:8000  # or production URL
DATABASE_URL=postgresql://...
```

### Build & Start
```bash
# Install dependencies
npm install

# Build application
npm run build

# Start production server
npm start
```

## Performance Optimizations

### Data Loading
- ✅ CSV parsed server-side (Node.js)
- ✅ Latest data cached per request
- ✅ Stocks sorted by market cap for relevance

### ML Predictions
- ✅ Batch processing with parallel execution
- ✅ Historical data prepared once per batch
- ✅ Database persistence doesn't block responses

### UI Rendering
- ✅ Loading states prevent UI blocking
- ✅ Modal lazy-loaded on demand
- ✅ Grid layout responsive to screen size

## Future Enhancements

### Potential Improvements

1. **Real-time Data**
   - WebSocket integration for live price updates
   - Auto-refresh market data every N seconds
   - Push notifications for predictions

2. **Advanced Filtering**
   - Filter by sector in predictions history
   - Date range picker for historical view
   - Sort by volatility, price change, etc.

3. **Comparison Views**
   - Compare predicted vs actual prices
   - Prediction accuracy metrics
   - Model performance dashboard

4. **Export Functionality**
   - Download predictions as CSV/Excel
   - Generate PDF reports
   - Share predictions via email

5. **User Preferences**
   - Save favorite stocks for quick access
   - Customize prediction parameters
   - Set up alert thresholds

## Related Documentation

- [Main ML Frontend Integration Guide](ML_FRONTEND_INTEGRATION.md)
- [ML API Documentation](ml/API_UPDATE_GUIDE.md)
- [LSTM/GARCH Testing Guide](ml/scripts/TESTING_GUIDE.md)
- [Swagger Test Data](ml/SWAGGER_TEST_DATA.md)

## Support

For issues with the new UI integration:
1. Check browser console for errors
2. Verify ML API is running (`http://localhost:8000/api/v1/docs`)
3. Check database connectivity
4. Review CSV file format and content
5. Consult main integration guide for backend issues
