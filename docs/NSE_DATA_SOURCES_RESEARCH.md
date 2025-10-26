# NSE Data Sources Research

## Research Date
October 21, 2025

## Objective
Find reliable NSE (Nairobi Stock Exchange) data sources for the portfolio optimization system, either through public APIs or by creating a custom scraper.

---

## Findings

### 1. TradingView Integration (Current Approach)
**Status:** ✅ **RECOMMENDED - Use this approach**

- TradingView widgets **already support NSE data** using the format `NSE:TICKER`
- No additional APIs or scraping needed
- Real-time data from TradingView's infrastructure
- Professional charts and widgets

**Known NSE Tickers that work with TradingView:**
- `NSE:SCOM` - Safaricom PLC
- `NSE:EQTY` - Equity Group Holdings
- `NSE:KCB` - KCB Group
- `NSE:EABL` - East African Breweries
- `NSE:ABSA` - Absa Bank Kenya
- `NSE:BAMB` - Bamburi Cement

**Implementation:**
Simply update the widget configurations in `lib/constants/index.ts` to use NSE symbols instead of NYSE/NASDAQ symbols.

---

### 2. African Financial Exchange (AFX) Website
**URL:** https://afx.kwayisi.org/nse/  
**Status:** ⚠️ Possible but not recommended

**Pros:**
- Displays live NSE data including:
  - NASI Index (current: 177.72)
  - Market cap (KES 2.8Tr)
  - Individual stock prices, volumes, and changes
  - Top gainers/losers
  - Historical data available

**Cons:**
- No official public API found
- Would require web scraping (HTML parsing)
- HTML structure is complex (4 tables, 69 list items)
- Data extraction tested but challenging
- Legal/ethical considerations for scraping
- Maintenance burden if HTML structure changes
- Potential rate limiting issues

---

### 3. Official NSE Sources
**Primary Website:** https://www.nse.co.ke/  
**Status:** ❌ Not viable

**Findings:**
- No public API available (`api.nse.co.ke` does not exist)
- Live prices endpoint returns 404
- WordPress-based site with no exposed data endpoints
- Would require complex scraping with authentication

---

### 4. Third-Party NPM/Python Packages
**Status:** ❌ None found

**Searched:**
- npm: No NSE/Kenya stock packages found (only NSE India packages)
- PyPI: No NSE Kenya packages found
- GitHub: No mature open-source NSE API projects

---

## Recommendations

### Primary Recommendation: Use TradingView with NSE Symbols ✅

**Why:**
1. **Already integrated** - Your project uses TradingView widgets
2. **No additional cost** - Free TradingView widgets
3. **Professional quality** - Real-time data, reliable infrastructure
4. **Legal and compliant** - Using official TradingView API
5. **Maintenance-free** - TradingView handles data updates
6. **Multiple widgets supported** - Market overview, heatmaps, quotes, timeline

**Action Items:**
1. Update `MARKET_OVERVIEW_WIDGET_CONFIG` - Replace US stocks with NSE stocks
2. Update `HEATMAP_WIDGET_CONFIG` - Configure for NSE exchange
3. Update `MARKET_DATA_WIDGET_CONFIG` - Add NSE stock groups
4. Update `TOP_STORIES_WIDGET_CONFIG` - Focus on African/Kenyan markets
5. Organize stocks by NSE sectors:
   - Banking: EQTY, KCB, ABSA, COOP, etc.
   - Telecommunications: SCOM
   - Manufacturing: BAMB, EABL, BAT, etc.
   - Energy: KPLC, KEGN
   - Insurance: BRITAM, KUKZ, etc.

---

### Alternative: Custom Scraper (NOT RECOMMENDED)

**Only consider if:**
- Need data not available through TradingView
- Need specific historical data formats
- Building a data aggregation service

**Challenges:**
- Legal considerations (terms of service, robots.txt)
- Maintenance burden (HTML structure changes)
- Rate limiting and IP blocking risks
- Infrastructure costs (proxy servers, etc.)
- Data quality/reliability concerns

**If pursuing scraping:**
1. Check AFX website terms of service
2. Implement respectful rate limiting
3. Use Python with BeautifulSoup/Scrapy
4. Build robust error handling
5. Cache data appropriately
6. Consider contacting AFX for permission/API access

---

## Complete NSE Stock List

Research additional NSE tickers from:
- NSE official listing: https://www.nse.co.ke/listed-companies/
- Test each symbol with TradingView format `NSE:TICKER`
- Organize by sectors for widget configurations

**Major NSE Stocks to Include:**
- **Banking:** EQTY, KCB, ABSA, COOP, SCBK, NCBA, DTBK, I&M
- **Telecom:** SCOM
- **Brewing:** EABL
- **Manufacturing:** BAMB, BAT, UNGA, CARBACID
- **Energy:** KPLC, KEGN, TOTL
- **Insurance:** BRITAM, KUKZ, CIC, JUBILEE
- **Investment:** CENTUM, BRITAM, ICEA
- **Retail:** NAIVAS (if listed)

---

## Next Steps

1. ✅ Use TradingView widgets with NSE symbols
2. Update widget configurations in `lib/constants/index.ts`
3. Test widgets with NSE data
4. Verify real-time data loads correctly
5. Document any NSE symbols that don't work with TradingView

---

## Cost Analysis

| Approach | Setup Cost | Monthly Cost | Maintenance | Risk |
|----------|------------|--------------|-------------|------|
| **TradingView (NSE symbols)** | $0 | $0 | None | Low |
| Custom Scraper (AFX) | Medium | Low | High | High |
| Official NSE API | N/A | N/A | N/A | N/A |
| Third-party API | Varies | $50-500+ | Low | Medium |

---

## Conclusion

**Use TradingView widgets with NSE stock symbols.** This is the most practical, cost-effective, and reliable solution. The infrastructure is already in place, and it only requires updating the configuration files with NSE tickers.

Web scraping should only be considered as a last resort and only if specific data requirements cannot be met through TradingView.
