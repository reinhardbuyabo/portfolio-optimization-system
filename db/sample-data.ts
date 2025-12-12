import { Role, RiskTolerance, PortfolioStatus } from "@prisma/client";
import { hashSync } from "bcrypt-ts-edge";

const HASH_ROUNDS = 10;

export const users = [
  {
    name: "System Admin",
    email: "admin@nse-app.com",
    password: hashSync("admin123", HASH_ROUNDS),
    role: Role.ADMIN,
  },
  {
    name: "Jane Doe",
    email: "manager@nse-app.com",
    password: hashSync("manager123", HASH_ROUNDS),
    role: Role.PORTFOLIO_MANAGER,
  },
  {
    name: "John Investor",
    email: "investor@nse-app.com",
    password: hashSync("investor123", HASH_ROUNDS),
    role: Role.INVESTOR,
  },
  {
    name: "Alice Analyst",
    email: "analyst@nse-app.com",
    password: hashSync("analyst123", HASH_ROUNDS),
    role: Role.ANALYST,
  },
];

export const investorProfiles = (investorId: string) => [
  {
    userId: investorId,
    budget: 500000,
    riskTolerance: RiskTolerance.MEDIUM,
    constraints: {
      maxAllocationPerAsset: 0.4,
      excludeSectors: ["Real Estate"],
    },
    preferences: {
      preferredSectors: ["Telecom", "Energy"],
    },
  },
];

export const assets = [
  { ticker: "SCOM", name: "Safaricom PLC", sector: "Telecommunications" },
  { ticker: "KEGN", name: "KenGen", sector: "Energy" },
  { ticker: "EQTY", name: "Equity Bank", sector: "Banking" },
];

// Generate market data for the last 30 days for each asset
export const marketData = (
  safaricomId: string,
  kengenId: string,
  equityId: string
) => {
  const data: any[] = [];
  const today = new Date();
  
  // Safaricom data - trending up
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const basePrice = 15.0 + (i * 0.01); // Slight upward trend
    data.push({
      assetId: safaricomId,
      date,
      open: basePrice - 0.1,
      high: basePrice + 0.2,
      low: basePrice - 0.2,
      close: basePrice,
      volume: 2000000 + Math.floor(Math.random() * 500000),
      sentimentScore: 0.6 + Math.random() * 0.2,
    });
  }
  
  // KenGen data - stable
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const basePrice = 3.5 + (Math.random() - 0.5) * 0.2; // Stable around 3.5
    data.push({
      assetId: kengenId,
      date,
      open: basePrice - 0.05,
      high: basePrice + 0.1,
      low: basePrice - 0.1,
      close: basePrice,
      volume: 800000 + Math.floor(Math.random() * 200000),
      sentimentScore: 0.5 + Math.random() * 0.2,
    });
  }
  
  // Equity Bank data - trending up
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const basePrice = 44.0 + (i * 0.05); // Upward trend
    data.push({
      assetId: equityId,
      date,
      open: basePrice - 0.5,
      high: basePrice + 1.0,
      low: basePrice - 0.8,
      close: basePrice,
      volume: 1200000 + Math.floor(Math.random() * 300000),
      sentimentScore: 0.7 + Math.random() * 0.2,
    });
  }
  
  return data;
};

export const portfolioWithAllocations = (
  managerId: string,
  safaricomId: string,
  kengenId: string,
  equityId: string
) => {
  // Base portfolio value in KES
  const baseValue = 100000;
  
  // Calculate allocation values based on weights
  const safaricomWeight = 0.5;
  const kengenWeight = 0.3;
  const equityWeight = 0.2;
  
  // Latest prices (from market data)
  const safaricomPrice = 15.4;
  const kengenPrice = 3.6;
  const equityPrice = 46.0;
  
  // Estimated metrics (will be recalculated by the system, but we need initial values)
  const expectedReturn = 0.12; // 12% annual
  const volatility = 0.15; // 15% annual volatility
  const sharpeRatio = (expectedReturn - 0.05) / volatility; // Using 5% risk-free rate
  
  return {
    name: "Managed Growth Portfolio",
    userId: managerId,
    riskTolerance: RiskTolerance.MEDIUM,
    targetReturn: 0.15,
    status: PortfolioStatus.ACTIVE,
    // New computed fields
    value: baseValue,
    expectedReturn,
    sharpeRatio,
    volatility,
    holdingsCount: 3,
    allocations: {
      create: [
        {
          assetId: safaricomId,
          weight: safaricomWeight,
          value: baseValue * safaricomWeight,
          expectedReturn: 0.10, // 10% for Safaricom
          sharpeRatio: 0.8,
        },
        {
          assetId: kengenId,
          weight: kengenWeight,
          value: baseValue * kengenWeight,
          expectedReturn: 0.08, // 8% for KenGen
          sharpeRatio: 0.6,
        },
        {
          assetId: equityId,
          weight: equityWeight,
          value: baseValue * equityWeight,
          expectedReturn: 0.15, // 15% for Equity Bank
          sharpeRatio: 1.2,
        },
      ],
    },
    results: {
      create: {
        expectedReturn: 0.12,
        expectedVolatility: 0.08,
        sharpeRatio: 1.5,
        sortinoRatio: 2.0,
        maxDrawdown: -0.1,
      },
    },
  };
};