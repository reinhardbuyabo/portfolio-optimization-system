import { NSEScraper } from '../../../lib/scrapers/stockanalysis-scraper';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Declare default_api as a global variable for the test environment
declare global {
  var default_api: any; 
}

// Mock the default_api.firecrawl_scrape function
beforeEach(() => {
  global.default_api = {
    firecrawl_scrape: vi.fn(),
  };
});

const mockSCOM_Markdown = `Collapse

# Safaricom PLC (NASE:SCOM)

![Kenya flag](https://stockanalysis.com/img/flags/kenya.svg)[Kenya](https://stockanalysis.com/list/nairobi-stock-exchange/) · Delayed Price · Currency is KES

Watchlist Compare

30.50

+0.25 (0.83%)

At close: Nov 3, 2025

- 1M1 Month
- YTDYTD
- 1Y1 Year
- 5Y5 Years
- MaxMax

|     |     |
| --- | --- |
| [Market Cap](https://stockanalysis.com/quote/nase/SCOM/market-cap/) | 1.21T |
| [Revenue (ttm)](https://stockanalysis.com/quote/nase/SCOM/revenue/) | 385.23B |
| Net Income (ttm) | 69.80B |
| Shares Out | 40.07B |
| EPS (ttm) | 1.74 |
| PE Ratio | 17.39 |
| Forward PE | 13.25 |
| [Dividend](https://stockanalysis.com/quote/nase/SCOM/dividend/) | 1.20 (3.97%) |
| Ex-Dividend Date | Aug 1, 2025 |

|     |     |
| --- | --- |
| Volume | 9,410,302 |
| Average Volume | 7,810,847 |
| Open | 30.25 |
| Previous Close | 30.25 |
| Day's Range | 30.00 - 30.70 |
| 52-Week Range | 14.10 - 31.00 |
| Beta | 0.59 |
| RSI | 70.18 |
| Earnings Date | Nov 7, 2025 |

## About Safaricom

Safaricom PLC provides telecommunication services in Kenya and Ethiopia. The company offers voice, mobile and fixed data, messaging (SMS), and M-PESA financial services, as well as internet for business; internet of things; and cloud services. It also provides Kifaru Net; and value-added services, such as Skiza Tunes, a ringback tunes service; Bonga points, a loyalty points programme; Stori Ibambe, a platform for mobile content creators; and device products. In addition, the company offers corporate postpay and value pack; Zidisha Plus; Shiriki... [Read more](https://stockanalysis.com/quote/nase/SCOM/company/ "View company profile")

IndustryRadiotelephone Communications

Founded1997

Employees [6,462](https://stockanalysis.com/quote/nase/SCOM/employees/)

Stock ExchangeNairobi Stock Exchange

Ticker SymbolSCOM

[Full Company Profile](https://stockanalysis.com/quote/nase/SCOM/company/)

## Financial Performance

In 2024, Safaricom's revenue was 385.23 billion, an increase of 11.35% compared to the previous year's 345.96 billion. Earnings were 69.80 billion, an increase of 10.81%.

[Financial Statements](https://stockanalysis.com/quote/nase/SCOM/financials/)

## News

### [Safaricom PLC (NAI:SCOM) (H1 2025) Earnings Call Highlights: Strong Growth in Kenya Amidst FX ...](https://www.gurufocus.com/news/2593768/safaricom-plc-naiscom-h1-2025-earnings-call-highlights-strong-growth-in-kenya-amidst-fx-challenges)

Safaricom PLC (NAI:SCOM) (H1 2025) Earnings Call Highlights: Strong Growth in Kenya Amidst FX Challenges

1 year ago - GuruFocus

### [Half Year 2025 Safaricom Plc Earnings Call(Analyst and Investors) Transcript](https://www.gurufocus.com/news/2593695/half-year-2025-safaricom-plc-earnings-callanalyst-and-investors-transcript)

Half Year 2025 Safaricom Plc Earnings Call(Analyst and Investors) Transcript

1 year ago - GuruFocus

[![](https://www.bnnbloomberg.ca/resizer/v2/CQSU4SAD7F26BEFNAB57DXPLRM.jpg?smart=true&auth=a1bd926f9b1a3f949498a66e4f65751bcb2a806386b338a2258814966831acd6&width=1200&height=630)](https://www.bnnbloomberg.ca/business/company-news/2024/11/07/safaricom-first-half-profit-drops-as-ethiopian-birr-plummets/)

### [Safaricom First-Half Profit Drops as Ethiopian Birr Plummets](https://www.bnnbloomberg.ca/business/company-news/2024/11/07/safaricom-first-half-profit-drops-as-ethiopian-birr-plummets/)

Safaricom Plc, Kenya’s biggest company by market value, said first-half profit fell 18% because of the devaluation of Ethiopia’s currency.

1 year ago - BNN Bloomberg

[![](https://www.bnnbloomberg.ca/resizer/v2/GIUG7BCLFKK3ILEUDNPDZK5VGM.jpg?smart=true&auth=bd31a41e4e16660f3c8753acca98e6f246287c3d8c0b717fdc996f7a6f849dbc&width=1200&height=630)](https://www.bnnbloomberg.ca/business/company-news/2024/09/27/kenyas-biggest-wireless-firm-is-in-talks-with-musks-starlink/)

### [Kenya’s Biggest Wireless Firm Is in Talks With Musk’s Starlink](https://www.bnnbloomberg.ca/business/company-news/2024/09/27/kenyas-biggest-wireless-firm-is-in-talks-with-musks-starlink/)

Kenya’s biggest phone company Safaricom Plc is in talks with Elon Musk’s Starlink and other satellite providers on potential future partnerships, its Chief Executive Officer Peter Ndegwa said.

1 year ago - BNN Bloomberg

### [Kenya's Safaricom raises $117mln with local sustainability-linked loan](https://www.zawya.com/en/markets/bonds-and-loans/kenyas-safaricom-raises-117mln-with-local-sustainability-linked-loan-d9ejfkqh)

The four participating banks in the transaction are KCB, ABSA, Standard Chartered Kenya and Stanbic

1 year ago - Zawya

[![](https://cdn.benzinga.com/files/images/story/2024/09/19/Mahmutlar-----Turkey---June-01--2019-Mas.jpeg?optimize=medium&dpr=1&auto=jpg&height=480&width=720&fit=crop)](https://www.benzinga.com/markets/equities/24/09/40943971/safaricom-mastercard-team-up-to-supercharge-cross-border-payments-and-merchant-growth-in-kenya)

### [Safaricom, Mastercard Team Up To Supercharge Cross-Border Payments And Merchant Growth In Kenya](https://www.benzinga.com/markets/equities/24/09/40943971/safaricom-mastercard-team-up-to-supercharge-cross-border-payments-and-merchant-growth-in-kenya)

Mastercard Incorporated (NYSE: MA) shares are trading lower on Thursday. According to Benzinga Pro , MA stock has gained over 19% in the past year. Investors can gain exposure to the stock via iShare... 

1 year ago - Benzinga

### [Safaricom and Mastercard partner to expand remittances and payment acceptance to over 636,000 merchants in Kenya](https://www.zawya.com/en/press-release/companies-news/safaricom-and-mastercard-partner-to-expand-remittances-and-payment-acceptance-to-over-636-000-merchants-in-kenya-msppb7eq)

Using M-PESA, Safaricoms leading mobile money service

1 year ago - Zawya

[![](https://www.bnnbloomberg.ca/resizer/v2/KCRRJXFPLJV3QSSYRUTIQ3GK3A.jpg?smart=true&auth=db3c064f63651807c37edccaca5da126093db1ea048d51f8eb008954a0fee619&width=1200&height=630)](https://www.bnnbloomberg.ca/investing/2024/08/15/ethiopia-currency-drop-distances-safaricoms-break-even-target/)

### [Ethiopia Currency Drop Distances Safaricom’s Break-Even Target](https://www.bnnbloomberg.ca/investing/2024/08/15/ethiopia-currency-drop-distances-safaricoms-break-even-target/)

East Africa’s biggest company by market value may take longer to break even in Ethiopia after the Horn of Africa nation allowed its currency to trade freely for the first time in five decades, causing...

1 year ago - BNN Bloomberg`;

describe('NSEScraper', () => {
  let scraper: NSEScraper;

  beforeEach(() => {
    scraper = new NSEScraper();
    // Reset the mock before each test
    // @ts-ignore
    default_api.firecrawl_scrape.mockReset();
  });

  it('should scrape and parse SCOM data correctly', async () => {
    // @ts-ignore
    default_api.firecrawl_scrape.mockResolvedValueOnce({
      output: { markdown: mockSCOM_Markdown },
    });

    const tickers = ['SCOM'];
    const markdownContent = { 'SCOM': mockSCOM_Markdown };
    const result = await scraper.scrape(tickers, markdownContent);

    expect(result).toHaveLength(1);
    const scomData = result[0];

    expect(scomData.ticker).toBe('SCOM');
    expect(scomData.name).toBe('Safaricom PLC');
    expect(scomData.open).toBe(30.25);
    expect(scomData.high).toBe(30.70);
    expect(scomData.low).toBe(30.00);
    expect(scomData.close).toBe(30.25);
    expect(scomData.volume).toBe(9410302);
    expect(scomData.changePercent).toBe(0.83);
    expect(scomData.marketCap).toBe(1.21 * 1_000_000_000_000); // 1.21T
    expect(scomData.sector).toBe('Radiotelephone Communications');
    expect(scomData.date).toBeInstanceOf(Date);
  });

  it('should handle multiple tickers', async () => {
    // Mock for SCOM
    // @ts-ignore
    default_api.firecrawl_scrape.mockResolvedValueOnce({
      output: { markdown: mockSCOM_Markdown },
    });

    // Mock for another ticker (e.g., "EQTY") - using SCOM data for now for simplicity
    // In a real scenario, you'd have a mock for EQTY's markdown
    // @ts-ignore
    default_api.firecrawl_scrape.mockResolvedValueOnce({
      output: { markdown: mockSCOM_Markdown },
    });

    const tickers = ['SCOM', 'EQTY'];
    const markdownContent = { 'SCOM': mockSCOM_Markdown, 'EQTY': mockSCOM_Markdown }; // Using SCOM data for EQTY for simplicity
    const result = await scraper.scrape(tickers, markdownContent);

    expect(result).toHaveLength(2);
    expect(result[0].ticker).toBe('SCOM');
    expect(result[1].ticker).toBe('EQTY');
  });

  it('should return empty array if scraping fails', async () => {
    // @ts-ignore
    default_api.firecrawl_scrape.mockResolvedValueOnce({
      output: { markdown: null }, // Simulate no markdown output
    });

    const tickers = ['SCOM'];
    const markdownContent = { 'SCOM': null }; // Simulate no markdown output
    const result = await scraper.scrape(tickers, markdownContent);

    expect(result).toHaveLength(0);
  });

  it('should return empty array if parsing fails', async () => {
    // @ts-ignore
    default_api.firecrawl_scrape.mockResolvedValueOnce({
      output: { markdown: "Invalid markdown content" }, // Simulate unparseable markdown
    });

    const tickers = ['SCOM'];
    const markdownContent = { 'SCOM': "Invalid markdown content" }; // Simulate unparseable markdown
    const result = await scraper.scrape(tickers, markdownContent);

    expect(result).toHaveLength(0);
  });
});
