"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portfolioWithAllocations = exports.marketData = exports.assets = exports.investorProfiles = exports.users = void 0;
var client_1 = require("@prisma/client");
var bcrypt_ts_edge_1 = require("bcrypt-ts-edge");
var HASH_ROUNDS = 10;
exports.users = [
    {
        name: "System Admin",
        email: "admin@nse-app.com",
        password: (0, bcrypt_ts_edge_1.hashSync)("admin123", HASH_ROUNDS),
        role: client_1.Role.ADMIN,
    },
    {
        name: "Jane Doe",
        email: "manager@nse-app.com",
        password: (0, bcrypt_ts_edge_1.hashSync)("manager123", HASH_ROUNDS),
        role: client_1.Role.PORTFOLIO_MANAGER,
    },
    {
        name: "John Investor",
        email: "investor@nse-app.com",
        password: (0, bcrypt_ts_edge_1.hashSync)("investor123", HASH_ROUNDS),
        role: client_1.Role.INVESTOR,
    },
    {
        name: "Alice Analyst",
        email: "analyst@nse-app.com",
        password: (0, bcrypt_ts_edge_1.hashSync)("analyst123", HASH_ROUNDS),
        role: client_1.Role.ANALYST,
    },
];
var investorProfiles = function (investorId) { return [
    {
        userId: investorId,
        budget: 500000,
        riskTolerance: client_1.RiskTolerance.MEDIUM,
        constraints: {
            maxAllocationPerAsset: 0.4,
            excludeSectors: ["Real Estate"],
        },
        preferences: {
            preferredSectors: ["Telecom", "Energy"],
        },
    },
]; };
exports.investorProfiles = investorProfiles;
exports.assets = [
    { ticker: "SCOM", name: "Safaricom PLC", sector: "Telecommunications" },
    { ticker: "KEGN", name: "KenGen", sector: "Energy" },
    { ticker: "EQTY", name: "Equity Bank", sector: "Banking" },
];
var marketData = function (safaricomId, kengenId, equityId) { return [
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
]; };
exports.marketData = marketData;
var portfolioWithAllocations = function (managerId, safaricomId, kengenId, equityId) { return ({
    name: "Managed Growth Portfolio",
    userId: managerId,
    riskTolerance: client_1.RiskTolerance.MEDIUM,
    targetReturn: 0.15,
    status: client_1.PortfolioStatus.ACTIVE,
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
}); };
exports.portfolioWithAllocations = portfolioWithAllocations;
