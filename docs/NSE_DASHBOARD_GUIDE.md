# NSE Financial Dashboard Guide

## Overview
The landing page has been redesigned as a comprehensive one-stop financial dashboard for the Nairobi Stock Exchange (NSE), featuring only widgets that display actual NSE data.

## Dashboard Sections

### 1. Hero Section
- **Title:** "Nairobi Stock Exchange Dashboard"
- **Description:** Sets the context for users visiting the dashboard

### 2. NSE Market Overview
- **Widget Type:** Market Overview
- **Features:**
  - Three tabbed sections: Banking, Manufacturing, Telecom & Energy
  - Mini price charts for each stock
  - Real-time price updates
  - 12-month historical view
- **Stocks Displayed:**
  - **Banking:** EQTY, KCB, ABSA, COOP, SCBK, NCBA
  - **Manufacturing:** EABL, BAMB, BAT, UNGA, CARB, BOC
  - **Telecom & Energy:** SCOM, KPLC, KEGN, TOTL, KUKZ, HAFR

### 3. Live Stock Quotes
- **Widget Type:** Market Quotes
- **Features:**
  - Real-time price updates
  - Trading volume
  - Price changes (absolute and percentage)
  - Multiple sector tabs
- **Organized by Sectors:**
  - Banking (6 stocks)
  - Telecommunications (1 stock)
  - Manufacturing & Energy (6 stocks)
  - Insurance & Investment (5 stocks)

### 4. Featured Stock Analysis
Interactive section allowing users to select from featured NSE stocks for detailed analysis.

#### Stock Selector
- **Featured Stocks:**
  - Safaricom PLC (NSE:SCOM)
  - Equity Group Holdings (NSE:EQTY)
  - KCB Group (NSE:KCB)
  - East African Breweries (NSE:EABL)

#### Stock Analysis Widgets

##### a) Symbol Info Widget
- Current price
- Daily change
- Volume
- Market cap
- Quick stats

##### b) Advanced Price Chart
- **Widget Type:** Advanced Chart
- **Features:**
  - Interactive candlestick/line charts
  - Multiple timeframes (1D, 1W, 1M, 3M, 1Y, All)
  - Technical indicators
  - Drawing tools
  - Volume overlay
  - Full TradingView charting capabilities

##### c) Technical Analysis
- **Widget Type:** Technical Analysis
- **Features:**
  - Buy/Sell/Neutral signals
  - Moving averages analysis
  - Technical indicators summary
  - Oscillators
  - Real-time recommendations

##### d) Company Profile
- **Widget Type:** Symbol Profile
- **Features:**
  - Company description
  - Sector and industry
  - Number of employees
  - Headquarters location
  - Company website
  - Key executives

##### e) Fundamental Data
- **Widget Type:** Financials
- **Features:**
  - Financial statements
  - Income statement
  - Balance sheet
  - Cash flow
  - Key financial ratios
  - Quarterly and annual data

## Removed Widgets (Not NSE Compatible)

The following widgets were removed because TradingView doesn't support them for NSE:

1. **Stock Heatmap** - No NSE-specific heatmap available
2. **Timeline/Top Stories** - Limited news coverage for NSE

## Technical Implementation

### Technology Stack
- **Framework:** Next.js 14+ with React
- **UI Components:** TradingView Widgets
- **State Management:** React useState hooks
- **Styling:** Tailwind CSS

### Widget Configuration
All widget configurations are centralized in `lib/constants/index.ts`:

```typescript
// Market Overview - Shows multiple NSE stocks in tabs
MARKET_OVERVIEW_WIDGET_CONFIG

// Live Quotes - Real-time stock prices
MARKET_DATA_WIDGET_CONFIG

// Individual Stock Analysis
SYMBOL_INFO_WIDGET_CONFIG(symbol)
CANDLE_CHART_WIDGET_CONFIG(symbol)
TECHNICAL_ANALYSIS_WIDGET_CONFIG(symbol)
COMPANY_PROFILE_WIDGET_CONFIG(symbol)
COMPANY_FINANCIALS_WIDGET_CONFIG(symbol)
```

### Responsive Design
- **Mobile:** Single column layout, stacked widgets
- **Tablet:** 2-column grid for some sections
- **Desktop:** 3-column grid for featured stock analysis

## User Experience Flow

1. **Landing** → User sees NSE Market Overview
2. **Browse** → User scrolls through live stock quotes
3. **Select** → User clicks featured stock button
4. **Analyze** → All widgets update to show selected stock data
5. **Deep Dive** → User explores charts, technical analysis, and fundamentals

## Widget Update Behavior

When a user selects a different featured stock:
- Symbol Info updates instantly
- Price Chart reloads with new stock data
- Technical Analysis recalculates
- Company Profile displays new company info
- Fundamental Data shows new financial statements

## Performance Considerations

- **Widget Memoization:** TradingViewWidget component uses React.memo
- **Lazy Loading:** Widgets load asynchronously
- **Script Caching:** TradingView scripts are cached by browser
- **Height Optimization:** Fixed heights prevent layout shifts

## Browser Compatibility

- Chrome/Edge: Full support ✅
- Firefox: Full support ✅
- Safari: Full support ✅
- Mobile browsers: Full support ✅

## Data Update Frequency

- **Real-time quotes:** Updates every few seconds during market hours
- **Charts:** Real-time with minimal delay
- **Technical indicators:** Updates with each price change
- **Fundamental data:** Updates quarterly/annually

## NSE Market Hours

The dashboard is most useful during NSE trading hours:
- **Trading Days:** Monday - Friday
- **Trading Hours:** 9:00 AM - 3:00 PM EAT (East Africa Time)
- **Pre-market:** Data from previous close displayed
- **Post-market:** Last traded prices displayed

## Customization Options

### Adding More Featured Stocks
Edit `app/(root)/landing/page.tsx`:

```typescript
const featuredStocks = [
    { symbol: "NSE:SCOM", name: "Safaricom PLC" },
    { symbol: "NSE:EQTY", name: "Equity Group" },
    { symbol: "NSE:KCB", name: "KCB Group" },
    { symbol: "NSE:EABL", name: "EABL" },
    // Add more stocks here
];
```

### Modifying Widget Heights
Adjust the `height` prop on any TradingViewWidget component:

```tsx
<TradingViewWidget
    height={600}  // Change this value
    // ... other props
/>
```

### Changing Color Theme
All widgets are configured with `colorTheme: 'dark'` by default. To change:

```typescript
export const MARKET_OVERVIEW_WIDGET_CONFIG = {
    colorTheme: 'light', // or 'dark'
    // ... other config
};
```

## Future Enhancements

Potential additions to the dashboard:

1. **Search Functionality** - Allow users to search any NSE stock
2. **Watchlist Feature** - Save favorite stocks
3. **Price Alerts** - Notify users of price movements
4. **Comparison Tool** - Compare multiple NSE stocks side-by-side
5. **Custom Screeners** - Filter stocks by criteria
6. **Portfolio Tracker** - Track personal stock holdings
7. **News Feed** - Integrate NSE-specific news (if API available)
8. **Market Indices** - Display NSE 20, NSE 25, NASI indices

## Support

For issues or questions:
- Check TradingView widget documentation
- Verify stock symbols are correct (format: NSE:TICKER)
- Ensure internet connection during market hours
- Clear browser cache if widgets don't load

## Credits

- **Data Provider:** TradingView
- **Market:** Nairobi Securities Exchange (NSE)
- **Framework:** Next.js by Vercel
