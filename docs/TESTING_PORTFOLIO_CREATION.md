# Testing Portfolio Creation

This document explains how to run the end-to-end (E2E) test for the portfolio creation feature.

## Prerequisites

1.  **Running Application**: The Next.js application must be running in a separate terminal. You can start it with `npm run dev`.
2.  **`.env` File**: A `.env` file must be present in the root of the project with the following variables, using the credentials of a user from `db/sample-data.ts`:
    ```
    TEST_EMAIL=<email_of_test_user>
    TEST_PASSWORD=<password_of_test_user>
    ```
3.  **Test User**: A test user must exist in the database. The credentials for the test user should be taken from the users seeded in the database via `db/sample-data.ts`.

## Running the Test

The E2E test for portfolio creation can be run with the following command:

```bash
npm run test:e2e:portfolio-creation
```

This command runs the Playwright E2E test located at `__tests__/e2e/portfolio-creation.e2e.test.ts`.

The test credentials are not hardcoded in the test script. Instead, they are loaded from a `.env` file.

## How it Works

The E2E test uses a `globalSetup` script (`playwright.setup.ts`) to perform a login before running the actual test. This `globalSetup` script:

1.  Navigates to the sign-in page.
2.  Fills in the email and password fields with the `TEST_EMAIL` and `TEST_PASSWORD` environment variables from the `.env` file.
3.  Submits the sign-in form.
4.  Waits for the user to be redirected to the dashboard.
5.  Saves the authenticated state (cookies, etc.) to a file (`playwright-auth.json`).

The main test file (`__tests__/e2e/portfolio-creation.e2e.test.ts`) then loads this authenticated state and runs the test in a logged-in state.

### 2FA Bypass

For the test user, the two-factor authentication (2FA) is bypassed. The `signInWithCredentials` action in `lib/actions/users.actions.ts` checks if the email matches the `TEST_EMAIL` environment variable. If it does, it signs in the user directly without sending a 2FA code.