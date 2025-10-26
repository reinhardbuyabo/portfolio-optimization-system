
import { test, expect } from '@playwright/test';

test.describe('Market Overview Page', () => {
  test('should display the market chart, quotes table, and heatmap', async ({ page }) => {
    await page.goto('/landing');

    await expect(page.locator('[data-testid="synthetic-market-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="market-quotes-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="stock-heatmap"]')).toBeVisible();
  });
});
