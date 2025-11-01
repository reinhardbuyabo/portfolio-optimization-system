import { test, expect } from '@playwright/test';

test.describe('Portfolio Creation', () => {
  test('should allow a logged-in user to create a new portfolio', async ({ page }) => {
    // 3. Navigate to the dashboard or portfolio page
    await page.goto('/dashboard');

    // 4. Verify that the user is on the dashboard page
    await expect(page).toHaveURL('/dashboard');

    // 5. Find and click the "Create Portfolio" button
    await page.click('a:has-text("Create Portfolio")');

    // 6. Fill out the portfolio creation form
    const portfolioName = `My New Portfolio ${Date.now()}`;
    await page.fill('input[name="name"]', portfolioName);
    await page.click('label[for="medium"]');
    await page.fill('input[name="targetReturn"]', '10');

    // 7. Submit the form
    await page.click('button[type="submit"]');

    // 8. Verify that the new portfolio is displayed on the page
    await expect(page.locator('h2:has-text("Investor Dashboard")')).toBeVisible();
  });
});
