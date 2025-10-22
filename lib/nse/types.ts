/**
 * TypeScript type definitions for NSE (Nairobi Stock Exchange) data
 */

// Index data structure
export interface NSEIndex {
  value: number;
  change: number;
  change_percent: number;
}

// Response from indices API
export interface NSEIndicesResponse {
  indices: {
    NASI?: NSEIndex;
    N20I?: NSEIndex;
    N25I?: NSEIndex;
  };
  timestamp: string;
  source?: string;
  error?: string;
}

// Single news item
export interface NewsItem {
  headline: string;
  url: string;
  source: string;
  timestamp: string;
}

// Response from news API
export interface NSENewsResponse {
  news: NewsItem[];
  count: number;
  timestamp: string;
  source?: string;
  error?: string;
}

// Corporate action item
export interface CorporateAction {
  company: string;
  symbol: string;
  action: string;
  date: string;
}

// Response from corporate actions API
export interface NSECorporateActionsResponse {
  actions: CorporateAction[];
  count: number;
  timestamp: string;
  source?: string;
  error?: string;
}

// Stock data structure (for future use)
export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  market_cap?: number;
}

// Response from stocks API (for future use)
export interface NSEStocksResponse {
  stocks: StockData[];
  count: number;
  timestamp: string;
  source?: string;
  error?: string;
}
