"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var sample_data_1 = require("./sample-data");
var prisma_1 = require("./prisma");
var nse_assets_1 = require("./nse-assets");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var createdUsers, allUsers, admin, manager, investor, analyst, assets, allAssets, safaricom, kengen, equity, portfolio;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🌱 Clearing old data...");
                    // Order matters because of foreign key dependencies
                    return [4 /*yield*/, prisma_1.prisma.simulation.deleteMany()];
                case 1:
                    // Order matters because of foreign key dependencies
                    _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.optimizationResult.deleteMany()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.portfolioAllocation.deleteMany()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.portfolio.deleteMany()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.marketData.deleteMany()];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.asset.deleteMany()];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.investorProfile.deleteMany()];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.account.deleteMany()];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.session.deleteMany()];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.user.deleteMany()];
                case 10:
                    _a.sent();
                    console.log("🌱 Seeding new data...");
                    return [4 /*yield*/, prisma_1.prisma.user.createMany({
                            data: sample_data_1.users,
                        })];
                case 11:
                    createdUsers = _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.user.findMany()];
                case 12:
                    allUsers = _a.sent();
                    admin = allUsers.find(function (u) { return u.role === "ADMIN"; });
                    manager = allUsers.find(function (u) { return u.role === "PORTFOLIO_MANAGER"; });
                    investor = allUsers.find(function (u) { return u.role === "INVESTOR"; });
                    analyst = allUsers.find(function (u) { return u.role === "ANALYST"; });
                    // --- INVESTOR PROFILE ---
                    return [4 /*yield*/, prisma_1.prisma.investorProfile.createMany({
                            data: (0, sample_data_1.investorProfiles)(investor.id),
                        })];
                case 13:
                    // --- INVESTOR PROFILE ---
                    _a.sent();
                    assets = (0, nse_assets_1.getAssetsFromCSV)();
                    return [4 /*yield*/, prisma_1.prisma.asset.createMany({
                            data: assets,
                        })];
                case 14:
                    _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.asset.findMany()];
                case 15:
                    allAssets = _a.sent();
                    safaricom = allAssets.find(function (a) { return a.ticker === "SCOM"; });
                    kengen = allAssets.find(function (a) { return a.ticker === "KEGN"; });
                    equity = allAssets.find(function (a) { return a.ticker === "EQTY"; });
                    // --- MARKET DATA ---
                    return [4 /*yield*/, prisma_1.prisma.marketData.createMany({
                            data: (0, sample_data_1.marketData)(safaricom.id, kengen.id, equity.id),
                        })];
                case 16:
                    // --- MARKET DATA ---
                    _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.portfolio.create({
                            data: (0, sample_data_1.portfolioWithAllocations)(manager.id, safaricom.id, kengen.id, equity.id),
                        })];
                case 17:
                    portfolio = _a.sent();
                    // --- SIMULATION ---
                    return [4 /*yield*/, prisma_1.prisma.simulation.create({
                            data: {
                                portfolioId: portfolio.id,
                                startDate: new Date("2025-01-01"),
                                endDate: new Date("2025-09-01"),
                                performanceMetrics: {
                                    RMSE: 0.05,
                                    MAE: 0.03,
                                    cumulativeReturn: 0.18,
                                },
                            },
                        })];
                case 18:
                    // --- SIMULATION ---
                    _a.sent();
                    console.log("✅ Database seeded successfully!");
                    console.log("\n    Test credentials:\n    ----------------\n    Admin: admin@nse-app.com / admin123\n    Manager: manager@nse-app.com / manager123\n    Investor: investor@nse-app.com / investor123\n    Analyst: analyst@nse-app.com / analyst123\n  ");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
