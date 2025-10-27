# Testing Guide

This project includes comprehensive tests for the 2FA authentication system.

## Test Types

### 1. Unit Tests
Located in `__tests__/lib/`

Fast, isolated tests that mock external dependencies. Run these frequently during development.

```bash
npm run test:unit
```

**Coverage:**
- ✅ Zod schema validation (email, password, 2FA codes)
- ✅ Code generation (6-digit numeric)
- ✅ Expiry logic (5 minutes)
- ✅ Database operations (mocked)
- ✅ Error handling

### 2. Integration Tests
Located in `__tests__/integration/`

Tests that make real API calls to external services (Resend). Run these before deploying.

```bash
npm run test:integration
```

**Requirements:**
- Valid `RESEND_API_KEY` in `.env`
- `TEST_EMAIL` set to an email you control
- Internet connection
- Resend account with API quota

**Coverage:**
- ✅ Real email sending via Resend
- ✅ Email template rendering
- ✅ API error handling
- ✅ Code generation randomness
- ✅ Expiry time calculation

## Setup

### Environment Variables

See `.env.example` in the project root for required variables.

### Running Tests

```bash
# Run all tests (unit + integration)
npm test

# Run only unit tests (fast, no API calls)
npm run test:unit

# Run only integration tests (uses Resend API)
npm run test:integration

# Run tests with UI
npm run test:ui

# Run tests once and exit
npm run test:run
```

## Integration Test Details

### What Gets Tested

1. **Email Delivery**
   - Sends real 2FA code to `TEST_EMAIL`
   - Verifies Resend API returns success
   - Checks email ID is returned

2. **Code Generation**
   - Generates 100 codes to verify randomness
   - Ensures all codes are 6-digit numbers
   - Validates uniqueness (>90%)

3. **Expiry Timing**
   - Verifies expiry is set 5 minutes in future
   - Tests boundary cases (just expired, almost expired)

4. **Error Handling**
   - Tests invalid email format
   - Validates error messages

### Cost Considerations

⚠️ **Important:** Integration tests consume Resend API quota. Each test run sends ~3-4 real emails.

- Free tier: 100 emails/day
- Integration tests use: ~4 emails per run
- Recommendation: Run integration tests only before commits/deploys

### Skipping Integration Tests

If `RESEND_API_KEY` is not set, integration tests are automatically skipped with a warning message.
