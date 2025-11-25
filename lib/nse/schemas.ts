/**
 * Zod schemas for runtime validation of NSE data
 */

import { z } from 'zod';

// Schema for individual index
export const NSEIndexSchema = z.object({
  value: z.number(),
  change: z.number(),
  change_percent: z.number(),
});

// Schema for indices response
export const NSEIndicesResponseSchema = z.object({
  indices: z.object({
    NASI: NSEIndexSchema.optional(),
    N20I: NSEIndexSchema.optional(),
    N25I: NSEIndexSchema.optional(),
  }),
  timestamp: z.string(),
  source: z.string().optional(),
  error: z.string().optional(),
});

// Schema for news item
export const NewsItemSchema = z.object({
  headline: z.string(),
  url: z.string().url(),
  source: z.string(),
  timestamp: z.string(),
});

// Schema for news response
export const NSENewsResponseSchema = z.object({
  news: z.array(NewsItemSchema),
  count: z.number(),
  timestamp: z.string(),
  source: z.string().optional(),
  error: z.string().optional(),
});

// Schema for corporate action
export const CorporateActionSchema = z.object({
  company: z.string(),
  symbol: z.string(),
  action: z.string(),
  date: z.string(),
});

// Schema for corporate actions response
export const NSECorporateActionsResponseSchema = z.object({
  actions: z.array(CorporateActionSchema),
  count: z.number(),
  timestamp: z.string(),
  source: z.string().optional(),
  error: z.string().optional(),
});

// Schema for stock data (for future use)
export const StockDataSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  change: z.number(),
  change_percent: z.number(),
  volume: z.number(),
  market_cap: z.number().optional(),
});

// Schema for stocks response (for future use)
export const NSEStocksResponseSchema = z.object({
  stocks: z.array(StockDataSchema),
  count: z.number(),
  timestamp: z.string(),
  source: z.string().optional(),
  error: z.string().optional(),
});
