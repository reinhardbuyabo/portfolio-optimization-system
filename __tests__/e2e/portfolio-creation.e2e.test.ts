import { test, expect } from '@playwright/test';

test.describe('Portfolio Creation', () => {
  test('should allow an investor to create a new portfolio', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Set session cookie
    const sessionToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiY2x4d3F5OHBxMDAwMHUwejY4ejZmNno2eiIsInJvbGUiOiJJTlZFU1RPUiIsImVtYWlsIjoiaW52ZXN0b3JAZXhhbXBsZS5jb20iLCJuYW1lIjoiSW52ZXN0b3IgVXNlciJ9LCJpYXQiOjE3NjE2MzA3MTYsImV4cCI6MTc2MTcxNzExNn0.7btVVWbMqWzgxqpgyRrpbLgAzMKX319aFF3V3Mr2POc';
    await page.context().addCookies([
      {
        name: 'next-auth.session-token',
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    // 2. Navigate to the create portfolio page
    await page.goto('/dashboard/portfolios/create');

    // 3. Fill in the form with valid data
    await page.fill('input[name="name"]', 'My E2E Portfolio');
    await page.check('input[value="HIGH"]');
    await page.fill('input[name="targetReturn"]', '10');

    // 4. Submit the form
    await page.click('button[type="submit"]');

    // 5. Verify that the portfolio was created successfully
    const successMessage = await page.textContent('p');
    expect(successMessage).toContain('Portfolio created successfully.');
  });
});