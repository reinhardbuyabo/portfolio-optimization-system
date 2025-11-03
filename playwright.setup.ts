import { chromium, expect } from '@playwright/test';

const authFile = 'playwright-auth.json';

async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/sign-in');

  // Fill in the sign-in form
  const testEmail = process.env.TEST_EMAIL;
  const testPassword = process.env.TEST_PASSWORD;

  console.log("TEST_EMAIL:", testEmail);
  console.log("TEST_PASSWORD:", testPassword);

  if (!testEmail || !testPassword) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in the environment for Playwright setup.');
  }

  await page.waitForSelector('input[name="email"]');
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);

  // Wait for the network to be idle before clicking the button
  await page.waitForLoadState('networkidle');

  // Click the sign-in button
  await page.click('button[type="submit"]');

  // Wait for the user to be redirected to the dashboard
  await page.waitForURL('http://localhost:3000/dashboard', { timeout: 60000 });

  // Verify that the user is on the dashboard page
  await expect(page).toHaveURL('http://localhost:3000/dashboard');

  // Save the authentication state
  await page.context().storageState({ path: authFile });
  await browser.close();
}

export default globalSetup;
