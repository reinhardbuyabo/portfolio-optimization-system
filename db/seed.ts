import { PrismaClient } from "@prisma/client";
import {
    users,
    investorProfiles,
    assets,
    marketData,
    portfolioWithAllocations,
} from "./sample-data";
import { prisma } from "./prisma";

async function main() {
    console.log("🌱 Clearing old data...");

    // Order matters because of foreign key dependencies
    await prisma.simulation.deleteMany();
    await prisma.optimizationResult.deleteMany();
    await prisma.portfolioAllocation.deleteMany();
    await prisma.portfolio.deleteMany();
    await prisma.marketData.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.investorProfile.deleteMany();
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    console.log("🌱 Seeding new data...");

    // --- USERS ---
    const createdUsers = await prisma.user.createMany({
        data: users,
    });

    // Re-fetch created users to get IDs
    const allUsers = await prisma.user.findMany();
    const admin = allUsers.find((u) => u.role === "ADMIN")!;
    const manager = allUsers.find((u) => u.role === "PORTFOLIO_MANAGER")!;
    const investor = allUsers.find((u) => u.role === "INVESTOR")!;
    const analyst = allUsers.find((u) => u.role === "ANALYST")!;

    // --- INVESTOR PROFILE ---
    await prisma.investorProfile.createMany({
        data: investorProfiles(investor.id),
    });

    // --- ASSETS ---
    const createdAssets = await prisma.asset.createMany({
        data: assets,
    });

    // Re-fetch to get IDs
    const allAssets = await prisma.asset.findMany();
    const safaricom = allAssets.find((a) => a.ticker === "SCOM")!;
    const kengen = allAssets.find((a) => a.ticker === "KEGN")!;
    const equity = allAssets.find((a) => a.ticker === "EQTY")!;

    // --- MARKET DATA ---
    await prisma.marketData.createMany({
        data: marketData(safaricom.id, kengen.id, equity.id),
    });

    // --- PORTFOLIO ---
    const portfolio = await prisma.portfolio.create({
        data: portfolioWithAllocations(
            manager.id,
            safaricom.id,
            kengen.id,
            equity.id,
        ),
    });

    // --- SIMULATION ---
    await prisma.simulation.create({
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
    });

    console.log("✅ Database seeded successfully!");
    console.log(`
    Test credentials:
    ----------------
    Admin: admin@nse-app.com / admin123
    Manager: manager@nse-app.com / manager123
    Investor: investor@nse-app.com / investor123
    Analyst: analyst@nse-app.com / analyst123
  `);
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
