import { test, expect } from "@playwright/test";
import { prisma } from "@/db/prisma";

test.describe("Portfolio Viewing", () => {
  test("should allow a logged-in user to view a portfolio's details", async ({ page }) => {
    // Create a test portfolio directly in the database
    const testUser = await prisma.user.findFirst({ where: { role: "INVESTOR" } });
    if (!testUser) {
      throw new Error("No INVESTOR user found for testing.");
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        name: `Test Portfolio ${Date.now()}`,
        userId: testUser.id,
        riskTolerance: "MEDIUM",
        targetReturn: 12.5,
        allocations: {
          create: [
            { asset: { create: { ticker: "AAPL", name: "Apple Inc." } }, weight: 0.5 },
            { asset: { create: { ticker: "GOOG", name: "Alphabet Inc." } }, weight: 0.3 },
          ],
        },
        results: {
          create: [
            { expectedReturn: 0.15, expectedVolatility: 0.1, sharpeRatio: 1.2, sortinoRatio: 1.5, maxDrawdown: 0.05 },
          ],
        },
      },
    });

    // 1. Navigate to the portfolios list page
    await page.goto("/dashboard/portfolios");

    // 2. Click on the newly created portfolio card
    await page.click(`[data-testid="portfolio-card-link-${portfolio.id}"]`);

    // 3. Verify that the user is on the portfolio details page
    await expect(page).toHaveURL(`/dashboard/portfolios/${portfolio.id}`);

    // 4. Assert that portfolio details are displayed
    await expect(page.locator(`h2:has-text("${portfolio.name}")`)).toBeVisible();
    await expect(page.locator(`p:has-text("Created by ${testUser.name}")`)).toBeVisible();
    await expect(page.locator(`text="AAPL"`)).toBeVisible();
    await expect(page.locator(`text="Apple Inc."`)).toBeVisible();
    await expect(page.locator(`text="50.00%"`)).toBeVisible();
    await expect(page.locator(`text="GOOG"`)).toBeVisible();
    await expect(page.locator(`text="Alphabet Inc."`)).toBeVisible();
    await expect(page.locator(`text="30.00%"`)).toBeVisible();
    await expect(page.locator(`p:has-text("Expected Return")`)).toBeVisible();
    await expect(page.locator(`p:has-text("Volatility")`)).toBeVisible();
    await expect(page.locator(`p:has-text("Sharpe Ratio")`)).toBeVisible();
  });
});
