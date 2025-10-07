# Google OAuth Testing Guide

## Test Structure

The Google OAuth tests are organized into three levels:

### 1. Unit Tests (`__tests__/components/google-signin-button.test.tsx`)
- **Purpose:** Test the Google sign-in button component in isolation
- **Scope:** Component rendering, click handling, callback URL management
- **Environment:** jsdom (browser-like environment)
- **Run with:** `npm run test:components`

**Tests:**
- ✅ Renders the Google sign-in button
- ✅ Displays the Google logo SVG
- ✅ Calls signIn with google provider when clicked
- ✅ Uses custom callbackUrl from search params
- ✅ Defaults to "/" when callbackUrl not provided
- ✅ Has type="button" to prevent form submission
- ✅ Has outline variant styling
- ✅ Is accessible
- ✅ Calls signIn function when clicked

### 2. Integration Tests (`__tests__/integration/google-oauth.integration.test.ts`)
- **Purpose:** Test database operations during OAuth flow
- **Scope:** Account linking, session management, database constraints
- **Environment:** Node with real database
- **Run with:** `npm run test:integration`

**Tests:**
- ✅ Create new user without password
- ✅ Create Google account record
- ✅ Create session for OAuth user
- ✅ Retrieve user with linked accounts
- ✅ Link Google account to existing credentials user
- ✅ Support both password and Google account
- ✅ Session lifecycle management
- ✅ Database constraints and validations
- ✅ OAuth configuration checks

### 3. E2E Tests (`__tests__/e2e/google-oauth-auth-flow.e2e.test.ts`)
- **Purpose:** Test complete OAuth authentication journey
- **Scope:** Full flow from sign-in to session creation
- **Environment:** Node with real database
- **Run with:** `npm run test:e2e`

**Tests:**
- ✅ Complete OAuth sign-in for new user
- ✅ Account linking for existing users
- ✅ Session lifecycle (create, validate, delete)
- ✅ Mixed authentication (OAuth + credentials)
- ✅ Error handling and edge cases
- ✅ Complete OAuth flow success

---

## Running Tests

### Run All OAuth Tests
```bash
npm run test:oauth
```

### Run Individual Test Suites
```bash
# Unit tests (component only)
npm run test:components

# Integration tests (database operations)
npm run test:integration -- --reporter=verbose

# E2E tests (complete flows)
npm run test:e2e -- --reporter=verbose
```

### Watch Mode
```bash
# Watch all OAuth tests
npx vitest __tests__/components/google-signin-button.test.tsx __tests__/integration/google-oauth.integration.test.ts __tests__/e2e/google-oauth-auth-flow.e2e.test.ts
```

---

## Test Requirements

### Prerequisites
1. **PostgreSQL database running**
   - Make sure your local PostgreSQL instance is up
   - Verify `DATABASE_URL` in `.env` is correct

2. **Prisma Client generated**
   ```bash
   npx prisma generate
   ```

3. **Latest migrations applied**
   ```bash
   npx prisma migrate dev
   ```

### Environment Variables

Required for all tests:
```bash
DATABASE_URL="postgresql://..."
AUTH_SECRET="your-auth-secret"
```

Optional (not required for testing):
```bash
GOOGLE_CLIENT_ID="..." # Not needed for tests
GOOGLE_CLIENT_SECRET="..." # Not needed for tests
```

---

## What Each Test Level Validates

### Unit Tests Validate:
- ✅ Component renders without errors
- ✅ Button click triggers OAuth flow
- ✅ Callback URLs are handled correctly
- ✅ Component is accessible (a11y)
- ✅ Styling classes applied correctly

### Integration Tests Validate:
- ✅ User creation with null password for OAuth
- ✅ Account table records Google provider data
- ✅ Session table stores authentication sessions
- ✅ Email uniqueness constraint enforced
- ✅ Account provider constraint prevents duplicates
- ✅ Cascade deletes work (user → accounts → sessions)
- ✅ Database schema supports OAuth (nullable password)

### E2E Tests Validate:
- ✅ **New User Flow:**
  1. User data created from OAuth
  2. Google account linked
  3. Session created
  4. User has no password

- ✅ **Existing User Flow:**
  1. Existing user found by email
  2. Google account linked to existing user
  3. User can sign in with either method

- ✅ **Session Management:**
  1. Sessions created with correct expiry
  2. Sessions can be retrieved by token
  3. Sessions can be deleted on sign-out
  4. Expired sessions detected

- ✅ **Mixed Authentication:**
  1. User can have both OAuth and credentials
  2. 2FA settings maintained for credentials
  3. Password can be added after OAuth sign-up

---

## Test Data

### Test Users Created:
- `oauth-new@example.com` - New OAuth user (no password)
- `oauth-test@example.com` - Existing credentials user
- `oauth-existing@gmail.com` - Account linking test
- `oauth-mixed@gmail.com` - Mixed auth test
- `oauth-e2e-test@gmail.com` - E2E flow test

All test data is cleaned up automatically after tests complete.

---

## Troubleshooting

### Tests Fail with Database Errors

**Error:** "Can't reach database server"
- **Fix:** Ensure PostgreSQL is running
- **Check:** `psql $DATABASE_URL` connects successfully

**Error:** "Unknown field password"
- **Fix:** Run migrations: `npx prisma migrate dev`
- **Verify:** Password field is nullable in schema

### Tests Fail with Prisma Errors

**Error:** "PrismaClient is not configured"
- **Fix:** Regenerate client: `npx prisma generate`
- **Restart:** Development server and tests

**Error:** "Table 'Account' doesn't exist"
- **Fix:** Run migrations: `npx prisma migrate dev`
- **Check:** Account and Session tables exist

### Component Tests Fail

**Error:** "signIn is not a function"
- **Fix:** Mocks are set up correctly in test file
- **Check:** `next-auth/react` is properly mocked

**Error:** "useSearchParams is not a function"
- **Fix:** `next/navigation` is mocked in test
- **Check:** Mock implementation returns `get` function

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: OAuth Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        run: |
          npx prisma migrate deploy
          npx prisma generate

      - name: Run OAuth tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          AUTH_SECRET: test-secret-key
        run: npm run test:oauth
```

---

## Test Coverage

### Current Coverage:

#### Component Level
- ✅ Button rendering and interactions
- ✅ OAuth provider configuration
- ✅ Callback URL handling

#### Database Level
- ✅ User creation (OAuth vs credentials)
- ✅ Account linking (new vs existing)
- ✅ Session management (create, read, delete)
- ✅ Constraints and validations

#### Flow Level
- ✅ New user OAuth sign-up
- ✅ Existing user account linking
- ✅ Mixed authentication methods
- ✅ Error handling
- ✅ Data cleanup

---

## Next Steps

### Additional Tests to Consider:

1. **Security Tests:**
   - [ ] Test token expiration handling
   - [ ] Test session hijacking prevention
   - [ ] Test CSRF protection

2. **Error Scenario Tests:**
   - [ ] Google API unavailable
   - [ ] Invalid OAuth response
   - [ ] Network timeout handling

3. **Performance Tests:**
   - [ ] OAuth callback response time
   - [ ] Database query performance
   - [ ] Session lookup speed

4. **Integration with Real Google OAuth:**
   - [ ] Playwright/Cypress E2E with real OAuth
   - [ ] Test with actual Google accounts
   - [ ] Test callback handling in browser

---

## Best Practices

1. **Always clean up test data**
   - Use afterAll hooks
   - Delete in reverse order (sessions → accounts → users)

2. **Use unique test emails**
   - Prevents conflicts between test runs
   - Use timestamps or random IDs

3. **Mock external dependencies**
   - Don't make real calls to Google in unit tests
   - Use test database, not production

4. **Test isolation**
   - Each test should be independent
   - Don't rely on test execution order

5. **Descriptive test names**
   - Use "should" statements
   - Describe the expected behavior

---

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [NextAuth Testing](https://next-auth.js.org/getting-started/example)

