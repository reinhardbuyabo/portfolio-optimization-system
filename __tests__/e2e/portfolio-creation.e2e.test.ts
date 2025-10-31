import { test, expect } from '@playwright/test';
import { createTestSessionToken } from '../helpers/auth-helper';

test.describe('Portfolio Creation', () => {
  test('should allow a logged-in user to create a new portfolio', async ({ page }) => {
    // 1. Programmatically create a JWT session token
    const sessionToken = createTestSessionToken('test-user-id', 'USER');

    // 2. Set the session cookie
    await page.context().addCookies([
      {
        name: 'next-auth.session-token',
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    // 3. Navigate to the dashboard or portfolio page
    await page.goto('/dashboard');

    // 4. Verify that the user is on the dashboard page
    await expect(page).toHaveURL('/dashboard');

    // 5. Find and click the "Create Portfolio" button
    await page.click('button:has-text("Create Portfolio")');

    // 6. Fill out the portfolio creation form
    await page.fill('input[name="name"]', 'My New Portfolio');
    await page.fill('textarea[name="description"]', 'This is a test portfolio.');

    // 7. Submit the form
    await page.click('button[type="submit"]');

    // 8. Verify that the new portfolio is displayed on the page
    await expect(page.locator('h2:has-text("My New Portfolio")')).toBeVisible();
  });
});
