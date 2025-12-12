import type { User, Portfolio, Asset, InvestorProfile } from "@prisma/client";

/**
 * App-wide type definitions
 */

// ---------- Auth ----------
// Auth types are inferred from Zod schemas in @/lib/validators

// Example: user session type (extend later when adding auth)
export interface SessionUser {
    id: string;
    name: string;
    email: string;
    role: User["role"];
}

// ---------- Database Models ----------
export type DbUser = User & {
    investorProfile?: InvestorProfile | null;
    portfolios?: Portfolio[];
};

export type DbPortfolio = Portfolio & {
    allocations?: any[]; // can refine later with Prisma include types
    results?: any | null;
};

export type DbAsset = Asset & {
    marketData?: any[]; // refine with Prisma model
};

// ---------- UI ----------
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// ---------- Figma UI Types (for React components & mockData) ----------
// Note: These align with Prisma but use simplified, UI-friendly shapes.

export type UserRole = "admin" | "manager" | "analyst" | "investor";

// UI-friendly User type for client-side (maps to Prisma User)
export interface UIUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
}

export interface StockForecast {
  symbol: string;
  date: string;
  actual?: number;
  predicted: number;
  confidence?: {
    lower: number;
    upper: number;
  };
}

export interface VolatilityData {
  symbol: string;
  date: string;
  volatility: number;
  variance?: number;
}

// UI-friendly Portfolio (matches Prisma Portfolio + computed fields)
export interface UIPortfolio {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  totalValue: number;
  totalReturn: number;
  volatility: number;
  sharpeRatio: number;
  holdings: PortfolioHolding[];
  ownerId: string;
  ownerName: string;
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  value: number;
  weight: number;
  return: number;
}

export interface FinancialMetrics {
  symbol: string;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  beta: number;
  alpha: number;
  valueAtRisk: number;
  maxDrawdown: number;
}

export interface EfficientFrontierPoint {
  volatility: number;
  return: number;
  sharpeRatio: number;
  weights?: Record<string, number>;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment?: "positive" | "neutral" | "negative";
  relatedSymbols?: string[];
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

export interface BacktestResult {
  modelName: string;
  period: string;
  rmse: number;
  mae: number;
  sharpeRatio: number;
  returns: number;
  maxDrawdown: number;
}
