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

export const marketData = (
  safaricomId: string,
  kengenId: string,
  equityId: string
) => [
  {
    assetId: safaricomId,
    date: new Date("2025-09-01"),
    open: 15.2,
    high: 15.6,
    low: 15.1,
    close: 15.4,
    volume: 2000000,
    sentimentScore: 0.7,
  },
  {
    assetId: kengenId,
    date: new Date("2025-09-01"),
    open: 3.5,
    high: 3.7,
    low: 3.4,
    close: 3.6,
    volume: 800000,
    sentimentScore: 0.6,
  },
  {
    assetId: equityId,
    date: new Date("2025-09-01"),
    open: 45.0,
    high: 46.2,
    low: 44.8,
    close: 46.0,
    volume: 1200000,
    sentimentScore: 0.8,
  },
];

export const portfolioWithAllocations = (
  managerId: string,
  safaricomId: string,
  kengenId: string,
  equityId: string
) => ({
  userId: managerId,
  status: PortfolioStatus.ACTIVE,
  allocations: {
    create: [
      { assetId: safaricomId, weight: 0.5 },
      { assetId: kengenId, weight: 0.3 },
      { assetId: equityId, weight: 0.2 },
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
});