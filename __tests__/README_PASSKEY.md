# Passkey Authentication Testing Guide

This document describes the comprehensive test suite for passkey (WebAuthn) authentication as a second factor in the multi-factor authentication flow.

## Test Coverage

### 1. Unit Tests
**Location:** `__tests__/lib/passkey-actions.test.ts`

Fast, isolated tests that mock external dependencies.

**Run with:**
```bash
npm run test:unit
```

**Coverage:**
- ✅ Passkey registration option generation
- ✅ Registration verification and storage
- ✅ Authentication option generation (with/without email)
- ✅ Authentication verification
- ✅ Challenge validation (matching, expiry)
- ✅ Discoverable credential support
- ✅ Counter update mechanism
- ✅ Database cleanup operations
- ✅ Authentication state checks
- ✅ Error handling

### 2. Integration Tests
**Location:** `__tests__/integration/passkey-flow.integration.test.ts`

Tests that verify database operations and data consistency.

**Run with:**
```bash
npm run test:integration
```

**Requirements:**
- Valid `DATABASE_URL` in `.env`
- PostgreSQL database running

**Coverage:**
- ✅ Challenge storage and retrieval
- ✅ Authenticator CRUD operations
- ✅ Multi-authenticator management
- ✅ Challenge expiry timing (5 minutes)
- ✅ Referential integrity
- ✅ Concurrent challenge updates
- ✅ User permission checks
- ✅ Authenticator exclusion in registration

### 3. End-to-End Tests
**Location:** `__tests__/e2e/passkey-auth-flow.e2e.test.ts`

Complete user journey tests from signup to dashboard access.

**Run with:**
```bash
npm run test:e2e
```

**Requirements:**
- Valid `DATABASE_URL` in `.env`
- PostgreSQL database running

**Coverage:**
- ✅ **Complete authentication flow:**
  1. New user signup
  2. Passkey setup (first time)
  3. Sign in with email/password (first factor)
  4. 2FA code verification
  5. Redirect to passkey verification
  6. Passkey verification (second factor)
  7. Dashboard access granted
- ✅ Invalid challenge rejection
- ✅ Expired challenge rejection
- ✅ New user redirect to passkey setup
- ✅ Existing user redirect to passkey verification

## Authentication Flow

### New User Journey
```
1. User signs up with email/password
   → User account created

2. User completes 2FA code verification
   → User has NO passkey
   → Redirected to /setup-passkey

3. User sets up passkey
   → Registration options generated
   → WebAuthn credential created
   → Authenticator stored in database
   → User can now access dashboard

4. User signs out and signs in again
   → Email/password verification (first factor)
   → 2FA code sent and verified
   → User has passkey
   → Redirected to /verify-passkey

5. User verifies passkey
   → Authentication options generated
   → WebAuthn authentication performed
   → twoFactorVerifiedAt timestamp updated
   → Redirected to dashboard
   → Dashboard access granted ✅
```

### Returning User Journey
```
1. User signs in with email/password
   → 2FA code sent

2. User verifies 2FA code
   → User has passkey
   → Redirected to /verify-passkey

3. User verifies passkey (second factor)
   → Passkey authentication successful
   → twoFactorVerifiedAt updated
   → Dashboard access granted ✅
```

## Key Test Scenarios

### Scenario 1: First-Time User Setup
**Tested in:** E2E tests

Verifies that a new user can:
1. Sign up successfully
2. Set up a passkey immediately after 2FA verification
3. Sign in with passkey on subsequent logins

### Scenario 2: Passkey as Second Factor
**Tested in:** E2E and Integration tests

Verifies that:
1. Email/password is the first factor
2. 2FA code is verified
3. Passkey verification is required before dashboard access
4. Dashboard redirects back to verification if not completed

### Scenario 3: Challenge Security
**Tested in:** Unit and E2E tests

Verifies that:
1. Challenges expire after 5 minutes
2. Invalid challenges are rejected
3. Challenges must match between generation and verification
4. Stale challenges don't grant access

### Scenario 4: Multi-Device Support
**Tested in:** Integration tests

Verifies that:
1. Users can register multiple authenticators
2. Each authenticator has unique credentials
3. Any registered authenticator can be used for verification
4. Authenticators can be listed and deleted

## Running the Tests

### Run All Passkey Tests
```bash
# Run all passkey-related tests
npm test -- passkey

# Or run each category separately
npm run test:unit -- passkey-actions
npm run test:integration -- passkey-flow
npm run test:e2e -- passkey-auth-flow
```

### Run Specific Test Suites
```bash
# Unit tests only
vitest run __tests__/lib/passkey-actions.test.ts

# Integration tests only
vitest run __tests__/integration/passkey-flow.integration.test.ts

# E2E tests only
vitest run __tests__/e2e/passkey-auth-flow.e2e.test.ts
```

### Watch Mode (Development)
```bash
# Watch all passkey tests
vitest --watch -- passkey

# Watch specific file
vitest --watch __tests__/e2e/passkey-auth-flow.e2e.test.ts
```

## Test Data Cleanup

All tests automatically clean up their test data:
- Users created during tests are deleted in `afterAll` hooks
- Authenticators are deleted before their associated users
- Test emails use prefixes like `passkey-test@` to avoid conflicts

## Environment Variables

Required for all tests:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

Optional (for WebAuthn configuration):
```env
NEXT_PUBLIC_RP_NAME="Portfolio Optimization System"
NEXT_PUBLIC_RP_ID="localhost"
NEXT_PUBLIC_WEBAUTHN_ORIGIN="http://localhost:3000"
```

## Troubleshooting

### Tests Fail with "User not found"
**Solution:** Ensure your database is running and migrations are applied:
```bash
npx prisma migrate dev
```

### Tests Timeout
**Solution:** Increase timeout for E2E tests (already set to 60 seconds):
```typescript
it('test name', async () => {
  // test code
}, 60000) // 60 second timeout
```

### Challenge Expiry Tests Fail
**Solution:** System clock might be out of sync. Verify your system time is correct.

### Database Connection Issues
**Solution:** Check your `DATABASE_URL` and ensure PostgreSQL is running:
```bash
pg_isready
```

## Test Architecture

### Mocking Strategy

**Unit Tests:**
- Mock all external dependencies (Prisma, NextAuth, WebAuthn libraries)
- Test business logic in isolation
- Fast execution (< 1 second total)

**Integration Tests:**
- Use real database connections
- Mock only external services (NextAuth, redirects)
- Test data persistence and retrieval
- Medium execution time (5-10 seconds total)

**E2E Tests:**
- Use real database with actual operations
- Simulate complete user flows
- Test redirects and state transitions
- Longer execution time (15-30 seconds total)

## Coverage Goals

- **Line Coverage:** > 90%
- **Branch Coverage:** > 85%
- **Function Coverage:** > 95%

Run coverage report:
```bash
npm run test:coverage -- passkey
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Passkey Tests
  run: |
    npm run test:unit -- passkey
    npm run test:integration -- passkey
    npm run test:e2e -- passkey
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Future Enhancements

- [ ] Add browser-based E2E tests with Playwright
- [ ] Test passkey registration on different device types
- [ ] Test cross-origin authentication scenarios
- [ ] Add performance benchmarks
- [ ] Test WebAuthn Level 3 features (conditional mediation)

## References

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [FIDO Alliance Guidelines](https://fidoalliance.org/specifications/)
