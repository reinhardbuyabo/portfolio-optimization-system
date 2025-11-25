import { scrapeNSEData } from '@/lib/scrapers/stockanalysis-scraper';
import { readFileSync } from 'fs';
import path from 'path';

const mockMarkdownContent: { [key: string]: string } = {
  'SCOM': `Collapse

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

1 year ago - BNN Bloomberg`,
  'EQTY': `Collapse

# Equity Group Holdings Plc (NASE:EQTY)

![Kenya flag](https://stockanalysis.com/img/flags/kenya.svg)[Kenya](https://stockanalysis.com/list/nairobi-stock-exchange/) · Delayed Price · Currency is KES

Watchlist Compare

67.50

+1.25 (1.89%)

At close: Nov 3, 2025

- 1M1 Month
- YTDYTD
- 1Y1 Year
- 5Y5 Years
- MaxMax

|     |     |
| --- | --- |
| [Market Cap](https://stockanalysis.com/quote/nase/EQTY/market-cap/) | 250.01B |
| [Revenue (ttm)](https://stockanalysis.com/quote/nase/EQTY/revenue/) | 176.55B |
| Net Income (ttm) | 59.38B |
| Shares Out | 3.77B |
| EPS (ttm) | 15.73 |
| PE Ratio | 4.21 |
| Forward PE | 4.13 |
| [Dividend](https://stockanalysis.com/quote/nase/EQTY/dividend/) | 4.25 (6.42%) |
| Ex-Dividend Date | May 26, 2025 |

|     |     |
| --- | --- |
| Volume | 3,720,046 |
| Average Volume | 1,265,195 |
| Open | 68.00 |
| Previous Close | 66.25 |
| Day's Range | 66.25 - 68.00 |
| 52-Week Range | 41.20 - 68.00 |
| Beta | 0.25 |
| RSI | 91.79 |
| Earnings Date | Nov 11, 2025 |

## About Equity Group Holdings

Equity Group Holdings Plc provides financial products and services in Kenya, the Democratic Republic of Congo, Rwanda, Uganda, Tanzania, South Sudan, and Ethiopia. The company offers current, savings, term, junior, personal, business, ordinary, social institution, investment, pensioner’s, custody investment, and call and fixed deposit accounts. Its lending activities include mortgage, construction, business, development, working capital, asset finance, trade finance, development, agriculture, temporary and business overdraft, equity release, ag... [Read more](https://stockanalysis.com/quote/nase/EQTY/company/ "View company profile")

IndustryCommercial Banks

Founded1984

Employees [13,083](https://stockanalysis.com/quote/nase/EQTY/employees/)

Stock ExchangeNairobi Stock Exchange

Ticker SymbolEQTY

[Full Company Profile](https://stockanalysis.com/quote/nase/EQTY/company/)

## Financial Performance

In 2024, Equity Group Holdings's revenue was 160.97 billion, an increase of 19.72% compared to the previous year's 134.46 billion. Earnings were 46.55 billion, an increase of 10.89%.

[Financial Statements](https://stockanalysis.com/quote/nase/EQTY/financials/)

## News

[![](https://african.business/wp-content/uploads/2025/05/000_33wy4za-1200x800.jpg)](https://african.business/2025/05/finance-services/agf-and-equity-bank-join-forces-to-unlock-1bn-in-sme-financing)

### [AGF and Equity Bank join forces to unlock $1bn in SME financing](https://african.business/2025/05/finance-services/agf-and-equity-bank-join-forces-to-unlock-1bn-in-sme-financing)

The financial institutions say the deal to support small and medium enterprises is Africa’s largest ever guarantee deal.

5 months ago - African Business

### [Empire Petroleum amends loan agreement with Equity Bank](https://stockanalysis.com/out/news?url=https://seekingalpha.com/news/4320802-empire-petroleum-amends-loan-agreement-with-equity-bank)

1 year ago - Seeking Alpha`,
  'KCB': `Collapse

# KCB Group PLC (NASE:KCB)

![Kenya flag](https://stockanalysis.com/img/flags/kenya.svg)[Kenya](https://stockanalysis.com/list/nairobi-stock-exchange/) · Delayed Price · Currency is KES

Watchlist Compare

61.75

+0.25 (0.41%)

At close: Nov 3, 2025

- 1M1 Month
- YTDYTD
- 1Y1 Year
- 5Y5 Years
- MaxMax

60.39%(1Y)

|     |     |     |
| --- | --- | --- |
|  |  |  |
|  |  |  |

|     |     |
| --- | --- |
| [Market Cap](https://stockanalysis.com/quote/nase/KCB/market-cap/) | 197.63B |
| [Revenue (ttm)](https://stockanalysis.com/quote/nase/KCB/revenue/) | 178.45B |
| Net Income (ttm) | 62.44B |
| Shares Out | 3.21B |
| EPS (ttm) | 19.43 |
| PE Ratio | 3.17 |
| Forward PE | 3.43 |
| [Dividend](https://stockanalysis.com/quote/nase/KCB/dividend/) | 4.00 (6.50%) |
| Ex-Dividend Date | Sep 4, 2025 |

|     |     |
| --- | --- |
| Volume | 177,345 |
| Average Volume | 906,236 |
| Open | 62.00 |
| Previous Close | 61.50 |
| Day's Range | 61.50 - 62.00 |
| 52-Week Range | 35.00 - 62.00 |
| Beta | 0.50 |
| RSI | 83.71 |
| Earnings Date | Nov 19, 2025 |

## About KCB Group

KCB Group PLC, together with its subsidiaries, provides corporate, investment, and retail banking services in Kenya, Tanzania, South Sudan, Rwanda, Uganda, Burundi, and the Democratic Republic of Congo. It operates through four segments: Corporate Banking, Retail Banking, Treasury, and Mortgages. The company offers current accounts, savings and fixed deposits, consumer loans, and mortgages-based lending products to individuals. It also provides overdrafts; residential and commercial buildings, and other loans; credit facilities in local and for... [Read more](https://stockanalysis.com/quote/nase/KCB/company/ "View company profile")

IndustryCommercial Banks

Founded1896

Employees [12,090](https://stockanalysis.com/quote/nase/KCB/employees/)

Stock ExchangeNairobi Stock Exchange

Ticker SymbolKCB

[Full Company Profile](https://stockanalysis.com/quote/nase/KCB/company/)

## Financial Performance

In 2024, KCB Group's revenue was 174.67 billion, an increase of 32.87% compared to the previous year's 131.46 billion. Earnings were 60.09 billion, an increase of 66.10%.

[Financial Statements](https://stockanalysis.com/quote/nase/KCB/financials/)

## News

[![](https://www.bnnbloomberg.ca/resizer/v2/FKZEYY6D5IQSPTT5IVAWELTJKY.jpg?smart=true&auth=d34d189578487eeee99f02ce6baa251d8852442cb3375f722ff29f8163e1e1e7&width=1200&height=630)](https://www.bnnbloomberg.ca/business/2024/08/21/kcb-profit-rises-87-as-top-kenya-bank-to-resume-dividend/)

### [KCB Profit Rises 87% as Top Kenya Bank to Resume Dividend](https://www.bnnbloomberg.ca/business/2024/08/21/kcb-profit-rises-87-as-top-kenya-bank-to-resume-dividend/)

KCB Group Plc said first-half profit surged 87% as Kenya’s biggest bank said it will resume paying an interim dividend.

1 year ago - BNN Bloomberg`
};

async function runSimulatedScraper() {
  try {
    const csvFilePath = path.join(process.cwd(), 'ml/datasets/NSE_data_stock_market_sectors_2023_2024.csv');
    const csvContent = readFileSync(csvFilePath, 'utf-8');

    const allTickers: string[] = csvContent.split('\n')
      .map(line => line.split(',')[1]) // Get the second column (Stock_code)
      .filter(ticker => ticker && ticker !== 'Stock_code' && !ticker.startsWith('^')); // Filter out header and empty lines and indices

    const tickersToScrape = allTickers.filter(ticker => mockMarkdownContent[ticker]);

    console.log("Running simulated scraper for tickers:", tickersToScrape);
    const scrapedData = await scrapeNSEData(tickersToScrape, mockMarkdownContent);
    console.log(`Successfully scraped and persisted ${scrapedData.length} items.`);
  } catch (error) {
    console.error("Error in runSimulatedScraper:", error);
  }
}

runSimulatedScraper();
